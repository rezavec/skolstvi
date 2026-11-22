/**
 * Sdílený tvar stavu, který Server Actions vracejí do formulářů.
 *
 * `values` se posílá zpátky, aby se po chybě nevymazalo, co člověk napsal —
 * u delšího popisu závady je to rozdíl mezi „opravím to“ a „už to nebudu
 * hlásit“.
 */
export type FormState = {
  status: "idle" | "error" | "success";
  /** Chyba, která se nevztahuje ke konkrétnímu poli. */
  message?: string;
  /** Chyby jednotlivých polí: název pole → zpráva. */
  errors?: Record<string, string>;
  /** Co člověk vyplnil, pro předvyplnění formuláře po chybě. */
  values?: Record<string, string>;
};

export const idleState: FormState = { status: "idle" };

export function errorState(
  message: string,
  extra?: { errors?: Record<string, string>; values?: Record<string, string> },
): FormState {
  return { status: "error", message, ...extra };
}

/** Posbírá textová pole z FormData, aby se dala vrátit do formuláře. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}
