import { z } from "zod";
import { OBORY, UROVNE, VERDIKTY } from "./obory";
import { idVidea, rozpoznejKanal } from "./youtube";

/**
 * Validační schémata. Běží na serveru — HTML atributy `required`
 * v prohlížeči jsou jen pohodlí, Server Action se dá zavolat i přímo
 * POSTem, takže se všechno kontroluje znovu tady.
 */

/** Normalizace e-mailu: ořez a lowercase, aby Novak@ a novak@ byl jeden člověk. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Tohle nevypadá jako e-mailová adresa." }));

export const prihlasenSchema = z.object({ email: emailSchema });

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Zadej heslo."),
});

const oborEnum = z.enum(Object.keys(OBORY) as [string, ...string[]], {
  message: "Vyber obor.",
});

const urovenEnum = z.enum(Object.keys(UROVNE) as [string, ...string[]], {
  message: "Vyber, pro koho je video vhodné.",
});

// ── ORCID ───────────────────────────────────────────────────────────────────

/**
 * Kontrola ORCID iD včetně kontrolní číslice (ISO 7064 MOD 11-2).
 *
 * Formát sám by prošel i překlepu, kontrolní číslice ho zachytí. ORCID iD
 * se zveřejňuje jako odkaz, takže překlep by vedl na cizí osobu nebo nikam.
 */
export function orcidChecksumOk(orcid: string): boolean {
  const cislice = orcid.replace(/-/g, "");
  if (!/^\d{15}[\dX]$/.test(cislice)) return false;

  let zbytek = 0;
  for (const znak of cislice.slice(0, 15)) {
    zbytek = (zbytek + Number(znak)) * 2;
  }
  const kontrolni = (12 - (zbytek % 11)) % 11;
  const ocekavana = kontrolni === 10 ? "X" : String(kontrolni);

  return cislice[15] === ocekavana;
}

const orcidSchema = z
  .string()
  .trim()
  .toUpperCase()
  // vlepené z adresy orcid.org se tolerují
  .transform((v) => v.replace(/^https?:\/\/(www\.)?orcid\.org\//i, ""))
  .refine(
    (v) => v === "" || /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(v),
    "ORCID iD má tvar 0000-0002-1825-0097.",
  )
  .refine(
    (v) => v === "" || orcidChecksumOk(v),
    "Tohle ORCID iD neprošlo kontrolou — zkontroluj, jestli tam není překlep.",
  )
  .transform((v) => (v === "" ? null : v));

// ── Profil recenzenta ───────────────────────────────────────────────────────

const nepovinnyText = (max: number, chyba: string) =>
  z
    .string()
    .trim()
    .max(max, chyba)
    .transform((v) => (v.length > 0 ? v : null));

export const profilSchema = z.object({
  jmeno: z
    .string()
    .trim()
    .min(3, "Napiš celé jméno — na veřejném profilu bude takhle.")
    .max(120, "Jméno je moc dlouhé."),

  titul: nepovinnyText(60, "Titul je moc dlouhý."),

  instituce: z
    .string()
    .trim()
    .min(2, "Napiš instituci, na které působíš.")
    .max(160, "Název instituce je moc dlouhý."),

  orcid: orcidSchema,

  profilUrl: z
    .string()
    .trim()
    .max(400, "Odkaz je moc dlouhý.")
    .transform((v) => (v.length > 0 ? v : null))
    .refine(
      (v) => v === null || /^https:\/\/[^\s]+\.[^\s]+/.test(v),
      "Odkaz musí začínat https:// — podle něj se ověřuje, že na instituci opravdu působíš.",
    ),

  obory: z
    .array(oborEnum)
    .min(1, "Vyber aspoň jeden obor, ve kterém chceš recenzovat.")
    .max(4, "Čtyři obory jsou maximum — recenze má mít váhu."),

  souhlas: z
    .string()
    .optional()
    .refine(
      (v) => v === "on" || v === "true",
      "Bez souhlasu se zveřejněním jména to nejde — v tom je celá hodnota značky.",
    ),
});

// ── Recenze ─────────────────────────────────────────────────────────────────

export const recenzeSchema = z.object({
  verdikt: z.enum(Object.keys(VERDIKTY) as [string, ...string[]], {
    message: "Vyber verdikt.",
  }),
  obor: oborEnum,
  zduvodneni: z
    .string()
    .trim()
    .min(
      30,
      "Zdůvodnění napiš prosím konkrétněji (aspoň 30 znaků) — je veřejné a stojí na něm důvěra ve značku.",
    )
    .max(5000, "Zdůvodnění je moc dlouhé."),
  zdroje: nepovinnyText(2000, "Zdroje jsou moc dlouhé."),
});

// ── Přidání videa (správce i recenzent) ─────────────────────────────────────

export const videoSchema = z.object({
  /** Cokoli, co obsahuje ID videa — odkaz i samotné ID. */
  odkaz: z
    .string()
    .trim()
    .min(1, "Vlož odkaz na video.")
    .transform((v) => idVidea(v))
    .refine(
      (v): v is string => v !== null,
      "Z tohohle se nedá vyčíst ID videa. Vlož odkaz ve tvaru https://www.youtube.com/watch?v=…",
    ),
  obor: oborEnum,
  uroven: urovenEnum,
});

export const kanalSchema = z.object({
  odkaz: z
    .string()
    .trim()
    .min(1, "Vlož odkaz na kanál.")
    .transform((v) => rozpoznejKanal(v))
    .refine(
      (v): v is { youtubeId?: string; prezdivka?: string } => v !== null,
      "Z tohohle se nedá vyčíst kanál. Vlož odkaz ve tvaru https://www.youtube.com/@nazev nebo /channel/UC…",
    ),
  nazev: z
    .string()
    .trim()
    .min(2, "Napiš název kanálu.")
    .max(160, "Název je moc dlouhý."),
  obor: oborEnum,
  poznamka: nepovinnyText(
    2000,
    "Poznámka je moc dlouhá.",
  ),
});

// ── Námitka ─────────────────────────────────────────────────────────────────

export const namitkaSchema = z.object({
  youtubeId: z
    .string()
    .trim()
    .transform((v) => idVidea(v))
    .refine((v): v is string => v !== null, "Neznámé video."),
  kontakt: emailSchema,
  jeAutor: z
    .string()
    .optional()
    .transform((v) => (v === "on" || v === "true" ? "ano" : "ne")),
  text: z
    .string()
    .trim()
    .min(
      30,
      "Napiš prosím konkrétně, co je ve videu špatně (aspoň 30 znaků) — obecná námitka se nedá vyřídit.",
    )
    .max(5000, "Text je moc dlouhý."),
});

// ── Vyřízení v administraci ─────────────────────────────────────────────────

export const rozhodnutiRecenzentaSchema = z.object({
  recenzentId: z.coerce.number().int().positive(),
  rozhodnuti: z.enum(["schvalit", "zamitnout", "pozastavit", "obnovit"]),
  duvod: nepovinnyText(2000, "Důvod je moc dlouhý."),
});

export const vyrizeniNamitkySchema = z.object({
  namitkaId: z.coerce.number().int().positive(),
  rozhodnuti: z.enum(["vyhovet", "zamitnout"]),
  vyrizeni: z
    .string()
    .trim()
    .min(10, "Napiš, jak se námitka vyřídila — posílá se namítajícímu.")
    .max(5000, "Text je moc dlouhý."),
});

/** Filtry katalogu. Chybná hodnota se ignoruje, ne aby stránka spadla. */
export const katalogFiltrSchema = z.object({
  obor: oborEnum.optional().catch(undefined),
  uroven: urovenEnum.optional().catch(undefined),
  hledat: z.string().trim().max(100).optional().catch(undefined),
  strana: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
});

/** Posbírá chyby ze zod výsledku do mapy pole → první chybová zpráva. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    result[key] ??= issue.message;
  }
  return result;
}
