import "server-only";
import { and, asc, desc, eq, gt, ilike, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "./index";
import {
  kanaly,
  magicTokens,
  namitky,
  recenze,
  recenzenti,
  videa,
} from "./schema";
import type { Kanal, Recenzent, Recenze, Video } from "./schema";
import { dalsiVerze } from "@/lib/verze";
import { RERECENZE_PO_DNECH } from "@/lib/obory";

/**
 * Všechny databázové dotazy.
 *
 * Záměrně na jednom místě: když se mění schéma nebo se hledá, kde se bere
 * nějaké číslo, je to tady a nikde jinde. Stránky a akce si odsud jen berou
 * hotové výsledky.
 */

type Transakce = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Spojeni = typeof db | Transakce;

// ════════════════════════════════════════════════════════════════════════════
// Přihlašovací tokeny
// ════════════════════════════════════════════════════════════════════════════

const HODINA = sql`now() - interval '1 hour'`;

export async function pocetTokenuPodleEmailu(email: string): Promise<number> {
  const [row] = await db
    .select({ pocet: sql<number>`count(*)::int` })
    .from(magicTokens)
    .where(and(eq(magicTokens.email, email), gt(magicTokens.createdAt, HODINA)));
  return row?.pocet ?? 0;
}

export async function pocetTokenuPodleIp(ip: string): Promise<number> {
  const [row] = await db
    .select({ pocet: sql<number>`count(*)::int` })
    .from(magicTokens)
    .where(and(eq(magicTokens.ip, ip), gt(magicTokens.createdAt, HODINA)));
  return row?.pocet ?? 0;
}

export async function vytvorToken(data: {
  tokenHash: string;
  email: string;
  ip: string | null;
  expiresAt: Date;
}): Promise<void> {
  await db.insert(magicTokens).values(data);
}

/**
 * Spotřebuje token a vrátí e-mail, pro který byl vystavený.
 *
 * Jediný atomický UPDATE — podmínka „ještě nepoužitý a neprošlý“ je součástí
 * WHERE, takže dvě souběžná kliknutí na odkaz nemůžou projít obě. Druhé
 * nenajde řádek a vrátí null.
 */
export async function spotrebujToken(tokenHash: string): Promise<string | null> {
  const [row] = await db
    .update(magicTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(magicTokens.tokenHash, tokenHash),
        isNull(magicTokens.usedAt),
        gt(magicTokens.expiresAt, sql`now()`),
      ),
    )
    .returning({ email: magicTokens.email });

  return row?.email ?? null;
}

// ════════════════════════════════════════════════════════════════════════════
// Recenzenti
// ════════════════════════════════════════════════════════════════════════════

export async function najdiRecenzentaPodleId(
  id: number,
): Promise<Recenzent | undefined> {
  const [row] = await db.select().from(recenzenti).where(eq(recenzenti.id, id));
  return row;
}

export async function najdiRecenzentaPodleEmailu(
  email: string,
): Promise<Recenzent | undefined> {
  const [row] = await db
    .select()
    .from(recenzenti)
    .where(eq(recenzenti.email, email));
  return row;
}

/**
 * Najde recenzenta podle e-mailu, nebo založí nový prázdný záznam ve stavu
 * `ceka`. Volá se po kliknutí na magic link — profil pak doplní sám.
 *
 * Slug se odvozuje až z vyplněného jména, zatím je to náhradní hodnota
 * podle id.
 */
export async function najdiNeboZalozRecenzenta(
  email: string,
): Promise<Recenzent> {
  const existujici = await najdiRecenzentaPodleEmailu(email);
  if (existujici) return existujici;

  const [novy] = await db
    .insert(recenzenti)
    .values({
      email,
      slug: `neznamy-${Date.now().toString(36)}`,
      jmeno: "",
      instituce: "",
      obory: [],
      stav: "ceka",
    })
    .returning();

  return novy;
}

/** Volný slug: `jan-novak`, při kolizi `jan-novak-2`, `jan-novak-3`… */
export async function volnySlug(jmeno: string, vlastniId: number): Promise<string> {
  const zaklad =
    jmeno
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "recenzent";

  const obsazene = await db
    .select({ slug: recenzenti.slug, id: recenzenti.id })
    .from(recenzenti)
    .where(ilike(recenzenti.slug, `${zaklad}%`));

  const cizi = new Set(
    obsazene.filter((r) => r.id !== vlastniId).map((r) => r.slug),
  );

  if (!cizi.has(zaklad)) return zaklad;
  for (let i = 2; i < 1000; i++) {
    if (!cizi.has(`${zaklad}-${i}`)) return `${zaklad}-${i}`;
  }
  return `${zaklad}-${Date.now().toString(36)}`;
}

export async function ulozProfil(
  id: number,
  data: {
    jmeno: string;
    titul: string | null;
    instituce: string;
    orcid: string | null;
    profilUrl: string | null;
    obory: string[];
    slug: string;
  },
): Promise<void> {
  await db
    .update(recenzenti)
    .set({ ...data, souhlasZverejneni: new Date() })
    .where(eq(recenzenti.id, id));
}

export async function recenzentiPodleStavu(stav: string): Promise<Recenzent[]> {
  return db
    .select()
    .from(recenzenti)
    .where(eq(recenzenti.stav, stav))
    .orderBy(asc(recenzenti.createdAt));
}

/**
 * Žádosti, které se dají vyřídit — tedy ty s vyplněným profilem.
 *
 * Prázdné záznamy (někdo klikl na odkaz a profil nedokončil) ve frontě
 * jen překážejí.
 */
export async function zadostiKVyrizeni(): Promise<Recenzent[]> {
  return db
    .select()
    .from(recenzenti)
    .where(
      and(eq(recenzenti.stav, "ceka"), sql`${recenzenti.jmeno} <> ''`),
    )
    .orderBy(asc(recenzenti.createdAt));
}

export async function vsichniRecenzenti(): Promise<Recenzent[]> {
  return db
    .select()
    .from(recenzenti)
    .orderBy(asc(recenzenti.stav), asc(recenzenti.jmeno));
}

/**
 * Rozhodnutí správce o recenzentovi.
 *
 * Změna stavu může vzít značku videím, která ten recenzent podepsal (když
 * se pozastaví nebo zamítne), nebo ji naopak vrátit — proto se všem jeho
 * videím přepočítá stav. Jinak by po pozastavení recenzenta zůstaly jeho
 * značky v indexu dál.
 */
export async function rozhodniORecenzentovi(
  id: number,
  stav: "schvalen" | "zamitnut" | "pozastaven",
  duvod: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(recenzenti)
      .set({
        stav,
        duvod,
        schvalenoAt: stav === "schvalen" ? new Date() : null,
      })
      .where(eq(recenzenti.id, id));

    const dotcena = await tx
      .select({ videoId: recenze.videoId })
      .from(recenze)
      .where(eq(recenze.recenzentId, id));

    for (const { videoId } of dotcena) {
      await prepocitejStavVidea(tx, videoId);
    }
  });
}

/** Veřejný profil: recenzent + jeho **kladné** recenze s videi. */
export async function verejnyProfil(slug: string): Promise<
  | {
      recenzent: Recenzent;
      recenze: { recenze: Recenze; video: Video }[];
    }
  | null
> {
  const [recenzent] = await db
    .select()
    .from(recenzenti)
    .where(and(eq(recenzenti.slug, slug), eq(recenzenti.stav, "schvalen")));

  if (!recenzent) return null;

  // Jen kladné recenze u videí, která značku skutečně mají. Negativní
  // verdikt se nezveřejňuje nikde — viz lib/obory.ts.
  const rows = await db
    .select({ recenze, video: videa })
    .from(recenze)
    .innerJoin(videa, eq(videa.id, recenze.videoId))
    .where(
      and(
        eq(recenze.recenzentId, recenzent.id),
        eq(recenze.verdikt, "odpovida"),
        eq(videa.stav, "overeno"),
      ),
    )
    .orderBy(desc(recenze.createdAt));

  return { recenzent, recenze: rows };
}

// ════════════════════════════════════════════════════════════════════════════
// Kanály
// ════════════════════════════════════════════════════════════════════════════

export async function najdiKanal(
  youtubeId: string,
): Promise<Kanal | undefined> {
  const [row] = await db.select().from(kanaly).where(eq(kanaly.youtubeId, youtubeId));
  return row;
}

export async function najdiKanalPodlePrezdivky(
  prezdivka: string,
): Promise<Kanal | undefined> {
  const [row] = await db
    .select()
    .from(kanaly)
    .where(eq(kanaly.prezdivka, prezdivka));
  return row;
}

export async function vsechnyKanaly(): Promise<Kanal[]> {
  return db.select().from(kanaly).orderBy(asc(kanaly.nazev));
}

export async function pridejKanal(data: {
  youtubeId: string;
  prezdivka: string | null;
  nazev: string;
  obor: string;
  poznamka: string | null;
  stav: "ceka" | "overeno";
}): Promise<Kanal> {
  return db.transaction(async (tx) => {
    const verze = await dalsiVerze(tx);
    const [row] = await tx
      .insert(kanaly)
      .values({ ...data, verze })
      .onConflictDoUpdate({
        target: kanaly.youtubeId,
        set: {
          prezdivka: data.prezdivka,
          nazev: data.nazev,
          obor: data.obor,
          poznamka: data.poznamka,
          stav: data.stav,
          verze,
        },
      })
      .returning();
    return row;
  });
}

export async function zmenStavKanalu(
  id: number,
  stav: "ceka" | "overeno" | "pozastaveno",
): Promise<void> {
  await db.transaction(async (tx) => {
    const verze = await dalsiVerze(tx);
    await tx.update(kanaly).set({ stav, verze }).where(eq(kanaly.id, id));
  });
}

// ════════════════════════════════════════════════════════════════════════════
// Videa
// ════════════════════════════════════════════════════════════════════════════

export async function najdiVideo(youtubeId: string): Promise<Video | undefined> {
  const [row] = await db.select().from(videa).where(eq(videa.youtubeId, youtubeId));
  return row;
}

export async function pridejVideo(data: {
  youtubeId: string;
  nazev: string;
  obor: string;
  uroven: string;
  kanalId: number | null;
  kanalNazev: string | null;
  pridal: string;
}): Promise<Video> {
  return db.transaction(async (tx) => {
    const verze = await dalsiVerze(tx);
    const [row] = await tx
      .insert(videa)
      .values({ ...data, verze, stav: "ceka" })
      .onConflictDoUpdate({
        target: videa.youtubeId,
        // Existující video se nepřepisuje celé — jen se doplní metadata.
        // Stav a značka patří recenzím, ne formuláři.
        set: {
          nazev: data.nazev,
          obor: data.obor,
          uroven: data.uroven,
          kanalId: data.kanalId,
          kanalNazev: data.kanalNazev,
          verze,
        },
      })
      .returning();

    // Obor se mohl změnit, čímž mohly přestat (nebo začít) platit recenze.
    await prepocitejStavVidea(tx, row.id);
    return row;
  });
}

/**
 * ★ Pravidlo značky ★
 *
 * Tohle je jádro celého projektu. Stav videa se **nikdy nenastavuje ručně** —
 * vždy se spočítá odsud, ze recenzí a námitek. Díky tomu nemůže vzniknout
 * značka, ke které by neexistoval podepsaný důvod.
 *
 * Značka vznikne, právě když platí všechno:
 *   • existuje recenze s verdiktem „odpovídá“
 *   • od recenzenta ve stavu `schvalen`
 *   • z oboru, který se rovná oboru videa
 *   • a ten obor je zároveň mezi obory recenzenta
 *   • na videu není otevřená námitka
 *   • značka nebyla odebrána po vyhovění námitce
 *
 * Volá se po každé změně, která může kterýkoli z těch bodů ovlivnit:
 * nová recenze, rozhodnutí o recenzentovi, námitka, změna oboru videa.
 * Vždy **v transakci** se změnou, která ji vyvolala.
 */
export async function prepocitejStavVidea(
  tx: Spojeni,
  videoId: number,
): Promise<void> {
  const [video] = await tx.select().from(videa).where(eq(videa.id, videoId));
  if (!video) return;

  const [kladne] = await tx
    .select({ pocet: sql<number>`count(*)::int` })
    .from(recenze)
    .innerJoin(recenzenti, eq(recenzenti.id, recenze.recenzentId))
    .where(
      and(
        eq(recenze.videoId, videoId),
        eq(recenze.verdikt, "odpovida"),
        eq(recenzenti.stav, "schvalen"),
        // obor recenze == obor videa
        eq(recenze.obor, video.obor),
        // a recenzent ten obor skutečně má (mohl mu být odebrán)
        sql`${video.obor} = ANY(${recenzenti.obory})`,
      ),
    );

  const [zaporne] = await tx
    .select({ pocet: sql<number>`count(*)::int` })
    .from(recenze)
    .where(
      and(eq(recenze.videoId, videoId), eq(recenze.verdikt, "neodpovida")),
    );

  const [namitka] = await tx
    .select({ pocet: sql<number>`count(*)::int` })
    .from(namitky)
    .where(and(eq(namitky.videoId, videoId), eq(namitky.stav, "nova")));

  const maKladnou = (kladne?.pocet ?? 0) > 0;
  const maZapornou = (zaporne?.pocet ?? 0) > 0;
  const maNamitku = (namitka?.pocet ?? 0) > 0;

  let novyStav: "ceka" | "overeno" | "pozastaveno" | "odmitnuto";
  if (maNamitku) {
    // Otevřená námitka má přednost před čímkoli jiným: značka se pozastaví,
    // dokud ji správce nevyřídí.
    novyStav = "pozastaveno";
  } else if (video.znackaOdebranaAt) {
    novyStav = "odmitnuto";
  } else if (maKladnou) {
    novyStav = "overeno";
  } else if (maZapornou) {
    novyStav = "odmitnuto";
  } else {
    novyStav = "ceka";
  }

  if (novyStav === video.stav) return;

  const verze = await dalsiVerze(tx);
  await tx
    .update(videa)
    .set({
      stav: novyStav,
      verze,
      // datum prvního ověření se drží, ať je vidět, jak je značka stará
      overenoAt:
        novyStav === "overeno" ? (video.overenoAt ?? new Date()) : video.overenoAt,
    })
    .where(eq(videa.id, videoId));
}

/** Ruční zásah správce: vzít značku, nebo ji zpřístupnit zpátky. */
export async function nastavOdebraniZnacky(
  videoId: number,
  odebrat: boolean,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(videa)
      .set({ znackaOdebranaAt: odebrat ? new Date() : null })
      .where(eq(videa.id, videoId));
    await prepocitejStavVidea(tx, videoId);
  });
}

export async function zmenOborVidea(
  videoId: number,
  obor: string,
  uroven: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const verze = await dalsiVerze(tx);
    await tx.update(videa).set({ obor, uroven, verze }).where(eq(videa.id, videoId));
    await prepocitejStavVidea(tx, videoId);
  });
}

export async function oznacZkontrolovano(
  videoId: number,
  existuje: boolean,
): Promise<void> {
  if (existuje) {
    await db
      .update(videa)
      .set({ zkontrolovanoAt: new Date() })
      .where(eq(videa.id, videoId));
    return;
  }

  // Video zmizelo nebo je neveřejné — značka na něm nemá co dělat.
  await db.transaction(async (tx) => {
    const verze = await dalsiVerze(tx);
    await tx
      .update(videa)
      .set({
        stav: "odmitnuto",
        znackaOdebranaAt: new Date(),
        zkontrolovanoAt: new Date(),
        verze,
      })
      .where(eq(videa.id, videoId));
  });
}

// ── Fronty a výpisy ─────────────────────────────────────────────────────────

/**
 * Co má recenzent před sebou: videa ve jeho oborech, která ještě
 * nerecenzoval.
 *
 * `NOT EXISTS` místo `LEFT JOIN … IS NULL` — čitelnější a Postgres si
 * s ním poradí lépe.
 */
export async function videaKRecenzi(
  recenzentId: number,
  obory: string[],
): Promise<Video[]> {
  if (obory.length === 0) return [];

  return db
    .select()
    .from(videa)
    .where(
      and(
        inArray(videa.obor, obory),
        inArray(videa.stav, ["ceka", "overeno"]),
        isNull(videa.znackaOdebranaAt),
        sql`NOT EXISTS (
          SELECT 1 FROM ${recenze}
          WHERE ${recenze.videoId} = ${videa.id}
            AND ${recenze.recenzentId} = ${recenzentId}
        )`,
      ),
    )
    .orderBy(asc(videa.stav), asc(videa.createdAt))
    .limit(100);
}

export async function recenzeRecenzenta(
  recenzentId: number,
): Promise<{ recenze: Recenze; video: Video }[]> {
  return db
    .select({ recenze, video: videa })
    .from(recenze)
    .innerJoin(videa, eq(videa.id, recenze.videoId))
    .where(eq(recenze.recenzentId, recenzentId))
    .orderBy(desc(recenze.createdAt));
}

export async function najdiRecenzi(
  videoId: number,
  recenzentId: number,
): Promise<Recenze | undefined> {
  const [row] = await db
    .select()
    .from(recenze)
    .where(and(eq(recenze.videoId, videoId), eq(recenze.recenzentId, recenzentId)));
  return row;
}

/**
 * Uloží recenzi a hned přepočítá stav videa — v jedné transakci.
 *
 * Opravit svou recenzi jde (`onConflictDoUpdate`), přidat druhou k témuž
 * videu ne — na to je v schématu unikátní index.
 */
export async function ulozRecenzi(data: {
  videoId: number;
  recenzentId: number;
  verdikt: string;
  obor: string;
  zduvodneni: string;
  zdroje: string | null;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(recenze)
      .values(data)
      .onConflictDoUpdate({
        target: [recenze.videoId, recenze.recenzentId],
        set: {
          verdikt: data.verdikt,
          obor: data.obor,
          zduvodneni: data.zduvodneni,
          zdroje: data.zdroje,
          createdAt: new Date(),
        },
      });

    await prepocitejStavVidea(tx, data.videoId);
  });
}

/** Videa v administraci — všechna, včetně těch bez značky. */
export async function vsechnaVidea(limit = 300): Promise<Video[]> {
  return db.select().from(videa).orderBy(desc(videa.createdAt)).limit(limit);
}

/** Ověřená videa, kterým je značka starší než dva roky. */
export async function videaKRerecenzi(): Promise<Video[]> {
  return db
    .select()
    .from(videa)
    .where(
      and(
        eq(videa.stav, "overeno"),
        lt(
          videa.overenoAt,
          sql`now() - make_interval(days => ${RERECENZE_PO_DNECH})`,
        ),
      ),
    )
    .orderBy(asc(videa.overenoAt));
}

// ── Katalog ─────────────────────────────────────────────────────────────────

export const KATALOG_NA_STRANU = 24;

/**
 * Veřejný katalog — **jen ověřená videa.**
 *
 * `stav = 'overeno'` je tu jediná povolená hodnota. Kdyby se sem někdy
 * dostal jiný stav, zveřejnilo by to buď nerecenzovaná videa, nebo
 * (horší) negativní verdikty.
 */
export async function katalog(filtr: {
  obor?: string;
  uroven?: string;
  hledat?: string;
  strana?: number;
}): Promise<{ videa: Video[]; celkem: number; strana: number; stran: number }> {
  const strana = filtr.strana ?? 1;

  const podminky = [eq(videa.stav, "overeno")];
  if (filtr.obor) podminky.push(eq(videa.obor, filtr.obor));
  if (filtr.uroven) podminky.push(eq(videa.uroven, filtr.uroven));
  if (filtr.hledat) {
    const vzor = `%${filtr.hledat}%`;
    podminky.push(
      or(ilike(videa.nazev, vzor), ilike(videa.kanalNazev, vzor))!,
    );
  }
  const where = and(...podminky);

  const [[pocet], radky] = await Promise.all([
    db.select({ celkem: sql<number>`count(*)::int` }).from(videa).where(where),
    db
      .select()
      .from(videa)
      .where(where)
      .orderBy(desc(videa.overenoAt))
      .limit(KATALOG_NA_STRANU)
      .offset((strana - 1) * KATALOG_NA_STRANU),
  ]);

  const celkem = pocet?.celkem ?? 0;
  return {
    videa: radky,
    celkem,
    strana,
    stran: Math.max(1, Math.ceil(celkem / KATALOG_NA_STRANU)),
  };
}

/**
 * Detail videa pro veřejnost: video + kladné recenze s jejich recenzenty.
 *
 * Negativní recenze se nevrací **nikdy**, ani správci přes tuhle funkci —
 * ten na ně má vlastní dotaz v administraci.
 */
export async function detailVidea(youtubeId: string): Promise<
  | {
      video: Video;
      kanal: Kanal | null;
      recenze: { recenze: Recenze; recenzent: Recenzent }[];
      /** Je značka starší než RERECENZE_PO_DNECH? */
      staraZnacka: boolean;
    }
  | null
> {
  const video = await najdiVideo(youtubeId);
  if (!video) return null;

  const [kanal] = video.kanalId
    ? await db.select().from(kanaly).where(eq(kanaly.id, video.kanalId))
    : [undefined];

  const rows = await db
    .select({ recenze, recenzent: recenzenti })
    .from(recenze)
    .innerJoin(recenzenti, eq(recenzenti.id, recenze.recenzentId))
    .where(
      and(
        eq(recenze.videoId, video.id),
        eq(recenze.verdikt, "odpovida"),
        eq(recenzenti.stav, "schvalen"),
      ),
    )
    .orderBy(desc(recenze.createdAt));

  return {
    video,
    kanal: kanal ?? null,
    recenze: rows,
    staraZnacka: await jeZnackaStara(video.overenoAt),
  };
}

/**
 * Je značka starší, než je zdrávo?
 *
 * Čas určuje databáze, ne komponenta: `Date.now()` při renderu je nečistá
 * funkce (a React na to i upozorní) a aplikační server může mít jiný čas
 * než databáze. Takhle je zdroj pravdy jeden.
 */
async function jeZnackaStara(overenoAt: Date | null): Promise<boolean> {
  if (!overenoAt) return false;

  const [row] = await db
    .select({
      stara: sql<boolean>`${overenoAt} < now() - make_interval(days => ${RERECENZE_PO_DNECH})`,
    })
    .from(sql`(SELECT 1) AS jedna`);

  return row?.stara ?? false;
}

/** Recenze videa pro administraci — včetně negativních. */
export async function recenzeVideaProAdmina(
  videoId: number,
): Promise<{ recenze: Recenze; recenzent: Recenzent }[]> {
  return db
    .select({ recenze, recenzent: recenzenti })
    .from(recenze)
    .innerJoin(recenzenti, eq(recenzenti.id, recenze.recenzentId))
    .where(eq(recenze.videoId, videoId))
    .orderBy(desc(recenze.createdAt));
}

// ════════════════════════════════════════════════════════════════════════════
// Námitky
// ════════════════════════════════════════════════════════════════════════════

/**
 * Založí námitku a hned pozastaví značku.
 *
 * Pozastavení je úmyslně okamžité a bez posuzování: dokud se námitka
 * nevyřídí, značka na videu není. Opačné nastavení (nejdřív posoudit,
 * pak pozastavit) by znamenalo, že sporná značka svítí dál.
 */
export async function vytvorNamitku(data: {
  videoId: number;
  kontakt: string;
  jeAutor: string;
  text: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(namitky).values(data);
    await prepocitejStavVidea(tx, data.videoId);
  });
}

export async function namitkyPodleStavu(
  stav: string,
): Promise<{ namitka: typeof namitky.$inferSelect; video: Video }[]> {
  return db
    .select({ namitka: namitky, video: videa })
    .from(namitky)
    .innerJoin(videa, eq(videa.id, namitky.videoId))
    .where(eq(namitky.stav, stav))
    .orderBy(desc(namitky.jeAutor), asc(namitky.createdAt));
}

/**
 * Vyřízení námitky.
 *
 * `vyhovet` = značka se odebere natrvalo (nastaví se `znackaOdebranaAt`,
 * takže ji kladná recenze nevrátí sama).
 * `zamitnout` = značka se vrátí, protože námitka přestane být otevřená.
 */
export async function vyridNamitku(
  namitkaId: number,
  rozhodnuti: "vyhovet" | "zamitnout",
  vyrizeni: string,
): Promise<{ youtubeId: string; kontakt: string } | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(namitky)
      .set({
        stav: rozhodnuti === "vyhovet" ? "vyresena" : "zamitnuta",
        vyrizeni,
        vyrizenoAt: new Date(),
      })
      .where(and(eq(namitky.id, namitkaId), eq(namitky.stav, "nova")))
      .returning();

    if (!row) return null;

    if (rozhodnuti === "vyhovet") {
      await tx
        .update(videa)
        .set({ znackaOdebranaAt: new Date() })
        .where(eq(videa.id, row.videoId));
    }

    await prepocitejStavVidea(tx, row.videoId);

    const [video] = await tx
      .select({ youtubeId: videa.youtubeId })
      .from(videa)
      .where(eq(videa.id, row.videoId));

    return { youtubeId: video?.youtubeId ?? "", kontakt: row.kontakt };
  });
}

export async function pocetOtevrenychNamitek(): Promise<number> {
  const [row] = await db
    .select({ pocet: sql<number>`count(*)::int` })
    .from(namitky)
    .where(eq(namitky.stav, "nova"));
  return row?.pocet ?? 0;
}

// ════════════════════════════════════════════════════════════════════════════
// Index pro rozšíření
// ════════════════════════════════════════════════════════════════════════════

export type IndexRadky = {
  verze: number;
  videa: { youtubeId: string; obor: string; stav: string; pocetRecenzi: number }[];
  kanaly: { youtubeId: string; prezdivka: string | null; obor: string; stav: string }[];
};

/**
 * Data pro `/api/index`.
 *
 * Při `od = undefined` vrací jen to, co je ověřené (plný index).
 * Při `od = N` vrací **všechno změněné od verze N**, i to neověřené —
 * rozšíření si podle stavu samo smaže, co značku ztratilo. Bez toho by
 * odebraná značka v rozšíření zůstala navždy.
 */
export async function indexData(od?: number): Promise<IndexRadky> {
  const [verzeRow] = await db
    .select({
      verze: sql<number>`coalesce(greatest(
        (SELECT max(verze) FROM ${videa}),
        (SELECT max(verze) FROM ${kanaly})
      ), 0)::int`,
    })
    .from(sql`(SELECT 1) AS jedna`);

  const pocetRecenzi = sql<number>`(
    SELECT count(*)::int FROM ${recenze}
    WHERE ${recenze.videoId} = ${videa.id}
      AND ${recenze.verdikt} = 'odpovida'
  )`;

  const videaRadky = await db
    .select({
      youtubeId: videa.youtubeId,
      obor: videa.obor,
      stav: videa.stav,
      pocetRecenzi,
    })
    .from(videa)
    .where(od === undefined ? eq(videa.stav, "overeno") : gt(videa.verze, od))
    .orderBy(asc(videa.verze));

  const kanalyRadky = await db
    .select({
      youtubeId: kanaly.youtubeId,
      prezdivka: kanaly.prezdivka,
      obor: kanaly.obor,
      stav: kanaly.stav,
    })
    .from(kanaly)
    .where(od === undefined ? eq(kanaly.stav, "overeno") : gt(kanaly.verze, od))
    .orderBy(asc(kanaly.verze));

  return {
    verze: verzeRow?.verze ?? 0,
    videa: videaRadky,
    kanaly: kanalyRadky,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Statistiky
// ════════════════════════════════════════════════════════════════════════════

export async function statistiky(): Promise<{
  overenychVidei: number;
  duveryhodnychKanalu: number;
  recenzentu: number;
  recenzi: number;
}> {
  const [row] = await db
    .select({
      overenychVidei: sql<number>`(SELECT count(*)::int FROM ${videa} WHERE stav = 'overeno')`,
      duveryhodnychKanalu: sql<number>`(SELECT count(*)::int FROM ${kanaly} WHERE stav = 'overeno')`,
      recenzentu: sql<number>`(SELECT count(*)::int FROM ${recenzenti} WHERE stav = 'schvalen')`,
      recenzi: sql<number>`(SELECT count(*)::int FROM ${recenze} WHERE verdikt = 'odpovida')`,
    })
    .from(sql`(SELECT 1) AS jedna`);

  return (
    row ?? {
      overenychVidei: 0,
      duveryhodnychKanalu: 0,
      recenzentu: 0,
      recenzi: 0,
    }
  );
}

/** Obory s počtem ověřených videí — pro filtr v katalogu. */
export async function oboryVKatalogu(): Promise<{ obor: string; pocet: number }[]> {
  return db
    .select({ obor: videa.obor, pocet: sql<number>`count(*)::int` })
    .from(videa)
    .where(eq(videa.stav, "overeno"))
    .groupBy(videa.obor)
    .orderBy(desc(sql`count(*)`));
}
