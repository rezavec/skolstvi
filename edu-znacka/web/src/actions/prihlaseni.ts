"use server";

import { redirect } from "next/navigation";
import { vytvorToken } from "@/db/queries";
import { errorState, formValues, type FormState } from "@/lib/form-state";
import {
  academicDomainsLabel,
  createToken,
  isAcademicEmailDomain,
  magicLinkUrl,
  tokenExpiry,
} from "@/lib/magic-link";
import { sendMail } from "@/lib/mail";
import { mailPrihlasovaciOdkaz } from "@/lib/mail-templates";
import { clientIp, zkontrolujRateLimit } from "@/lib/rate-limit";
import { clearRecenzentSession } from "@/lib/session";
import { fieldErrors, prihlasenSchema } from "@/lib/validation";

/**
 * Odeslání přihlašovacího odkazu.
 *
 * Tohle je jediné místo, kam může kdokoli z internetu poslat POST a nechat
 * aplikaci odeslat e-mail, takže je ošetřené poctivě:
 *
 *  • doména musí být akademická (`isAcademicEmailDomain` — rovnost nebo
 *    pravá subdoména, nikdy pouhé „končí na“)
 *  • rate limit 5 odkazů na adresu a 20 na IP za hodinu
 *  • token je 32 náhodných bajtů, v databázi jen jeho SHA-256 hash,
 *    jednorázový, platnost 30 minut
 *
 * Odpověď je **vždycky stejná**, ať adresa v databázi je, nebo není.
 * Jinak by se formulář dal použít ke zjištění, kdo je recenzent.
 */
export async function posliOdkaz(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = prihlasenSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return errorState("Zkontroluj prosím adresu.", {
      errors: fieldErrors(parsed.error),
      values: formValues(formData),
    });
  }

  const { email } = parsed.data;

  if (!isAcademicEmailDomain(email)) {
    return errorState(
      `Odkaz umíme poslat jen na akademickou adresu (${academicDomainsLabel()}). ` +
        "Pokud působíš na instituci, která tu není, napiš nám — přidáme ji, " +
        "nebo tě přihlásíme ručně.",
      { errors: { email: "Doména není v seznamu." }, values: formValues(formData) },
    );
  }

  const ip = await clientIp();
  const limit = await zkontrolujRateLimit(email, ip);
  if (!limit.povoleno) {
    return errorState(limit.duvod, { values: formValues(formData) });
  }

  const { token, tokenHash } = createToken();
  await vytvorToken({ tokenHash, email, ip, expiresAt: tokenExpiry() });

  const odeslano = await sendMail(mailPrihlasovaciOdkaz(email, magicLinkUrl(token)));
  if (!odeslano.ok) {
    return errorState(
      "E-mail se nepodařilo odeslat. Zkus to prosím za chvíli znovu.",
      { values: formValues(formData) },
    );
  }

  return {
    status: "success",
    message:
      `Poslali jsme odkaz na ${email}. Platí 30 minut a dá se použít jednou. ` +
      "Pokud nepřijde, zkontroluj spam.",
  };
}

export async function odhlasRecenzenta(): Promise<void> {
  await clearRecenzentSession();
  redirect("/");
}
