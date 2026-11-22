/**
 * Obory, úrovně, stavy a verdikty na jednom místě.
 *
 * V databázi jsou anglické (nebo bezdiakritické) slugy, v UI české labely.
 * Kdyby se měly texty měnit, mění se jen tady — a díky `as const`
 * + odvozeným typům TypeScript pohlídá, že se nikde nepoužije hodnota,
 * která neexistuje.
 *
 * Pozor: slugy oborů se posílají do rozšíření v indexu (jako indexy
 * do pole `obory`), takže **se nesmí přejmenovávat ani přeřazovat**.
 * Nový obor se přidává na konec. Viz `src/lib/index-dat.ts`.
 */

export const OBORY = {
  fyzika: "Fyzika",
  chemie: "Chemie",
  biologie: "Biologie",
  matematika: "Matematika",
  informatika: "Informatika",
  astronomie: "Astronomie",
  geologie: "Geologie a klima",
  dejepis: "Dějepis",
  zemepis: "Zeměpis",
  medicina: "Medicína a zdraví",
  psychologie: "Psychologie",
  ekonomie: "Ekonomie",
  lingvistika: "Lingvistika",
} as const;

export type Obor = keyof typeof OBORY;

/**
 * Pevné pořadí oborů pro index.
 *
 * `Object.keys` u objektového literálu pořadí drží, ale spoléhat se na to
 * u věci, která jde po drátě do rozšíření, je zbytečné riziko.
 */
export const OBORY_PORADI: Obor[] = [
  "fyzika",
  "chemie",
  "biologie",
  "matematika",
  "informatika",
  "astronomie",
  "geologie",
  "dejepis",
  "zemepis",
  "medicina",
  "psychologie",
  "ekonomie",
  "lingvistika",
];

export function jeObor(value: string): value is Obor {
  return Object.hasOwn(OBORY, value);
}

export function oborLabel(slug: string): string {
  return jeObor(slug) ? OBORY[slug] : slug;
}

// ── Úroveň, pro kterou je video vhodné ──────────────────────────────────────

/**
 * Nejde o „obtížnost obsahu“, ale o to, komu se dá video pustit.
 * Správnost je podmínka u všech úrovní stejně — tohle je jen zařazení.
 */
export const UROVNE = {
  zs2: { label: "2. stupeň ZŠ", poradi: 1 },
  ss: { label: "Střední škola", poradi: 2 },
  vs: { label: "Vysoká škola a dál", poradi: 3 },
  vse: { label: "Pro kohokoli", poradi: 4 },
} as const;

export type Uroven = keyof typeof UROVNE;

export function jeUroven(value: string): value is Uroven {
  return Object.hasOwn(UROVNE, value);
}

export const UROVNE_PORADI: Uroven[] = ["zs2", "ss", "vs", "vse"];

// ── Stav videa ──────────────────────────────────────────────────────────────

/**
 * `overeno` je jediný stav, který se dostane do indexu a na veřejnost.
 *
 * `odmitnuto` znamená, že recenzent video přečetl a značku mu nedal.
 * Takové video se **nikde nezveřejňuje** — ani v katalogu, ani v indexu,
 * ani jako „neprošlo“. Důvod je v README: tvrzení „tohle video je špatně“
 * o jmenovaném autorovi je zásah do jeho dobré pověsti. Stav tu je jen
 * proto, aby druhý recenzent nedělal stejnou práci dvakrát.
 */
export const STAVY_VIDEA = {
  ceka: { label: "Čeká na recenzi", verejne: false },
  overeno: { label: "Ověřeno", verejne: true },
  pozastaveno: { label: "Pozastaveno (námitka)", verejne: false },
  odmitnuto: { label: "Značka neudělena", verejne: false },
} as const;

export type StavVidea = keyof typeof STAVY_VIDEA;

/** Stavy, které vidí rozšíření a katalog. */
export const VEREJNE_STAVY_VIDEA: StavVidea[] = ["overeno"];

// ── Stav kanálu ─────────────────────────────────────────────────────────────

export const STAVY_KANALU = {
  ceka: { label: "Neschváleno", verejne: false },
  overeno: { label: "Důvěryhodný kanál", verejne: true },
  pozastaveno: { label: "Pozastaveno", verejne: false },
} as const;

export type StavKanalu = keyof typeof STAVY_KANALU;

// ── Stav recenzenta ─────────────────────────────────────────────────────────

export const STAVY_RECENZENTA = {
  ceka: { label: "Čeká na schválení" },
  schvalen: { label: "Schválen" },
  zamitnut: { label: "Zamítnut" },
  pozastaven: { label: "Pozastaven" },
} as const;

export type StavRecenzenta = keyof typeof STAVY_RECENZENTA;

// ── Verdikt recenze ─────────────────────────────────────────────────────────

export const VERDIKTY = {
  odpovida: {
    label: "Odpovídá konsenzu",
    /** Jen tenhle verdikt vede ke značce. */
    znacka: true,
  },
  neodpovida: {
    label: "Neodpovídá — značku nedávat",
    znacka: false,
  },
} as const;

export type Verdikt = keyof typeof VERDIKTY;

export function jeVerdikt(value: string): value is Verdikt {
  return Object.hasOwn(VERDIKTY, value);
}

// ── Stav námitky ────────────────────────────────────────────────────────────

export const STAVY_NAMITKY = {
  nova: { label: "Nová", otevrena: true },
  vyresena: { label: "Vyřešena — značka odebrána", otevrena: false },
  zamitnuta: { label: "Zamítnuta — značka zůstává", otevrena: false },
} as const;

export type StavNamitky = keyof typeof STAVY_NAMITKY;

/** Námitky, které blokují značku. */
export const OTEVRENE_NAMITKY: StavNamitky[] = ["nova"];

// ── Po jaké době nabídnout re-recenzi ───────────────────────────────────────

/**
 * Konsenzus se posouvá a video se dá po nahrání zkrátit, takže značka
 * není navždy. Po téhle době administrace video nabídne k novému přečtení.
 */
export const RERECENZE_PO_DNECH = 730;
