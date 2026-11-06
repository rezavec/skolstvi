import { z } from "zod";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from "./statuses";

/**
 * Validační schémata. Běží na serveru — HTML atributy `required` v prohlížeči
 * jsou jen pohodlí, Server Action se dá zavolat i přímo POSTem, takže
 * se všechno kontroluje znovu tady.
 */

/** Normalizace e-mailu: ořez a lowercase, aby Novak@ a novak@ byl jeden člověk. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Tohle nevypadá jako e-mailová adresa." }));

export const loginSchema = z.object({
  email: emailSchema,
});

export const createTicketSchema = z.object({
  requesterName: z
    .string()
    .trim()
    .max(100, "Jméno je moc dlouhé.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),

  location: z
    .string()
    .trim()
    .min(1, "Napiš, kde to je — číslo třídy, kabinet, sborovna.")
    .max(100, "Místo je moc dlouhé."),

  category: z.enum(
    Object.keys(TICKET_CATEGORIES) as [string, ...string[]],
    { message: "Vyber kategorii." },
  ),

  priority: z.enum(
    Object.keys(TICKET_PRIORITIES) as [string, ...string[]],
    { message: "Vyber, jak to spěchá." },
  ),

  title: z
    .string()
    .trim()
    .min(3, "Napiš krátce, o co jde (aspoň 3 znaky).")
    .max(150, "Nadpis je moc dlouhý — podrobnosti patří do popisu."),

  description: z
    .string()
    .trim()
    .min(10, "Popiš to prosím trochu podrobněji (aspoň 10 znaků).")
    .max(5000, "Popis je moc dlouhý."),
});

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Komentář je prázdný.")
    .max(5000, "Komentář je moc dlouhý."),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Zadej heslo."),
});

export const statusChangeSchema = z
  .object({
    status: z.enum(
      Object.keys(TICKET_STATUSES) as [string, ...string[]],
      { message: "Neznámý stav." },
    ),
    resolution: z
      .string()
      .trim()
      .max(5000, "Text je moc dlouhý.")
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    timeSpentMinutes: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null))
      .pipe(
        z
          .string()
          .regex(/^\d{1,4}$/, "Čas zadej jako celé číslo minut (max 4 číslice).")
          .nullable(),
      )
      .transform((v) => (v === null ? null : Number(v))),
  })
  // Smysl celé aplikace je mít doložené, co se udělalo — tak si to vynucujeme.
  .refine(
    (data) =>
      (data.status !== "done" && data.status !== "rejected") ||
      (data.resolution !== null && data.resolution.length >= 3),
    {
      path: ["resolution"],
      message:
        "Při uzavírání vyplň, co se s tím udělalo — kvůli tomu je tenhle systém vedený.",
    },
  );

/** Datum ve formátu z <input type="date">, nepovinné. */
export const dateRangeSchema = z.object({
  from: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  to: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
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
