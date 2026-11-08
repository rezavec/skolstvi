import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import type { Mail } from "./index";

let client: Resend | undefined;

/** Odeslání přes Resend API. Klient se vytváří líně, až je potřeba. */
export async function sendViaResend(mail: Mail): Promise<void> {
  client ??= new Resend(env.resendApiKey);

  const { error } = await client.emails.send({
    from: env.mailFrom,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    ...(mail.html ? { html: mail.html } : {}),
  });

  if (error) {
    // Nejčastější příčina: doména v MAIL_FROM není v Resendu ověřená.
    throw new Error(`Resend odmítl odeslat: ${error.message ?? String(error)}`);
  }
}
