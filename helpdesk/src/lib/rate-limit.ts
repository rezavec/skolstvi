import "server-only";
import { headers } from "next/headers";
import {
  countRecentTokensByEmail,
  countRecentTokensByIp,
} from "@/db/queries";

/**
 * Omezení odesílání přihlašovacích odkazů.
 *
 * Přihlašovací formulář je jediné místo, kam může kdokoli z internetu poslat
 * POST a nechat aplikaci odeslat e-mail. Bez limitu by z toho šlo udělat
 * nástroj na zaplavení cizí schránky — proto se počítá jak na e-mail,
 * tak na IP.
 *
 * Počítá se z tabulky magic_tokens, takže to nepotřebuje žádné další
 * úložiště ani stav v paměti (což by na serverless stejně nefungovalo).
 */

export const MAX_LINKS_PER_EMAIL_PER_HOUR = 5;
export const MAX_LINKS_PER_IP_PER_HOUR = 20;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/** Zjistí IP klienta z hlaviček, které před aplikaci staví Vercel. */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for může být seznam, první je původní klient
    return forwarded.split(",")[0]?.trim() || null;
  }
  return h.get("x-real-ip");
}

export async function checkLoginRateLimit(
  email: string,
  ip: string | null,
): Promise<RateLimitResult> {
  const byEmail = await countRecentTokensByEmail(email);
  if (byEmail >= MAX_LINKS_PER_EMAIL_PER_HOUR) {
    return {
      allowed: false,
      reason:
        "Na tuhle adresu už odešlo několik odkazů za sebou. Zkus to prosím za hodinu, nebo použij odkaz z některého z dřívějších e-mailů.",
    };
  }

  if (ip) {
    const byIp = await countRecentTokensByIp(ip);
    if (byIp >= MAX_LINKS_PER_IP_PER_HOUR) {
      return {
        allowed: false,
        reason:
          "Z tohoto připojení odešlo za poslední hodinu příliš mnoho odkazů. Zkus to prosím později.",
      };
    }
  }

  return { allowed: true };
}
