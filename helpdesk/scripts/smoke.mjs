/**
 * End-to-end průchod celou aplikací.
 *
 * Předpoklady:
 *   - běží `npm run dev` (nebo `npm start`) na BASE_URL
 *   - v .env.local je MAIL_DRIVER=console
 *
 * Trik, na kterém to stojí: console mail driver ukládá každý odeslaný mail
 * do .dev-mail/last.json včetně odkazu. Test si z něj přečte magic link,
 * takže se dá ověřit i přihlášení, které jinak potřebuje poštovní schránku.
 *
 * Spuštění:  node scripts/smoke.mjs
 */

import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

/**
 * Playwright se načítá přes createRequire, ne přes import.
 *
 * Důvod: CommonJS resolution respektuje NODE_PATH, takže se najde
 * i Playwright nainstalovaný globálně. S `import` by to fungovalo jen
 * při instalaci do tohoto projektu.
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

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/** Počká, než formulář vrátí výsledek — potvrzení nebo chybu. */
async function waitForFormResult(page) {
  await page.waitForSelector('[data-testid="link-sent"], [data-testid="form-error"]', {
    state: "attached",
    timeout: 15_000,
  });
  const error = await page.$('[data-testid="form-error"]');
  return error ? { ok: false, text: (await error.textContent()) ?? "" } : { ok: true };
}

async function clearMailbox() {
  await rm(path.join(process.cwd(), ".dev-mail"), {
    recursive: true,
    force: true,
  });
}

async function lastMail() {
  for (let i = 0; i < 40; i++) {
    try {
      return JSON.parse(await readFile(MAILBOX, "utf8"));
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return null;
}

async function mailboxEmpty() {
  try {
    await readFile(MAILBOX, "utf8");
    return false;
  } catch {
    return true;
  }
}

/** Nechá si poslat magic link a vrátí ho. */
async function requestLink(page, email) {
  await clearMailbox();
  await page.goto(`${BASE}/`);
  await page.fill("#email", email);
  await page.click('button[type="submit"]');
  const result = await waitForFormResult(page);
  if (!result.ok) throw new Error(`Přihlášení selhalo: ${result.text}`);
  const mail = await lastMail();
  return mail?.link ?? null;
}

const browser = await chromium.launch();

try {
  // ── 1. Cizí domény neprojdou ──────────────────────────────────────────────
  section("1. Omezení na školní domény");
  {
    const page = await browser.newPage();
    await clearMailbox();
    await page.goto(`${BASE}/`);
    await page.fill("#email", "novak@gmail.com");
    await page.click('button[type="submit"]');
    const result = await waitForFormResult(page);

    check(
      "gmail.com je odmítnutý",
      !result.ok && /školní adresou/i.test(result.text ?? ""),
      result.ok ? "formulář ho přijal!" : result.text,
    );
    check("žádný mail se neodeslal", await mailboxEmpty());
    await page.close();
  }

  // ── 2.–3. Magic link přihlásí ─────────────────────────────────────────────
  section("2. Přihlášení magic linkem");
  let ticketCode = null;
  const teacher = "ucitel@zsulesa.cz";
  {
    const page = await browser.newPage();
    const link = await requestLink(page, teacher);
    check("odkaz se vygeneroval a uložil do .dev-mail", Boolean(link));

    await page.goto(link);
    await page.waitForURL(/\/nahlasit/, { timeout: 10_000 });
    check("odkaz přihlásí a pustí na formulář", page.url().includes("/nahlasit"));
    check(
      "formulář zná přihlášený e-mail",
      (await page.textContent("body"))?.includes(teacher) ?? false,
    );

    // ── 4. Token je jednorázový ─────────────────────────────────────────────
    section("3. Jednorázovost odkazu");
    const second = await browser.newPage();
    await second.goto(link);
    await second.waitForLoadState();
    check(
      "druhé kliknutí na stejný odkaz neprojde",
      second.url().includes("/prihlaseni/neplatny-odkaz"),
      second.url(),
    );
    await second.close();

    // ── 5. Zadání tiketu ────────────────────────────────────────────────────
    section("4. Zadání tiketu");
    await clearMailbox();
    await page.goto(`${BASE}/nahlasit`);
    await page.fill("#title", "Projektor v 2.B nenaskočí");
    await page.fill("#location", "2.B");
    await page.selectOption("#category", "projector");
    await page.selectOption("#priority", "high");
    await page.fill(
      "#description",
      "Bliká oranžová kontrolka, na tabuli nic. Kabel překontrolovaný, začalo to v pátek.",
    );
    await page.fill("#requesterName", "Jana Nováková");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/moje\/T-/, { timeout: 15_000 });

    ticketCode = page.url().split("/moje/")[1];
    check("tiket vznikl a má kód", /^T-[A-Z0-9]{4}$/.test(ticketCode ?? ""), ticketCode ?? "");

    const adminMail = await lastMail();
    check(
      "správci IT přišlo upozornění na nový tiket",
      adminMail?.to === "spravce@zsulesa.cz" &&
        (adminMail?.subject ?? "").includes(ticketCode),
      adminMail?.subject ?? "žádný mail",
    );

    await page.goto(`${BASE}/moje`);
    check(
      "tiket je vidět v Moje závady",
      (await page.textContent("body"))?.includes(ticketCode) ?? false,
    );
    await page.close();
  }

  // ── 6. Izolace mezi žadateli ──────────────────────────────────────────────
  section("5. Cizí tiket není vidět");
  {
    const page = await browser.newPage();
    const link = await requestLink(page, "jiny@zsulesa.cz");
    await page.goto(link);
    await page.waitForURL(/\/nahlasit/);

    const response = await page.goto(`${BASE}/moje/${ticketCode}`);
    check(
      "cizí tiket vrátí 404",
      response?.status() === 404,
      `status ${response?.status()}`,
    );
    await page.close();
  }

  // ── 7. Rate limit ─────────────────────────────────────────────────────────
  section("6. Rate limit na odesílání odkazů");
  {
    const page = await browser.newPage();
    const email = `limit-${Date.now()}@zsulesa.cz`;
    let blockedAt = null;

    for (let attempt = 1; attempt <= 7 && blockedAt === null; attempt++) {
      await page.goto(`${BASE}/`);
      await page.fill("#email", email);
      await page.click('button[type="submit"]');
      const result = await waitForFormResult(page);
      if (!result.ok && /za hodinu|příliš mnoho/i.test(result.text)) {
        blockedAt = attempt;
      }
    }

    check(
      "šestý pokus v řadě je zablokovaný",
      blockedAt === 6,
      blockedAt === null ? "nezablokoval se vůbec" : `zablokoval se při ${blockedAt}.`,
    );
    await page.close();
  }

  // ── 8. Admin ──────────────────────────────────────────────────────────────
  section("7. Administrace");
  const adminPage = await browser.newPage();
  {
    const response = await adminPage.goto(`${BASE}/admin`);
    check(
      "/admin bez přihlášení přesměruje",
      adminPage.url().includes("/admin/prihlaseni"),
      adminPage.url(),
    );
    void response;

    await adminPage.fill("#password", "spatneheslo");
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForSelector('[data-testid="form-error"]', {
      timeout: 15_000,
    });
    check("špatné heslo neprojde", adminPage.url().includes("/admin/prihlaseni"));

    await adminPage.fill("#password", ADMIN_PASSWORD);
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL(/\/admin$/, { timeout: 10_000 });
    check("správné heslo pustí dovnitř", adminPage.url().endsWith("/admin"));

    check(
      "tiket je ve frontě",
      (await adminPage.textContent("body"))?.includes(ticketCode) ?? false,
    );
  }

  // ── 9. Vynucený zápis „co jsem udělal“ ────────────────────────────────────
  section("8. Uzavření vyžaduje zápis práce");
  {
    await adminPage.goto(`${BASE}/admin/tiket/${ticketCode}`);
    await adminPage.selectOption("#status", "done");
    await adminPage.waitForSelector("#resolution", { timeout: 5000 });

    // prázdné pole „co jsem udělal“ — HTML required obejdeme, aby se ověřila
    // kontrola na serveru, ne jen v prohlížeči
    await adminPage.evaluate(() => {
      document
        .querySelectorAll("[required]")
        .forEach((el) => el.removeAttribute("required"));
    });
    await adminPage.click('button:has-text("Uzavřít tiket")');
    await adminPage.waitForSelector('[data-testid="field-error"]', {
      timeout: 15_000,
    });
    const alert = await adminPage.textContent('[data-testid="field-error"]');
    check(
      "uzavření bez zápisu práce server odmítne",
      /vyplň|udělalo/i.test(alert ?? ""),
      alert ?? "",
    );
  }

  // ── 10. Interní poznámka ──────────────────────────────────────────────────
  section("9. Interní poznámka zůstane interní");
  const internalNote = "Zdroj je po záruce, při další závadě vyhodit.";
  {
    await adminPage.goto(`${BASE}/admin/tiket/${ticketCode}`);
    await adminPage.fill('textarea[aria-label="Interní poznámka"]', internalNote);
    await adminPage
      .locator('form:has(textarea[aria-label="Interní poznámka"]) button')
      .click();
    await adminPage.waitForSelector('[data-testid="note-saved"]', {
      timeout: 15_000,
    });

    await adminPage.goto(`${BASE}/admin/tiket/${ticketCode}`);
    check(
      "admin interní poznámku vidí",
      (await adminPage.textContent("body"))?.includes(internalNote) ?? false,
    );
  }

  // ── 11. Uzavření a mail žadateli ──────────────────────────────────────────
  section("10. Uzavření tiketu");
  const resolution = "Vyměněn HDMI kabel, projektor přeladěn na vstup 2.";
  {
    await clearMailbox();
    await adminPage.goto(`${BASE}/admin/tiket/${ticketCode}`);
    await adminPage.selectOption("#status", "done");
    await adminPage.waitForSelector("#resolution");
    await adminPage.fill("#resolution", resolution);
    await adminPage.fill("#timeSpentMinutes", "25");
    await adminPage.click('button:has-text("Uzavřít tiket")');
    await adminPage.waitForSelector('[data-testid="status-saved"]', {
      timeout: 20_000,
    });

    const mail = await lastMail();
    check(
      "žadateli přišel mail o vyřešení",
      mail?.to === teacher && /Vyřešeno/i.test(mail?.subject ?? ""),
      mail?.subject ?? "žádný mail",
    );
    check(
      "mail obsahuje, co se udělalo",
      (mail?.text ?? "").includes(resolution),
    );

    await adminPage.goto(`${BASE}/admin/hotovo`);
    const body = (await adminPage.textContent("body")) ?? "";
    check("tiket je v archivu", body.includes(ticketCode));
    check("archiv ukazuje strávený čas", body.includes("25 min"));
  }

  // ── 12. Žadatel nevidí interní poznámku ───────────────────────────────────
  section("11. Pohled žadatele po uzavření");
  {
    const page = await browser.newPage();
    const link = await requestLink(page, teacher);
    await page.goto(link);
    await page.waitForURL(/\/nahlasit/);
    await page.goto(`${BASE}/moje/${ticketCode}`);

    const body = (await page.textContent("body")) ?? "";
    check("žadatel vidí, co se udělalo", body.includes(resolution));
    check(
      "žadatel NEVIDÍ interní poznámku",
      !body.includes(internalNote),
      "interní poznámka prosákla do pohledu žadatele!",
    );
    await page.close();
  }

  // ── 13. CSV export ────────────────────────────────────────────────────────
  section("12. CSV export");
  {
    const anon = await browser.newContext();
    const anonResponse = await anon.request.get(`${BASE}/admin/export`);
    check(
      "export bez přihlášení vrátí 401",
      anonResponse.status() === 401,
      `status ${anonResponse.status()}`,
    );
    await anon.close();

    const response = await adminPage.request.get(`${BASE}/admin/export`);
    check("export přihlášenému projde", response.status() === 200);

    const buffer = await response.body();
    const text = buffer.toString("utf8");

    check("CSV začíná BOM (kvůli Excelu)", buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf);
    check("CSV je oddělené středníkem", text.includes('";"'));
    check("diakritika je v pořádku", text.includes("Kód") && text.includes("udělal"));
    check("CSV obsahuje tiket", text.includes(ticketCode));
    check("CSV obsahuje zápis práce", text.includes(resolution));
    check(
      "CSV neobsahuje interní poznámku",
      !text.includes(internalNote),
      "interní poznámka prosákla do exportu!",
    );
  }

  // ── 14. Odpověď na uzavřený tiket ho otevře znovu ─────────────────────────
  section("13. Odpověď na uzavřený tiket");
  {
    const page = await browser.newPage();
    const link = await requestLink(page, teacher);
    await page.goto(link);
    await page.waitForURL(/\/nahlasit/);
    await page.goto(`${BASE}/moje/${ticketCode}`);

    await page.fill('textarea[aria-label="Komentář k tiketu"]', "Zase to nejde.");
    await page.locator('form:has(textarea[aria-label="Komentář k tiketu"]) button').click();
    await page.waitForSelector("text=Odesláno", { timeout: 15_000 });

    await page.goto(`${BASE}/moje/${ticketCode}`);
    check(
      "tiket se odpovědí otevřel znovu",
      ((await page.textContent("body")) ?? "").includes("Nový"),
    );
    await page.close();

    await adminPage.goto(`${BASE}/admin`);
    check(
      "znovuotevřený tiket je zpátky ve frontě",
      ((await adminPage.textContent("body")) ?? "").includes(ticketCode),
    );

    await adminPage.goto(`${BASE}/admin/hotovo`);
    check(
      "a zmizel z archivu",
      !((await adminPage.textContent("body")) ?? "").includes(ticketCode),
    );
  }

  await adminPage.close();
} finally {
  await browser.close();
}

console.log(`\n${"─".repeat(50)}`);
console.log(`Prošlo: ${passed}   Selhalo: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
