/**
 * End-to-end průchod celou aplikací.
 *
 * Předpoklady:
 *   - běží `npm run dev` (nebo `npm start`) na BASE_URL
 *   - v .env.local je MAIL_DRIVER=console
 *   - ADMIN_PASSWORD a ACADEMIC_EMAIL_DOMAINS odpovídají hodnotám níž
 *
 * Trik, na kterém to stojí: console mail driver ukládá každý odeslaný mail
 * do .dev-mail/last.json včetně odkazu. Test si z něj přečte magic link,
 * takže se dá ověřit i přihlášení, které jinak potřebuje poštovní schránku.
 *
 * POZOR: test zakládá recenzenty, videa i námitky a zabere část hodinového
 * rate limitu. Pouštěj ho jen na vývojové databázi.
 *
 * Spuštění:  npm run smoke
 */

import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

/**
 * Playwright se načítá přes createRequire, ne přes import.
 *
 * Důvod: CommonJS resolution respektuje NODE_PATH, takže se najde
 * i Playwright nainstalovaný globálně.
 */
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "Chybí Playwright. Doinstaluj ho:\n" +
      "  npm install -D playwright\n" +
      "  npx playwright install chromium",
  );
  process.exit(1);
}

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MAILBOX = path.join(process.cwd(), ".dev-mail", "last.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "tajneheslo123";

/** Unikátní, ať se dá test pustit víckrát za sebou. */
const RAZITKO = Date.now().toString(36);
const RECENZENT = `smoke-${RAZITKO}@mff.cuni.cz`;
const VIDEO_ID = nahodneIdVidea();
const VIDEO2_ID = nahodneIdVidea();

let proslo = 0;
let padlo = 0;

function kontrola(nazev, podminka, detail = "") {
  if (podminka) {
    proslo++;
    console.log(`  ✓ ${nazev}`);
  } else {
    padlo++;
    console.log(`  ✗ ${nazev}${detail ? ` — ${detail}` : ""}`);
  }
}

function sekce(nazev) {
  console.log(`\n${nazev}`);
}

/** ID videa má 11 znaků — vyrábíme si vlastní, ať nekolidují mezi běhy. */
function nahodneIdVidea() {
  const abeceda = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let id = "";
  for (let i = 0; i < 11; i++) {
    id += abeceda[Math.floor(Math.random() * abeceda.length)];
  }
  return id;
}

/**
 * Odešle formulář kliknutím na konkrétní tlačítko a počká na výsledek.
 *
 * Schválně podle názvu tlačítka, ne `button[type=submit]`: v administraci
 * i v části pro recenzenty je v hlavičce formulář s tlačítkem Odhlásit,
 * takže obecný selektor trefí jeho a test se nenápadně odhlásí.
 */
async function odesli(stranka, nazevTlacitka, ocekavej = "cokoli") {
  await stranka.getByRole("button", { name: nazevTlacitka }).first().click();

  // Po neúspěšném pokusu zůstane chybová hláška na stránce, takže čekání
  // na „jakýkoli výsledek“ by se vrátilo okamžitě s tou starou. Když se
  // čeká úspěch, musí se čekat přímo na něj.
  if (ocekavej === "uspech") {
    await stranka
      .locator('[data-testid="form-success"]')
      .first()
      .waitFor({ timeout: 15_000 });
    return;
  }
  await pockejNaVysledek(stranka);
}

/** Počká, než Server Action vrátí výsledek — potvrzení nebo chybu. */
async function pockejNaVysledek(stranka) {
  await stranka
    .locator('[data-testid="form-success"], [data-testid="form-error"], [data-testid="field-error"]')
    .first()
    .waitFor({ timeout: 15_000 });
}

async function poslednyMail() {
  try {
    return JSON.parse(await readFile(MAILBOX, "utf8"));
  } catch {
    return null;
  }
}

async function api(cesta) {
  const odpoved = await fetch(`${BASE}${cesta}`);
  return { stav: odpoved.status, data: await odpoved.json() };
}

async function main() {
  const prohlizec = await chromium.launch();

  // Tři nezávislé kontexty: veřejnost, recenzent, správce. Oddělené cookie
  // jsou tu podstatné — jedna z kontrol je, že se k sobě nedostanou.
  const verejnost = await prohlizec.newContext();
  const recenzent = await prohlizec.newContext();
  const spravce = await prohlizec.newContext();

  try {
    // ════════════════════════════════════════════════════════════════════
    sekce("1) Veřejné stránky se otevřou");

    const host = await verejnost.newPage();
    for (const cesta of ["/", "/katalog", "/recenzenti", "/pro-odborniky", "/jak-to-funguje", "/soukromi"]) {
      const odpoved = await host.goto(`${BASE}${cesta}`);
      kontrola(`${cesta} vrátí 200`, odpoved?.status() === 200, String(odpoved?.status()));
    }

    // ════════════════════════════════════════════════════════════════════
    sekce("2) Administrace je za heslem");

    const admin = await spravce.newPage();
    await admin.goto(`${BASE}/admin`);
    kontrola(
      "nepřihlášeného to pošle na přihlášení",
      admin.url().includes("/admin/prihlaseni"),
      admin.url(),
    );

    await admin.fill("#password", "spatne-heslo");
    await odesli(admin, "Přihlásit");
    kontrola(
      "špatné heslo neprojde",
      admin.url().includes("/admin/prihlaseni"),
      admin.url(),
    );

    await admin.fill("#password", ADMIN_PASSWORD);
    await admin.getByRole("button", { name: "Přihlásit" }).click();
    await admin.waitForURL(/\/admin$/, { timeout: 15_000 });
    kontrola("správné heslo pustí dál", admin.url().endsWith("/admin"));

    // ════════════════════════════════════════════════════════════════════
    sekce("3) Správce přidá video do fronty");

    await admin.goto(`${BASE}/admin/videa`);
    await admin.fill("#odkaz", `https://www.youtube.com/watch?v=${VIDEO_ID}`);
    await admin.selectOption("#obor", "fyzika");
    await admin.selectOption("#uroven", "ss");
    await odesli(admin, "Přidat do fronty k recenzi");

    const hlaska = await admin.locator('[data-testid="form-success"], [data-testid="form-error"]').first().innerText();
    // Bez přístupu k youtube.com se název nestáhne — video se přesto musí
    // založit, jen s náhradním názvem. Selhání YouTube nesmí blokovat práci.
    kontrola("video se přidalo", hlaska.includes("Přidáno"), hlaska);

    const indexPoPridani = await api("/api/index");
    kontrola(
      "nerecenzované video NENÍ v indexu",
      !(VIDEO_ID in indexPoPridani.data.videa),
    );

    // ════════════════════════════════════════════════════════════════════
    sekce("4) Odborník se registruje");

    const odbornik = await recenzent.newPage();
    await odbornik.goto(`${BASE}/pro-odborniky`);

    // Neakademická adresa se musí odmítnout.
    await odbornik.fill("#email", "kdokoli@seznam.cz");
    await odesli(odbornik, "Poslat přihlašovací odkaz");
    kontrola(
      "adresa mimo akademické domény neprojde",
      (await odbornik.locator('[data-testid="form-error"]').count()) > 0,
    );

    // Doména, která jen „končí na“ povolenou — nesmí projít.
    await odbornik.goto(`${BASE}/pro-odborniky`);
    await odbornik.fill("#email", "utocnik@evil-cuni.cz");
    await odesli(odbornik, "Poslat přihlašovací odkaz");
    kontrola(
      "evil-cuni.cz neprojde (kontrola je na tečce, ne na „končí na“)",
      (await odbornik.locator('[data-testid="form-error"]').count()) > 0,
    );

    await rm(MAILBOX, { force: true });
    await odbornik.goto(`${BASE}/pro-odborniky`);
    await odbornik.fill("#email", RECENZENT);
    await odesli(odbornik, "Poslat přihlašovací odkaz", "uspech");
    kontrola(
      "fakultní subdoména (mff.cuni.cz) projde",
      (await odbornik.locator('[data-testid="form-success"]').count()) > 0,
      await odbornik.locator('[data-testid="form-error"]').first().innerText().catch(() => ""),
    );

    const mail = await poslednyMail();
    kontrola("odešel přihlašovací e-mail s odkazem", Boolean(mail?.link), JSON.stringify(mail)?.slice(0, 120));
    if (!mail?.link) throw new Error("Bez přihlašovacího odkazu nemá smysl pokračovat.");

    await odbornik.goto(mail.link);
    await odbornik.waitForURL(/\/odbornik/, { timeout: 15_000 });
    kontrola("odkaz přihlásí a pošle na vyplnění profilu", odbornik.url().includes("/odbornik/profil"));

    // Jednorázovost tokenu: druhé kliknutí už nesmí projít.
    const druhyPokus = await verejnost.newPage();
    await druhyPokus.goto(mail.link);
    kontrola(
      "druhé kliknutí na tentýž odkaz neprojde",
      druhyPokus.url().includes("/prihlaseni/neplatny-odkaz"),
      druhyPokus.url(),
    );
    await druhyPokus.close();

    // ════════════════════════════════════════════════════════════════════
    sekce("5) Vyplnění profilu");

    await odbornik.goto(`${BASE}/odbornik/profil`);
    await odbornik.fill("#jmeno", `Jan Smoke ${RAZITKO}`);
    await odbornik.fill("#titul", "doc. RNDr.");
    await odbornik.fill("#instituce", "MFF UK, Ústav teoretické fyziky");
    await odbornik.fill("#profilUrl", "https://www.mff.cuni.cz/kdo-je-kdo");

    // Nejdřív ORCID s překlepem — musí ho chytit kontrolní číslice.
    await odbornik.fill("#orcid", "0000-0002-1825-0098");
    await odbornik.check('input[name="obory"][value="fyzika"]');
    await odbornik.check('input[name="souhlas"]');
    await odesli(odbornik, "Podat žádost");
    kontrola(
      "ORCID s překlepem neprojde (kontrolní číslice)",
      (await odbornik.locator('[data-testid="field-error"]').count()) > 0,
    );

    await odbornik.fill("#orcid", "0000-0002-1825-0097");
    await odesli(odbornik, "Podat žádost", "uspech");
    kontrola(
      "správné ORCID projde a žádost je podaná",
      (await odbornik.locator('[data-testid="form-success"]').count()) > 0,
    );

    // ════════════════════════════════════════════════════════════════════
    sekce("6) Neschválený recenzent recenzi neuloží");

    await odbornik.goto(`${BASE}/odbornik/recenze/${VIDEO_ID}`);
    const maFormular = (await odbornik.locator('textarea[name="zduvodneni"]').count()) > 0;
    kontrola("formulář posudku se neschválenému nenabídne", !maFormular);

    // A kdyby ho obešel a poslal akci přímo? Stav se čte z databáze,
    // ne z cookie, takže to musí skončit chybou.
    await odbornik.goto(`${BASE}/odbornik`);
    kontrola(
      "ve frontě vidí, že žádost čeká",
      (await odbornik.locator("body").innerText()).includes("čeká"),
    );

    // ════════════════════════════════════════════════════════════════════
    sekce("7) Správce žádost schválí");

    await admin.goto(`${BASE}/admin/recenzenti`);
    const kartaZadosti = admin
      .locator("li")
      .filter({ hasText: `Jan Smoke ${RAZITKO}` })
      .first();
    kontrola("žádost je ve frontě správce", (await kartaZadosti.count()) > 0);
    kontrola(
      "správce vidí e-mail žadatele (neveřejný údaj)",
      (await kartaZadosti.innerText()).includes(RECENZENT),
    );

    await kartaZadosti.getByRole("button", { name: "Schválit" }).click();
    await pockejNaVysledek(admin);
    kontrola(
      "schválení prošlo",
      (await admin.locator('[data-testid="form-success"]').count()) > 0,
    );

    const schvalovaciMail = await poslednyMail();
    kontrola(
      "recenzentovi odešlo vyrozumění",
      schvalovaciMail?.to === RECENZENT && schvalovaciMail.subject.includes("schválen"),
      JSON.stringify(schvalovaciMail?.subject),
    );

    // ════════════════════════════════════════════════════════════════════
    sekce("8) Posudek udělí značku");

    await odbornik.goto(`${BASE}/odbornik/recenze/${VIDEO_ID}`);
    await odbornik.check('input[name="verdikt"][value="odpovida"]');
    await odbornik.fill(
      'textarea[name="zduvodneni"]',
      "Obsah odpovídá standardnímu výkladu, faktickou chybu jsem nenašel. Zjednodušení v závěru nevadí.",
    );
    await odbornik.fill('textarea[name="zdroje"]', "Feynman, Lectures on Physics I, kap. 7");
    await odesli(odbornik, "Podepsat a odeslat posudek", "uspech");
    kontrola(
      "posudek se uložil a video má značku",
      (await odbornik.locator('[data-testid="form-success"]').first().innerText()).includes("značku"),
      await odbornik.locator('[data-testid="form-success"], [data-testid="form-error"]').first().innerText(),
    );

    const indexPoRecenzi = await api("/api/index");
    kontrola("video je v indexu", VIDEO_ID in indexPoRecenzi.data.videa);
    kontrola(
      "v indexu je obor videa",
      indexPoRecenzi.data.obory[indexPoRecenzi.data.videa[VIDEO_ID]?.[0]] === "fyzika",
      JSON.stringify(indexPoRecenzi.data.videa[VIDEO_ID]),
    );

    // ════════════════════════════════════════════════════════════════════
    sekce("9) Značka je veřejně dohledatelná");

    await host.goto(`${BASE}/video/${VIDEO_ID}`);
    const detail = await host.locator("body").innerText();
    kontrola("na detailu je jméno recenzenta", detail.includes(`Jan Smoke ${RAZITKO}`));
    kontrola("na detailu je instituce", detail.includes("MFF UK"));
    kontrola("na detailu je zdůvodnění", detail.includes("faktickou chybu jsem nenašel"));
    kontrola("na detailu jsou zdroje", detail.includes("Feynman"));
    kontrola(
      "e-mail recenzenta se NEZVEŘEJŇUJE",
      !detail.includes(RECENZENT),
    );

    await host.goto(`${BASE}/katalog`);
    kontrola(
      "video je v katalogu",
      (await host.locator("body").innerText()).includes("ověřeno"),
    );

    // ════════════════════════════════════════════════════════════════════
    sekce("10) Negativní verdikt se nikde nezveřejní");

    await admin.goto(`${BASE}/admin/videa`);
    await admin.fill("#odkaz", VIDEO2_ID);
    await admin.selectOption("#obor", "fyzika");
    await admin.selectOption("#uroven", "vse");
    await odesli(admin, "Přidat do fronty k recenzi");

    await odbornik.goto(`${BASE}/odbornik/recenze/${VIDEO2_ID}`);
    await odbornik.check('input[name="verdikt"][value="neodpovida"]');
    await odbornik.fill(
      'textarea[name="zduvodneni"]',
      "Video odporuje konsenzu prakticky v celém rozsahu, nelze doporučit.",
    );
    await odesli(odbornik, "Podepsat a odeslat posudek");

    const indexPoZapornem = await api("/api/index");
    kontrola("odmítnuté video NENÍ v indexu", !(VIDEO2_ID in indexPoZapornem.data.videa));

    await host.goto(`${BASE}/video/${VIDEO2_ID}`);
    const detail2 = await host.locator("body").innerText();
    kontrola(
      "na veřejném detailu NENÍ zdůvodnění záporného posudku",
      !detail2.includes("odporuje konsenzu"),
    );
    kontrola(
      "na veřejném detailu NENÍ jméno recenzenta u záporného posudku",
      !detail2.includes(`Jan Smoke ${RAZITKO}`),
    );

    await host.goto(`${BASE}/katalog`);
    kontrola(
      "odmítnuté video není v katalogu",
      !(await host.locator("body").innerText()).includes(VIDEO2_ID),
    );

    const profilUrl = `${BASE}/recenzent/${await zjistiSlug(admin, RAZITKO)}`;
    await host.goto(profilUrl);
    const profil = await host.locator("body").innerText();
    kontrola("na profilu recenzenta je kladný posudek", profil.includes("faktickou chybu"));
    kontrola(
      "na profilu recenzenta NENÍ záporný posudek",
      !profil.includes("odporuje konsenzu"),
    );

    // ════════════════════════════════════════════════════════════════════
    sekce("11) Námitka značku pozastaví");

    await host.goto(`${BASE}/namitka?video=${VIDEO_ID}`);
    await host.fill("#text", "Jsem autor videa a s posouzením v čase 4:10 zásadně nesouhlasím.");
    await host.fill("#kontakt", `autor-${RAZITKO}@priklad.cz`);
    await host.check('input[name="jeAutor"]');
    await odesli(host, "Podat námitku", "uspech");
    kontrola(
      "námitka se podala",
      (await host.locator('[data-testid="form-success"]').count()) > 0,
      await host.locator('[data-testid="form-error"]').first().innerText().catch(() => ""),
    );

    const indexPoNamitce = await api("/api/index");
    kontrola("video zmizelo z indexu", !(VIDEO_ID in indexPoNamitce.data.videa));

    const diff = await api(`/api/index?od=${indexPoRecenzi.data.verze}`);
    kontrola(
      "přírůstkový index nese záznam s null (pokyn ke smazání)",
      diff.data.videa[VIDEO_ID] === null,
      JSON.stringify(diff.data.videa[VIDEO_ID]),
    );

    // ════════════════════════════════════════════════════════════════════
    sekce("12) Zamítnutá námitka značku vrátí");

    await admin.goto(`${BASE}/admin/namitky`);
    const kartaNamitky = admin.locator("li").filter({ hasText: "4:10" }).first();
    kontrola("námitka je ve frontě", (await kartaNamitky.count()) > 0);
    kontrola(
      "u námitky je vidět, že se hlásí autor",
      (await kartaNamitky.innerText()).includes("autor"),
    );

    await kartaNamitky
      .locator("textarea")
      .fill("Posudek se týká faktické správnosti, ne výkladu. Značka zůstává.");
    await kartaNamitky.getByRole("button", { name: /Zamítnout/ }).click();
    await pockejNaVysledek(admin);

    const indexPoVyrizeni = await api("/api/index");
    kontrola("značka je zpátky v indexu", VIDEO_ID in indexPoVyrizeni.data.videa);

    const odpovedNamitka = await poslednyMail();
    kontrola(
      "namítajícímu odešla odpověď",
      odpovedNamitka?.to === `autor-${RAZITKO}@priklad.cz`,
      JSON.stringify(odpovedNamitka?.to),
    );

    // ════════════════════════════════════════════════════════════════════
    sekce("13) Pozastavený recenzent přijde o značky");

    await admin.goto(`${BASE}/admin/recenzenti`);
    const kartaSchvaleneho = admin
      .locator("li")
      .filter({ hasText: `Jan Smoke ${RAZITKO}` })
      .first();
    await kartaSchvaleneho.locator('input[name="duvod"]').fill("Smoke test — ověřuju odebrání značek.");
    await kartaSchvaleneho.getByRole("button", { name: "Pozastavit" }).click();
    await pockejNaVysledek(admin);

    const indexPoPozastaveni = await api("/api/index");
    kontrola(
      "značky pozastaveného recenzenta zmizely z indexu",
      !(VIDEO_ID in indexPoPozastaveni.data.videa),
    );

    await admin.goto(`${BASE}/admin/recenzenti`);
    await admin
      .locator("li")
      .filter({ hasText: `Jan Smoke ${RAZITKO}` })
      .first()
      .getByRole("button", { name: "Obnovit" })
      .click();
    await pockejNaVysledek(admin);
    const indexPoObnoveni = await api("/api/index");
    kontrola("po obnovení se značky vrátily", VIDEO_ID in indexPoObnoveni.data.videa);

    // ════════════════════════════════════════════════════════════════════
    sekce("14) Index se chová podle kontraktu");

    const plny = await api("/api/index");
    kontrola("index má známý formát", plny.data.format === 1);
    kontrola("index je označený jako plný", plny.data.plny === true);
    kontrola("index nese pořadí oborů", Array.isArray(plny.data.obory) && plny.data.obory[0] === "fyzika");

    const prirustek = await api(`/api/index?od=${plny.data.verze}`);
    kontrola("přírůstek od aktuální verze je prázdný", Object.keys(prirustek.data.videa).length === 0);
    kontrola("přírůstek je označený jako neúplný", prirustek.data.plny === false);

    const nesmysl = await api("/api/index?od=abc");
    kontrola("nesmyslné ?od vrátí plný index místo chyby", nesmysl.data.plny === true);

    const budoucnost = await api("/api/index?od=999999999");
    kontrola(
      "verze z budoucnosti vrátí plný index (klient se srovná)",
      budoucnost.data.plny === true,
    );

    const hlavicky = await fetch(`${BASE}/api/index`);
    kontrola("index má ETag", Boolean(hlavicky.headers.get("etag")));
    kontrola(
      "index je dostupný i cizímu původu (CORS)",
      hlavicky.headers.get("access-control-allow-origin") === "*",
    );

    const sEtagem = await fetch(`${BASE}/api/index`, {
      headers: { "If-None-Match": hlavicky.headers.get("etag") },
    });
    kontrola("beze změny vrátí 304", sEtagem.status === 304, String(sEtagem.status));

    // ════════════════════════════════════════════════════════════════════
    sekce("15) Akce si hlídají přihlášení samy");

    // Guard v layoutu chrání jen zobrazení stránek. Tohle je POST mimo UI.
    const bezPrihlaseni = await verejnost.newPage();
    const odpovedBezPrihlaseni = await bezPrihlaseni.goto(`${BASE}/admin/videa`);
    kontrola(
      "nepřihlášený se nedostane na správu videí",
      odpovedBezPrihlaseni.url().includes("/admin/prihlaseni"),
      odpovedBezPrihlaseni.url(),
    );

    const odbornikNaAdmin = await odbornik.goto(`${BASE}/admin/videa`);
    kontrola(
      "recenzent není správce",
      odbornikNaAdmin.url().includes("/admin/prihlaseni"),
      odbornikNaAdmin.url(),
    );
    await bezPrihlaseni.close();

    // ════════════════════════════════════════════════════════════════════
    sekce("16) Rate limit drží");

    const limitPage = await verejnost.newPage();
    let zablokovano = false;
    for (let i = 0; i < 7; i++) {
      await limitPage.goto(`${BASE}/pro-odborniky`);
      await limitPage.fill("#email", `limit-${RAZITKO}@cuni.cz`);
      await odesli(limitPage, "Poslat přihlašovací odkaz");
      const chyba = await limitPage
        .locator('[data-testid="form-error"]')
        .first()
        .innerText()
        .catch(() => "");
      if (chyba.includes("hodinu") || chyba.includes("příliš mnoho")) {
        zablokovano = true;
        break;
      }
    }
    kontrola("po několika odkazech na tutéž adresu se další zastaví", zablokovano);
    await limitPage.close();
  } finally {
    await prohlizec.close();
  }

  console.log(`\n${"═".repeat(56)}`);
  console.log(`prošlo: ${proslo}    padlo: ${padlo}`);
  process.exit(padlo === 0 ? 0 : 1);
}

/** Vytáhne slug veřejného profilu ze stránky správce. */
async function zjistiSlug(adminPage, razitko) {
  await adminPage.goto(`${BASE}/admin/recenzenti`);
  const odkaz = adminPage
    .locator("li")
    .filter({ hasText: `Jan Smoke ${razitko}` })
    .first()
    .locator('a[href^="/recenzent/"]')
    .first();

  const href = await odkaz.getAttribute("href").catch(() => null);
  return href ? href.replace("/recenzent/", "") : "neznamy";
}

main().catch((error) => {
  console.error("\nTest spadl:", error);
  process.exit(1);
});
