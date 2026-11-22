/**
 * Smoke test rozšíření — opravdový Chromium s načteným rozšířením.
 *
 * Běží proti **lokálním fixture souborům** (fixtures/), které se vydávají
 * za youtube.com. Díky tomu je test deterministický: padá, když se rozbije
 * rozšíření, ne když YouTube vydá redesign nebo ukáže souhlas s cookies.
 *
 * Index se do rozšíření nasype přímo do storage.local, takže test nepotřebuje
 * běžící server. Synchronizace proti opravdovému /api/index se zkouší zvlášť
 * na konci, a jen když server odpovídá.
 *
 * Spuštění:
 *   npm run build && npm run smoke
 *
 * Živá kontrola na skutečném YouTube (nestabilní, jen na ruční ověření):
 *   SMOKE_LIVE=1 npm run smoke
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

/**
 * Playwright se načítá přes createRequire, ne přes import — CommonJS
 * resolution respektuje NODE_PATH, takže se najde i globálně nainstalovaný.
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

const koren = path.join(import.meta.dirname, "..");
const ROZSIRENI = path.join(koren, "dist-chrome");
const WEB = process.env.WEB_URL ?? "http://localhost:3000";

/**
 * Adresa, ze které si rozšíření v testu „stahuje“ index.
 *
 * Schválně mrtvý port: kdyby ukazovala na běžící server, synchronizace by
 * nasypaný index přepsala opravdovými daty a test by přestal být
 * deterministický.
 */
const MRTVY_WEB = "http://127.0.0.1:9";

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

/** Index, který se nasype do rozšíření. Odpovídá fixtures/feed.html. */
const TESTOVACI_INDEX = {
  format: 1,
  verze: 100,
  stazeno: new Date().toISOString(),
  obory: ["fyzika", "chemie", "biologie"],
  videa: {
    aaaaaaaaaaa: [0, 2],
    eeeeeeeeeee: [0, 1],
  },
  kanaly: {
    UCsXVk37bltHxD1rDPwtNM8Q: [2],
  },
  prezdivky: {
    "@kurzgesagt": "UCsXVk37bltHxD1rDPwtNM8Q",
  },
};

async function main() {
  // ── Spuštění prohlížeče s rozšířením ──
  //
  // POZOR: `headless: true` spouští „headless shell“, a ten rozšíření
  // VŮBEC nenačte — test by tiše procházel na prázdno. Proto plný Chromium
  // s --headless=new.
  const kontext = await chromium.launchPersistentContext("", {
    executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
    args: [
      "--headless=new",
      "--no-sandbox",
      `--disable-extensions-except=${ROZSIRENI}`,
      `--load-extension=${ROZSIRENI}`,
    ],
  });

  try {
    sekce("0) Rozšíření se načetlo");

    // Servisní worker se probudí až po chvíli.
    let worker = kontext.serviceWorkers()[0];
    if (!worker) {
      worker = await kontext.waitForEvent("serviceworker", { timeout: 15_000 });
    }
    const idRozsireni = new URL(worker.url()).host;

    kontrola(
      "servisní worker běží",
      Boolean(idRozsireni),
      "bez tohohle jsou všechny další kontroly bezcenné",
    );

    // ── Nasypání indexu a nastavení ──
    //
    // Děje se to ze stránky popupu, protože tam jsou k dispozici chrome.*
    // API. Z obyčejné stránky by to nešlo.
    const sprava = await kontext.newPage();
    await sprava.goto(`chrome-extension://${idRozsireni}/popup/popup.html`);

    // Počkat, až doběhne synchronizace, kterou si rozšíření spustí samo po
    // instalaci. Bez toho je to závod: kdyby dojela až po nasypání indexu,
    // přepsala by ho a test by padal jednou za čas bez zjevné příčiny.
    await sprava.evaluate(async () => {
      for (let i = 0; i < 60; i++) {
        const { stavSynchronizace } = await chrome.storage.local.get(
          "stavSynchronizace",
        );
        if (stavSynchronizace) return;
        await new Promise((r) => setTimeout(r, 250));
      }
    });

    await sprava.evaluate(
      async ([index, web]) => {
        await chrome.storage.sync.set({ rezim: "znacky", kanaly: true, web });
        await chrome.storage.local.set({ index });
      },
      [TESTOVACI_INDEX, MRTVY_WEB],
    );

    kontrola(
      "popup se otevřel a index se uložil",
      (await sprava.evaluate(
        async () => Object.keys((await chrome.storage.local.get("index")).index.videa).length,
      )) === 2,
    );

    // ── Fixture se vydává za youtube.com ──
    const feed = await readFile(path.join(koren, "fixtures/feed.html"), "utf8");
    const watch = await readFile(path.join(koren, "fixtures/watch.html"), "utf8");

    const stranka = await kontext.newPage();
    await stranka.route("https://www.youtube.com/**", (route) => {
      const url = route.request().url();
      const telo = url.includes("/watch") ? watch : feed;
      return route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: telo,
      });
    });

    // ── Feed ──
    sekce("1) Značky v mřížce videí");

    await stranka.goto("https://www.youtube.com/");
    await stranka.waitForSelector("[data-ez-znacka]", { timeout: 10_000 });

    const znacka = (test) =>
      stranka.locator(
        `ytd-rich-item-renderer[data-test="${test}"] [data-ez-znacka]`,
      );

    kontrola(
      "ověřené video má značku videa",
      (await znacka("overene").getAttribute("data-ez-znacka")) === "video",
    );
    kontrola(
      "u značky je název oboru",
      (await znacka("overene").innerText()).includes("fyzika"),
      await znacka("overene").innerText(),
    );
    kontrola(
      "neznámé video značku NEMÁ",
      (await znacka("nezname").count()) === 0,
    );
    kontrola(
      "video z důvěryhodného kanálu (přezdívka /@…) má značku kanálu",
      (await znacka("kanal-prezdivka").getAttribute("data-ez-znacka")) === "kanal",
    );
    kontrola(
      "video z důvěryhodného kanálu (/channel/UC…) má značku kanálu",
      (await znacka("kanal-id").getAttribute("data-ez-znacka")) === "kanal",
    );
    kontrola(
      "ověřený Shorts má značku videa",
      (await znacka("shorts").getAttribute("data-ez-znacka")) === "video",
    );

    kontrola(
      "každá karta má nejvýš jednu značku",
      (await stranka.locator("[data-ez-znacka]").count()) === 4,
      `nalezeno ${await stranka.locator("[data-ez-znacka]").count()}`,
    );

    sekce("2) Značka vede na detail na webu");
    kontrola(
      "odkaz míří na /video/<id>",
      (await znacka("overene").getAttribute("href")) ===
        `${MRTVY_WEB}/video/aaaaaaaaaaa`,
      await znacka("overene").getAttribute("href"),
    );
    kontrola(
      "značka má aria-label pro čtečky",
      ((await znacka("overene").getAttribute("aria-label")) ?? "").includes(
        "Ověřeno",
      ),
    );
    kontrola(
      "odkaz se otevírá v nové kartě bez referreru",
      (await znacka("overene").getAttribute("target")) === "_blank" &&
        ((await znacka("overene").getAttribute("rel")) ?? "").includes("noreferrer"),
    );

    sekce("3) Opakovaný průchod značku nezdvojí");
    // Vyvoláme změnu DOM, aby se spustil MutationObserver.
    await stranka.evaluate(() => {
      document.body.append(document.createElement("div"));
    });
    await stranka.waitForTimeout(400);
    kontrola(
      "po změně DOM je značek pořád stejně",
      (await stranka.locator("[data-ez-znacka]").count()) === 4,
      `nalezeno ${await stranka.locator("[data-ez-znacka]").count()}`,
    );

    sekce("4) Režim „ztlumit“");
    await sprava.evaluate(async () => {
      await chrome.storage.sync.set({ rezim: "ztlumit" });
    });
    await stranka.waitForTimeout(600);

    kontrola(
      "neověřené video je ztlumené",
      await stranka
        .locator('ytd-rich-item-renderer[data-test="nezname"] .ez-ztlumeno')
        .count()
        .then((n) => n > 0),
    );
    kontrola(
      "ověřené video ztlumené není",
      (await stranka
        .locator('ytd-rich-item-renderer[data-test="overene"] .ez-ztlumeno')
        .count()) === 0,
    );

    sekce("5) Režim „jen ověřená“ nebere značku kanálu");
    await sprava.evaluate(async () => {
      await chrome.storage.sync.set({ rezim: "jen-overena" });
    });
    await stranka.waitForTimeout(600);

    kontrola(
      "neznámé video je skryté",
      !(await stranka
        .locator('ytd-rich-item-renderer[data-test="nezname"] a#thumbnail')
        .isVisible()),
    );
    kontrola(
      "ověřené video je vidět",
      await stranka
        .locator('ytd-rich-item-renderer[data-test="overene"] a#thumbnail')
        .isVisible(),
    );
    kontrola(
      "video jen z důvěryhodného kanálu je taky skryté (striktní filtr)",
      !(await stranka
        .locator('ytd-rich-item-renderer[data-test="kanal-prezdivka"] a#thumbnail')
        .isVisible()),
    );

    sekce("6) Vypnutí značky kanálu");
    await sprava.evaluate(async () => {
      await chrome.storage.sync.set({ rezim: "znacky", kanaly: false });
    });
    await stranka.waitForTimeout(600);

    kontrola(
      "značky kanálu zmizely",
      (await stranka.locator('[data-ez-znacka="kanal"]').count()) === 0,
    );
    kontrola(
      "značky videí zůstaly",
      (await stranka.locator('[data-ez-znacka="video"]').count()) === 2,
    );

    sekce("7) Stránka videa — značka u nadpisu, ne na náhledu");
    await sprava.evaluate(async () => {
      await chrome.storage.sync.set({ rezim: "znacky", kanaly: true });
    });

    await stranka.goto("https://www.youtube.com/watch?v=aaaaaaaaaaa");
    await stranka.waitForSelector("h1 [data-ez-znacka]", { timeout: 10_000 });

    kontrola(
      "nadpis má značku videa",
      (await stranka.locator("h1 [data-ez-znacka]").getAttribute("data-ez-znacka")) ===
        "video",
    );
    kontrola(
      "neověřené video v doporučených značku nemá",
      (await stranka.locator("#related [data-ez-znacka]").count()) === 0,
    );

    sekce("8) Odebrání značky ze serveru ji smaže i lokálně");
    await sprava.evaluate(async () => {
      // Simulace toho, co dorazí z /api/index?od=… jako `null`.
      const ulozeny = (await chrome.storage.local.get("index")).index;
      delete ulozeny.videa.aaaaaaaaaaa;
      ulozeny.verze = 101;
      await chrome.storage.local.set({ index: ulozeny });
    });
    await stranka.waitForTimeout(600);

    kontrola(
      "značka u nadpisu zmizela",
      (await stranka.locator("h1 [data-ez-znacka]").count()) === 0,
    );

    // ── Synchronizace proti opravdovému serveru ──
    sekce("9) Synchronizace z běžícího serveru");
    const serverZije = await fetch(`${WEB}/api/index`, {
      signal: AbortSignal.timeout(3000),
    })
      .then((r) => r.ok)
      .catch(() => false);

    if (!serverZije) {
      console.log(
        `  – přeskočeno, na ${WEB} nic neodpovídá ` +
          "(pusť `npm run dev` ve složce web/)",
      );
    } else {
      await sprava.evaluate(async (web) => {
        await chrome.storage.sync.set({ web });
        await chrome.storage.local.remove("index");
      }, WEB);

      const odpoved = await sprava.evaluate(
        () =>
          new Promise((vyres) => {
            chrome.runtime.sendMessage({ typ: "synchronizuj" }, vyres);
          }),
      );
      kontrola("pozadí odpovědělo na pokyn k synchronizaci", Boolean(odpoved));

      const stav = await sprava.evaluate(async () => {
        const { stavSynchronizace } = await chrome.storage.local.get(
          "stavSynchronizace",
        );
        const { index } = await chrome.storage.local.get("index");
        return { stavSynchronizace, index };
      });

      kontrola(
        "synchronizace prošla",
        stav.stavSynchronizace?.ok === true,
        JSON.stringify(stav.stavSynchronizace),
      );
      kontrola(
        "stáhl se index ve známém formátu",
        stav.index?.format === 1 && Array.isArray(stav.index?.obory),
        JSON.stringify(stav.index?.format),
      );
      kontrola(
        "index obsahuje seznam oborů",
        (stav.index?.obory?.length ?? 0) > 0,
      );
    }

    // ── Živá kontrola ──
    if (process.env.SMOKE_LIVE === "1") {
      sekce("10) Živá kontrola na skutečném YouTube");
      const ziva = await kontext.newPage();
      try {
        await ziva.goto("https://www.youtube.com/", {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        await ziva.waitForTimeout(4000);
        const nalezeno = await ziva.evaluate(
          () =>
            document.querySelectorAll('a[href*="/watch?v="] img').length,
        );
        kontrola(
          "na opravdovém YouTube se našly náhledy videí s obrázkem",
          nalezeno > 0,
          `nalezeno ${nalezeno} — pokud 0, změnili strukturu a selektor v obsah.ts potřebuje revizi`,
        );
      } catch (error) {
        console.log(`  – živá kontrola neproběhla: ${error.message}`);
      }
    }
  } finally {
    await kontext.close();
  }

  console.log(`\n${"═".repeat(56)}`);
  console.log(`prošlo: ${proslo}    padlo: ${padlo}`);
  process.exit(padlo === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\nTest spadl:", error);
  process.exit(1);
});
