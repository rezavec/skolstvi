/**
 * Test pravidla značky proti opravdové databázi.
 *
 * Tohle je nejdůležitější test v projektu. Pravidlo, kdy značka vzniká
 * a kdy zmizí (`prepocitejStavVidea` v src/db/queries.ts), je jádro celé
 * věci — kdyby se rozbilo, aplikace by vypadala, že funguje, a přitom by
 * udělovala značky, ke kterým neexistuje podepsaný důvod.
 *
 * Spuštění:  npm run test:pravidlo
 *
 * POZOR: test si **vymaže celou databázi** (TRUNCATE). Pouštěj ho jen
 * na vývojové DATABASE_URL, nikdy na produkční.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { kanaly, namitky, recenze, recenzenti, videa } from "@/db/schema";
import {
  indexData,
  najdiVideo,
  pridejKanal,
  pridejVideo,
  rozhodniORecenzentovi,
  ulozRecenzi,
  vyridNamitku,
  vytvorNamitku,
} from "@/db/queries";

let proslo = 0;
let padlo = 0;

function kontrola(nazev: string, podminka: boolean, detail = "") {
  if (podminka) {
    proslo++;
    console.log(`  ✓ ${nazev}`);
  } else {
    padlo++;
    console.log(`  ✗ ${nazev}${detail ? ` — ${detail}` : ""}`);
  }
}

function sekce(nazev: string) {
  console.log(`\n${nazev}`);
}

async function stav(youtubeId: string): Promise<string> {
  return (await najdiVideo(youtubeId))?.stav ?? "NEEXISTUJE";
}

async function vIndexu(youtubeId: string): Promise<boolean> {
  const index = await indexData();
  return index.videa.some((v) => v.youtubeId === youtubeId);
}

async function main() {
  if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "")) {
    console.error(
      "Test maže databázi a pouští se jen na localhostu.\n" +
        "DATABASE_URL nevypadá jako lokální — končím.",
    );
    process.exit(1);
  }

  await db.execute(
    sql`TRUNCATE ${recenze}, ${namitky}, ${videa}, ${kanaly}, ${recenzenti}, citac_verze RESTART IDENTITY CASCADE`,
  );

  // ── Výchozí situace: fyzik, biolog a neschválený zájemce ──
  const [fyzik] = await db
    .insert(recenzenti)
    .values({
      email: "fyzik@mff.cuni.cz",
      slug: "jan-fyzik",
      jmeno: "doc. Jan Fyzik",
      instituce: "MFF UK",
      obory: ["fyzika", "astronomie"],
      stav: "schvalen",
    })
    .returning();

  const [biolog] = await db
    .insert(recenzenti)
    .values({
      email: "biolog@natur.cuni.cz",
      slug: "eva-bioloska",
      jmeno: "RNDr. Eva Bioložka",
      instituce: "PřF UK",
      obory: ["biologie"],
      stav: "schvalen",
    })
    .returning();

  const [neschvaleny] = await db
    .insert(recenzenti)
    .values({
      email: "ceka@muni.cz",
      slug: "petr-ceka",
      jmeno: "Petr Čeká",
      instituce: "MU",
      obory: ["fyzika"],
      stav: "ceka",
    })
    .returning();

  const video = await pridejVideo({
    youtubeId: "aaaaaaaaaaa",
    nazev: "Jak funguje gravitace",
    obor: "fyzika",
    uroven: "ss",
    kanalId: null,
    kanalNazev: "Kanál",
    pridal: "admin",
  });

  sekce("1) Nově přidané video značku nemá");
  kontrola("stav je 'ceka'", (await stav("aaaaaaaaaaa")) === "ceka", await stav("aaaaaaaaaaa"));
  kontrola("není v indexu", !(await vIndexu("aaaaaaaaaaa")));

  sekce("2) Recenze od NESCHVÁLENÉHO recenzenta značku nedá");
  await ulozRecenzi({
    videoId: video.id,
    recenzentId: neschvaleny.id,
    verdikt: "odpovida",
    obor: "fyzika",
    zduvodneni: "Vypadá to dobře, ale ještě nejsem schválený recenzent.",
    zdroje: null,
  });
  kontrola("stav zůstal 'ceka'", (await stav("aaaaaaaaaaa")) === "ceka", await stav("aaaaaaaaaaa"));

  sekce("3) Recenze z JINÉHO oboru značku nedá");
  await ulozRecenzi({
    videoId: video.id,
    recenzentId: biolog.id,
    verdikt: "odpovida",
    obor: "biologie",
    zduvodneni: "Jako biolog potvrzuji, že gravitace nepochybně funguje.",
    zdroje: null,
  });
  kontrola("stav zůstal 'ceka'", (await stav("aaaaaaaaaaa")) === "ceka", await stav("aaaaaaaaaaa"));

  sekce("4) Recenze od schváleného odborníka Z OBORU značku dá");
  await ulozRecenzi({
    videoId: video.id,
    recenzentId: fyzik.id,
    verdikt: "odpovida",
    obor: "fyzika",
    zduvodneni: "Odpovídá standardnímu výkladu, nenašel jsem faktickou chybu.",
    zdroje: "Feynman, The Feynman Lectures on Physics I, kap. 7",
  });
  kontrola("stav je 'overeno'", (await stav("aaaaaaaaaaa")) === "overeno", await stav("aaaaaaaaaaa"));
  const poOvereni = await najdiVideo("aaaaaaaaaaa");
  kontrola("datum ověření je vyplněné", poOvereni?.overenoAt instanceof Date);
  kontrola("je v indexu", await vIndexu("aaaaaaaaaaa"));

  sekce("5) Pozastavení recenzenta značku odebere");
  await rozhodniORecenzentovi(fyzik.id, "pozastaven", "Ověřuju kvalifikaci.");
  kontrola("stav už není 'overeno'", (await stav("aaaaaaaaaaa")) !== "overeno", await stav("aaaaaaaaaaa"));
  kontrola("zmizelo z indexu", !(await vIndexu("aaaaaaaaaaa")));

  sekce("6) Obnovení recenzenta značku vrátí, ale datum ověření nepřepíše");
  await rozhodniORecenzentovi(fyzik.id, "schvalen", null);
  kontrola("stav je zpátky 'overeno'", (await stav("aaaaaaaaaaa")) === "overeno", await stav("aaaaaaaaaaa"));
  const poObnoveni = await najdiVideo("aaaaaaaaaaa");
  kontrola(
    "datum ověření se NEZMĚNILO (značka je snímek v čase)",
    poOvereni?.overenoAt?.getTime() === poObnoveni?.overenoAt?.getTime(),
  );

  sekce("7) Námitka značku okamžitě pozastaví");
  await vytvorNamitku({
    videoId: video.id,
    kontakt: "autor@priklad.cz",
    jeAutor: "ano",
    text: "Jsem autor videa a se zdůvodněním nesouhlasím, viz čas 4:10.",
  });
  kontrola("stav je 'pozastaveno'", (await stav("aaaaaaaaaaa")) === "pozastaveno", await stav("aaaaaaaaaaa"));
  kontrola("zmizelo z indexu", !(await vIndexu("aaaaaaaaaaa")));

  sekce("8) Zamítnutá námitka značku vrátí");
  const [prvniNamitka] = await db.select().from(namitky);
  await vyridNamitku(prvniNamitka.id, "zamitnout", "Námitka se netýká faktické správnosti obsahu.");
  kontrola("stav je zpátky 'overeno'", (await stav("aaaaaaaaaaa")) === "overeno", await stav("aaaaaaaaaaa"));

  sekce("9) Námitka, které se vyhoví, značku odebere natrvalo");
  await vytvorNamitku({
    videoId: video.id,
    kontakt: "ucitel@skola.cz",
    jeAutor: "ne",
    text: "V čase 7:30 je tvrzení, které je v rozporu se současným konsenzem.",
  });
  const namitkyVse = await db.select().from(namitky);
  const druhaNamitka = namitkyVse.find((n) => n.stav === "nova")!;
  await vyridNamitku(druhaNamitka.id, "vyhovet", "Souhlasím s námitkou, značka se odebírá.");
  kontrola("stav je 'odmitnuto'", (await stav("aaaaaaaaaaa")) === "odmitnuto", await stav("aaaaaaaaaaa"));

  sekce("10) Po vyhovění námitce kladná recenze značku NEVRÁTÍ");
  await ulozRecenzi({
    videoId: video.id,
    recenzentId: fyzik.id,
    verdikt: "odpovida",
    obor: "fyzika",
    zduvodneni: "Po znovupřečtení si za svým původním posudkem stojím.",
    zdroje: null,
  });
  kontrola("stav zůstal 'odmitnuto'", (await stav("aaaaaaaaaaa")) === "odmitnuto", await stav("aaaaaaaaaaa"));

  sekce("11) Negativní verdikt se nikde nezveřejní");
  const plocha = await pridejVideo({
    youtubeId: "bbbbbbbbbbb",
    nazev: "Plochá Země — důkazy, které vám zatajili",
    obor: "fyzika",
    uroven: "vse",
    kanalId: null,
    kanalNazev: "Kanál",
    pridal: "admin",
  });
  await ulozRecenzi({
    videoId: plocha.id,
    recenzentId: fyzik.id,
    verdikt: "neodpovida",
    obor: "fyzika",
    zduvodneni: "Video odporuje konsenzu prakticky v celém rozsahu.",
    zdroje: null,
  });
  kontrola("stav je 'odmitnuto'", (await stav("bbbbbbbbbbb")) === "odmitnuto", await stav("bbbbbbbbbbb"));
  kontrola("NENÍ v indexu", !(await vIndexu("bbbbbbbbbbb")));

  sekce("12) Přírůstkový index vrací i to, co značku ztratilo");
  const verzePred = (await indexData()).verze;
  const fotosynteza = await pridejVideo({
    youtubeId: "ccccccccccc",
    nazev: "Fotosyntéza za pět minut",
    obor: "biologie",
    uroven: "zs2",
    kanalId: null,
    kanalNazev: "Kanál",
    pridal: "admin",
  });
  await ulozRecenzi({
    videoId: fotosynteza.id,
    recenzentId: biolog.id,
    verdikt: "odpovida",
    obor: "biologie",
    zduvodneni: "Zjednodušené, ale nic z toho, co tam je, není nesprávné.",
    zdroje: null,
  });
  const diff = await indexData(verzePred);
  kontrola(
    "diff obsahuje nové ověřené video",
    diff.videa.some((v) => v.youtubeId === "ccccccccccc" && v.stav === "overeno"),
  );
  kontrola("diff má vyšší verzi", diff.verze > verzePred, `${diff.verze} vs ${verzePred}`);

  const verzePredOdebranim = (await indexData()).verze;
  await rozhodniORecenzentovi(biolog.id, "pozastaven", "test");
  const diffPoOdebrani = await indexData(verzePredOdebranim);
  kontrola(
    "diff po odebrání nese video s neověřeným stavem (rozšíření si ho smaže)",
    diffPoOdebrani.videa.some(
      (v) => v.youtubeId === "ccccccccccc" && v.stav !== "overeno",
    ),
    JSON.stringify(diffPoOdebrani.videa),
  );

  sekce("13) Kanál je v indexu včetně přezdívky");
  await pridejKanal({
    youtubeId: "UCsXVk37bltHxD1rDPwtNM8Q",
    prezdivka: "@kurzgesagt",
    nazev: "Kurzgesagt",
    obor: "biologie",
    poznamka: "Dlouhodobě drží úroveň, zdroje uvádí v popisu.",
    stav: "overeno",
  });
  const sKanalem = await indexData();
  kontrola(
    "kanál je v indexu i s přezdívkou (bez ní by značka ve feedu nefungovala)",
    sKanalem.kanaly.some(
      (k) => k.youtubeId === "UCsXVk37bltHxD1rDPwtNM8Q" && k.prezdivka === "@kurzgesagt",
    ),
  );

  sekce("14) Verze indexu roste");
  const [citac] = await db.execute<{ hodnota: number }>(
    sql`SELECT hodnota FROM citac_verze WHERE id = 1`,
  ).then((r) => r.rows);
  kontrola("čítač verzí je nad nulou", Number(citac?.hodnota ?? 0) > 0, JSON.stringify(citac));

  console.log(`\n${"═".repeat(56)}`);
  console.log(`prošlo: ${proslo}    padlo: ${padlo}`);
  process.exit(padlo === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\nTest spadl:", error);
  process.exit(1);
});
