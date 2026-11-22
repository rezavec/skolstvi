import "server-only";
import { env } from "@/lib/env";
import { sendViaConsole } from "./console";
import { sendViaResend } from "./resend";

export type Mail = {
  to: string;
  subject: string;
  /** Textová verze. Posílá se vždy — některé školní klienty HTML nezobrazí. */
  text: string;
  html?: string;
};

/**
 * Odešle e-mail podle nastaveného MAIL_DRIVER.
 *
 * Driver `console` nic neposílá — vypíše mail do terminálu a uloží ho do
 * .dev-mail/, takže se celý flow dá projít a otestovat bez Resendu a bez DNS.
 * Driver `resend` posílá doopravdy.
 *
 * Chyba odeslání se úmyslně NEPROPAGUJE dál: když spadne pošta, nemá kvůli
 * tomu spadnout celá akce (třeba založení tiketu). Volající se o výsledku
 * dozví z návratové hodnoty.
 */
export async function sendMail(mail: Mail): Promise<{ ok: boolean; error?: string }> {
  try {
    if (env.mailDriver === "resend") {
      await sendViaResend(mail);
    } else {
      await sendViaConsole(mail);
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mail] Odeslání na ${mail.to} selhalo:`, message);
    return { ok: false, error: message };
  }
}
