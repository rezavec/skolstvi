/**
 * Spustí TypeScript soubor, který používá aliasy `@/…`.
 *
 * Node umí od v22 odstranit typy sám (`--experimental-strip-types`), ale
 * aliasy z tsconfig.json nezná — a `src/db/index.ts` si přes `@/lib/env`
 * sahá dál, takže relativními cestami v testu by se to neobešlo. Proto se
 * soubor nejdřív zabalí esbuildem (tím samým, kterým se buildí rozšíření)
 * a pak se spustí.
 *
 * Balí se **jen vlastní kód** (`packages: "external"`). Balit do ESM i obsah
 * node_modules nejde: `pg` je CommonJS s dynamickými `require`, které se
 * v ESM bundlu rozbijí. Kvůli tomu musí výsledek ležet uvnitř projektu,
 * aby si Node `pg` a `drizzle-orm` našel v jeho node_modules.
 *
 * Použití:  node scripts/run-ts.mjs scripts/neco.test.ts
 */
import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Nahradí vyjmenované importy prázdným modulem.
 *
 * `import "server-only"` je značka pro Next.js, že se soubor nesmí dostat
 * do prohlížeče. Next si ji řeší sám ve svém bundleru a odpovídající
 * balíček v node_modules vůbec není — mimo Next se proto musí vyhodit.
 * Jako `external` by ji Node hledal a spadl na ERR_MODULE_NOT_FOUND.
 */
function prazdneModuly(nazvy) {
  const filtr = new RegExp(`^(${nazvy.join("|")})$`);
  return {
    name: "prazdne-moduly",
    setup(build) {
      build.onResolve({ filter: filtr }, (args) => ({
        path: args.path,
        namespace: "prazdne",
      }));
      build.onLoad({ filter: /.*/, namespace: "prazdne" }, () => ({
        contents: "",
        loader: "js",
      }));
    },
  };
}

const vstup = process.argv[2];
if (!vstup) {
  console.error("Použití: node scripts/run-ts.mjs <soubor.ts>");
  process.exit(1);
}

const korenProjektu = path.resolve(import.meta.dirname, "..");
const docasnaSlozka = path.join(korenProjektu, ".ts-run");
const vystup = path.join(docasnaSlozka, "bundle.mjs");

await mkdir(docasnaSlozka, { recursive: true });

try {
  await build({
    entryPoints: [path.resolve(vstup)],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    outfile: vystup,
    alias: { "@": path.join(korenProjektu, "src") },
    packages: "external",
    plugins: [prazdneModuly(["server-only"])],
    logLevel: "warning",
  });

  await import(pathToFileURL(vystup).href);
} finally {
  await rm(docasnaSlozka, { recursive: true, force: true }).catch(() => {});
}
