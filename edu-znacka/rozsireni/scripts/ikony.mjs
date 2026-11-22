/**
 * Vygeneruje PNG ikony rozšíření ze SVG.
 *
 * Stores chtějí PNG v několika velikostech a SVG nepřijímají, takže se
 * musí vyrenderovat. Dělá se to Chromiem přes Playwright — je stejně
 * potřeba pro smoke test, takže tím nepřibývá žádná závislost.
 *
 * Spuštění:  npm run ikony
 * Výsledek commitujeme, aby `npm run build` nepotřeboval prohlížeč.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "Chybí Playwright:\n  npm install -D playwright\n  npx playwright install chromium",
  );
  process.exit(1);
}

const VELIKOSTI = [16, 32, 48, 128];
const slozka = path.join(import.meta.dirname, "..", "ikony");

/**
 * Fajfka v kolečku — stejný tvar jako značka v obsahu stránky, ať je to
 * poznat. Na malých velikostech je kolečko plné a fajfka vyříznutá,
 * protože obrys by se v 16 px slil.
 */
function svg(velikost) {
  const plne = velikost <= 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${velikost}" height="${velikost}" viewBox="0 0 16 16">
  ${
    plne
      ? `<circle cx="8" cy="8" r="8" fill="#15803d"/>
  <path d="M11.9 5.3 7.1 11.3a.9.9 0 0 1-1.33.08L3.3 9.05a.9.9 0 0 1 1.22-1.32l1.66 1.54 3.42-4.3a.9.9 0 0 1 1.42 1.11z" fill="#fff"/>`
      : `<circle cx="8" cy="8" r="7.1" fill="#f0fdf4" stroke="#15803d" stroke-width="1.3"/>
  <path d="M11.6 5.6 7.2 11a.8.8 0 0 1-1.18.07L3.8 9a.8.8 0 0 1 1.08-1.17l1.5 1.38 3.1-3.9a.8.8 0 0 1 1.25.99z" fill="#15803d"/>`
  }
</svg>`;
}

const prohlizec = await chromium.launch();
const stranka = await prohlizec.newPage();

await mkdir(slozka, { recursive: true });

for (const velikost of VELIKOSTI) {
  await stranka.setViewportSize({ width: velikost, height: velikost });
  await stranka.setContent(
    `<!doctype html><style>
       html,body{margin:0;padding:0;background:transparent}
       svg{display:block}
     </style>${svg(velikost)}`,
  );

  // deviceScaleFactor úmyslně 1 — ikona má mít přesně zadaný počet pixelů
  const obrazek = await stranka.screenshot({ omitBackground: true });
  await writeFile(path.join(slozka, `${velikost}.png`), obrazek);
  console.log(`  ikony/${velikost}.png`);
}

await prohlizec.close();
console.log("Hotovo.");
