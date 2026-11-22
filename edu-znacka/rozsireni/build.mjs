/**
 * Build rozšíření pro Chrome i Firefox.
 *
 * Výstup jsou dvě složky, `dist-chrome/` a `dist-firefox/`. Rozdíl mezi nimi
 * je jen manifest: Chrome v MV3 chce `background.service_worker`, Firefox
 * `background.scripts` (event page) a povinné `browser_specific_settings`.
 * Kód je pro oba stejný — rozdíly v API řeší `src/api.ts`.
 *
 *   node build.mjs           jednorázový build
 *   node build.mjs --watch   build a přebuildění při změně
 *   node build.mjs --zip     build a zabalení do zipů pro stores
 */
import { build, context } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const koren = import.meta.dirname;
const watch = process.argv.includes("--watch");
const zip = process.argv.includes("--zip");

/**
 * Adresa webu, se kterým rozšíření mluví.
 *
 * Je na dvou místech — v `host_permissions` manifestu a ve výchozím
 * nastavení — a obě se musí shodovat, jinak rozšíření index vůbec
 * nestáhne. Ručně udržovaná dvojice je přesně ten druh věci, na kterou
 * se při nasazení zapomene, takže se obě propisují odsud:
 *
 *   WEB_URL=https://znacka.skola.cz npm run build
 */
const WEB = (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/+$/, "");

const cile = [
  { nazev: "chrome", slozka: "dist-chrome", manifest: "manifest.chrome.json" },
  { nazev: "firefox", slozka: "dist-firefox", manifest: "manifest.firefox.json" },
];

/**
 * `obsah` a `pozadi` se buildí zvlášť, ne jako jeden bundle: content script
 * a servisní worker běží v různých kontextech a nesmí si sdílet modul.
 * Společný kód (api.ts, index.ts) se tím do obou zkopíruje — je to pár
 * kilobajtů a je to správně.
 */
const vstupy = {
  obsah: "src/obsah.ts",
  pozadi: "src/pozadi.ts",
  "popup/popup": "src/popup/popup.ts",
};

async function zabal(slozka) {
  const vystup = path.join(koren, slozka);

  await rm(vystup, { recursive: true, force: true });
  await mkdir(path.join(vystup, "popup"), { recursive: true });
  await mkdir(path.join(vystup, "ikony"), { recursive: true });

  const nastaveni = {
    bundle: true,
    // Výchozí adresa webu se vpéká při buildu — viz WEB výš.
    define: { "process.env.WEB_URL": JSON.stringify(WEB) },
    format: "esm",
    target: ["chrome114", "firefox128"],
    sourcemap: watch ? "inline" : false,
    minify: !watch,
    logLevel: "info",
  };

  const builds = Object.entries(vstupy).map(([nazev, vstup]) => ({
    ...nastaveni,
    entryPoints: [path.join(koren, vstup)],
    outfile: path.join(vystup, `${nazev}.js`),
  }));

  if (watch) {
    for (const konfigurace of builds) {
      const ctx = await context(konfigurace);
      await ctx.watch();
    }
  } else {
    await Promise.all(builds.map((konfigurace) => build(konfigurace)));
  }

  return vystup;
}

async function zkopirujStatiku(vystup, manifest) {
  await cp(path.join(koren, "src/styl.css"), path.join(vystup, "styl.css"));
  await cp(
    path.join(koren, "src/popup/popup.html"),
    path.join(vystup, "popup/popup.html"),
  );
  await cp(
    path.join(koren, "src/popup/popup.css"),
    path.join(vystup, "popup/popup.css"),
  );
  await cp(path.join(koren, "ikony"), path.join(vystup, "ikony"), {
    recursive: true,
  });
  await cp(path.join(koren, manifest), path.join(vystup, "manifest.json"));
}

/**
 * Doplní do manifestu věci, které se nemají udržovat ručně:
 * verzi z package.json a adresu webu v host_permissions.
 */
async function dopisManifest(vystup) {
  const { version } = JSON.parse(
    await readFile(path.join(koren, "package.json"), "utf8"),
  );
  const cesta = path.join(vystup, "manifest.json");
  const manifest = JSON.parse(await readFile(cesta, "utf8"));

  manifest.version = version;
  manifest.host_permissions = [
    "https://www.youtube.com/*",
    `${WEB}/*`,
  ];

  await writeFile(cesta, JSON.stringify(manifest, null, 2) + "\n");
}

async function zipni(slozka) {
  const vystup = path.join(koren, `${slozka}.zip`);
  await rm(vystup, { force: true });

  try {
    await promisify(execFile)("zip", ["-r", "-q", vystup, "."], {
      cwd: path.join(koren, slozka),
    });
    console.log(`  → ${path.basename(vystup)}`);
  } catch {
    console.warn(
      `  ! zip není k dispozici — ${slozka} zabal ručně ` +
        "(ve storech se nahrává zip obsahu složky, ne složka sama)",
    );
  }
}

console.log(`Web: ${WEB}`);

for (const cil of cile) {
  console.log(`\n── ${cil.nazev} ──`);
  const vystup = await zabal(cil.slozka);
  await zkopirujStatiku(vystup, cil.manifest);
  await dopisManifest(vystup);
  if (zip) await zipni(cil.slozka);
}

console.log(
  watch
    ? "\nSleduju změny. Po přebuildění dej v prohlížeči u rozšíření „Načíst znovu“."
    : "\nHotovo. Načti dist-chrome/ přes chrome://extensions → Načíst rozbalené.",
);
