"use server";

import { redirect } from "next/navigation";
import {
  createMagicToken,
  deleteExpiredTokens,
} from "@/db/queries";
import {
  allowedDomainsLabel,
  createToken,
  isAllowedEmailDomain,
  magicLinkUrl,
  TOKEN_VALID_MINUTES,
  tokenExpiry,
} from "@/lib/magic-link";
import { magicLinkMail } from "@/lib/mail-templates";
import { sendMail } from "@/lib/mail";
import { checkLoginRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  clearRequesterSession,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/session";
import { adminLoginSchema, fieldErrors, loginSchema } from "@/lib/validation";
import {
  errorState,
  formValues,
  type FormState,
} from "@/lib/form-state";

/**
 * Pošle přihlašovací odkaz na školní e-mail.
 *
 * Tohle je jediná akce, kterou může spustit kdokoli z internetu a která
 * odesílá e-mail, takže postupuje v tomto pořadí:
 *   1. je to vůbec e-mail,
 *   2. je na povolené školní doméně,
 *   3. neposlali jsme na ni už pět odkazů za hodinu,
 *   a teprve pak se něco odešle.
 */
export async function requestMagicLink(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);

  const parsed = loginSchema.safeParse({ email: values.email ?? "" });
  if (!parsed.success) {
    return errorState("Zkontroluj prosím zadanou adresu.", {
      errors: fieldErrors(parsed.error),
      values,
    });
  }

  const email = parsed.data.email;

  if (!isAllowedEmailDomain(email)) {
    return errorState(
      `Tikety může zadávat jen někdo se školní adresou (${allowedDomainsLabel()}). Pokud školní adresu nemáš, řekni mi o závadě osobně.`,
      { errors: { email: "Adresa není na školní doméně." }, values },
    );
  }

  const ip = await getClientIp();
  const limit = await checkLoginRateLimit(email, ip);
  if (!limit.allowed) {
    return errorState(limit.reason, { values });
  }

  const { token, tokenHash } = createToken();
  await createMagicToken({
    tokenHash,
    email,
    ip,
    expiresAt: tokenExpiry(),
  });

  const result = await sendMail(
    magicLinkMail({
      to: email,
      link: magicLinkUrl(token),
      validMinutes: TOKEN_VALID_MINUTES,
    }),
  );

  if (!result.ok) {
    return errorState(
      "Odkaz se nepodařilo odeslat — pošta teď nefunguje. Zkus to prosím za chvíli znovu, nebo mi o závadě řekni osobně.",
      { values },
    );
  }

  // příležitostný úklid starých tokenů, ať tabulka neroste bez konce
  if (Math.random() < 0.05) {
    await deleteExpiredTokens().catch(() => {});
  }

  return {
    status: "success",
    message: email,
  };
}

/** Odhlášení žadatele. */
export async function logout(): Promise<void> {
  await clearRequesterSession();
  redirect("/");
}

/** Přihlášení správce IT heslem. */
export async function adminLogin(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = adminLoginSchema.safeParse({
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return errorState("Zadej heslo.");
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    // Záměrně nerozlišujeme „špatné heslo“ a cokoli jiného.
    return errorState("Nesprávné heslo.");
  }

  await setAdminSession();
  redirect("/admin");
}
