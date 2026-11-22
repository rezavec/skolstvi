import { api } from "./api";

/**
 * Lokální kopie indexu ověřených videí.
 *
 * Celý index se stáhne a drží v `storage.local`. Rozhodnutí „má tohle video
 * značku?“ se tím děje **u uživatele v prohlížeči** a server se nikdy
 * nedozví, co kdo sleduje. Je to zároveň rychlejší (žádná latence) a funguje
 * to offline.
 *
 * Cena je ~300 kB při prvním stažení; pak se tahají jen přírůstky od
 * poslední verze.
 */

/** Musí souhlasit s `FORMAT_INDEXU` ve web/src/lib/index-dat.ts. */
export const PODPOROVANY_FORMAT = 1;

const KLIC = "index";

export type ZaznamVidea = [oborIndex: number, pocetRecenzi: number];

export type UlozenyIndex = {
  format: number;
  verze: number;
  /** Kdy se naposled podařilo stáhnout. ISO string. */
  stazeno: string;
  obory: string[];
  videa: Record<string, ZaznamVidea>;
  kanaly: Record<string, [oborIndex: number]>;
  prezdivky: Record<string, string>;
};

type OdpovedServeru = {
  format?: unknown;
  verze?: unknown;
  plny?: unknown;
  obory?: unknown;
  videa?: unknown;
  kanaly?: unknown;
  prezdivky?: unknown;
};

export const PRAZDNY_INDEX: UlozenyIndex = {
  format: PODPOROVANY_FORMAT,
  verze: 0,
  stazeno: "",
  obory: [],
  videa: {},
  kanaly: {},
  prezdivky: {},
};

export async function nactiIndex(): Promise<UlozenyIndex> {
  try {
    const ulozene = await api.storage.local.get(KLIC);
    const index = ulozene[KLIC] as UlozenyIndex | undefined;

    // Starší nebo novější formát, než umíme přečíst → začneme od nuly.
    // Lepší než zobrazovat značky podle dat, kterým nerozumíme.
    if (!index || index.format !== PODPOROVANY_FORMAT) return PRAZDNY_INDEX;

    return index;
  } catch {
    return PRAZDNY_INDEX;
  }
}

/**
 * Stáhne a uloží změny.
 *
 * Vrací, jestli se to povedlo — volající (pozadí) podle toho rozhodne, jestli
 * zkusí znovu dřív. Chybu nevyhazuje: když je YouTube dostupné a náš server
 * ne, má rozšíření dál fungovat se starým indexem.
 */
export async function synchronizuj(
  web: string,
): Promise<{ ok: true; verze: number; zmen: number } | { ok: false; chyba: string }> {
  const stary = await nactiIndex();

  // `od` posíláme jen když vůbec něco máme — jinak chceme plný index.
  const url =
    stary.verze > 0
      ? `${web}/api/index?od=${stary.verze}`
      : `${web}/api/index`;

  let odpoved: Response;
  try {
    odpoved = await fetch(url, {
      headers: { Accept: "application/json" },
      // Cache prohlížeče by nám vracela starý index i po nové recenzi.
      cache: "no-cache",
    });
  } catch (error) {
    return { ok: false, chyba: popisChyby(error) };
  }

  if (!odpoved.ok) {
    return { ok: false, chyba: `server odpověděl ${odpoved.status}` };
  }

  let data: OdpovedServeru;
  try {
    data = (await odpoved.json()) as OdpovedServeru;
  } catch (error) {
    return { ok: false, chyba: popisChyby(error) };
  }

  if (data.format !== PODPOROVANY_FORMAT) {
    return {
      ok: false,
      chyba:
        `server posílá formát ${String(data.format)}, rozšíření umí ` +
        `${PODPOROVANY_FORMAT} — aktualizuj rozšíření`,
    };
  }

  const novy = slucIndex(stary, data);

  try {
    await api.storage.local.set({ [KLIC]: novy });
  } catch (error) {
    // Nejčastěji vyčerpaná kvóta storage.local (výchozí limit 10 MB).
    return { ok: false, chyba: `uložení selhalo: ${popisChyby(error)}` };
  }

  const zmen =
    pocetKlicu(data.videa) + pocetKlicu(data.kanaly);

  return { ok: true, verze: novy.verze, zmen };
}

/**
 * Sloučí přírůstek do uloženého indexu.
 *
 * `null` u záznamu znamená „značku ztratilo, smaž si ho“ — bez toho by
 * odebraná značka v rozšíření zůstala navždy. Plná odpověď (`plny: true`)
 * starý obsah nahradí celý.
 */
export function slucIndex(
  stary: UlozenyIndex,
  data: OdpovedServeru,
): UlozenyIndex {
  const plny = data.plny === true;

  const videa: Record<string, ZaznamVidea> = plny ? {} : { ...stary.videa };
  const kanaly: Record<string, [number]> = plny ? {} : { ...stary.kanaly };
  const prezdivky: Record<string, string> = plny ? {} : { ...stary.prezdivky };

  for (const [id, zaznam] of Object.entries(objekt(data.videa))) {
    if (zaznam === null) delete videa[id];
    else if (Array.isArray(zaznam)) videa[id] = zaznam as ZaznamVidea;
  }

  for (const [id, zaznam] of Object.entries(objekt(data.kanaly))) {
    if (zaznam === null) {
      delete kanaly[id];
      // S kanálem musí zmizet i jeho přezdívka, jinak by ukazovala na
      // záznam, který už neexistuje.
      for (const [prezdivka, kanalId] of Object.entries(prezdivky)) {
        if (kanalId === id) delete prezdivky[prezdivka];
      }
    } else if (Array.isArray(zaznam)) {
      kanaly[id] = zaznam as [number];
    }
  }

  for (const [prezdivka, kanalId] of Object.entries(objekt(data.prezdivky))) {
    if (typeof kanalId === "string") prezdivky[prezdivka] = kanalId;
  }

  return {
    format: PODPOROVANY_FORMAT,
    verze: typeof data.verze === "number" ? data.verze : stary.verze,
    stazeno: new Date().toISOString(),
    obory: Array.isArray(data.obory) ? (data.obory as string[]) : stary.obory,
    videa,
    kanaly,
    prezdivky,
  };
}

// ── Dotazy do indexu ────────────────────────────────────────────────────────

export type Nalez =
  | { druh: "video"; obor: string | null; pocetRecenzi: number }
  | { druh: "kanal"; obor: string | null };

/** Má video vlastní značku? */
export function najdiVideo(index: UlozenyIndex, id: string): Nalez | null {
  const zaznam = index.videa[id];
  if (!zaznam) return null;

  return {
    druh: "video",
    obor: index.obory[zaznam[0]] ?? null,
    pocetRecenzi: zaznam[1] ?? 0,
  };
}

/**
 * Je kanál mezi důvěryhodnými?
 *
 * Bere ID kanálu (`UC…`) i přezdívku (`@nazev`) — ve feedu je u náhledu
 * videa často k dispozici jen ta přezdívka.
 */
export function najdiKanal(
  index: UlozenyIndex,
  idNeboPrezdivka: string,
): Nalez | null {
  const id = idNeboPrezdivka.startsWith("@")
    ? index.prezdivky[idNeboPrezdivka.toLowerCase()]
    : idNeboPrezdivka;

  if (!id) return null;

  const zaznam = index.kanaly[id];
  if (!zaznam) return null;

  return { druh: "kanal", obor: index.obory[zaznam[0]] ?? null };
}

export function pocetOverenych(index: UlozenyIndex): number {
  return Object.keys(index.videa).length;
}

export function pocetKanalu(index: UlozenyIndex): number {
  return Object.keys(index.kanaly).length;
}

function objekt(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function pocetKlicu(value: unknown): number {
  return Object.keys(objekt(value)).length;
}

function popisChyby(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
