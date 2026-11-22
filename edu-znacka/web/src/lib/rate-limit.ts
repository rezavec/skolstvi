import "server-only";
import { headers } from "next/headers";
import { pocetTokenuPodleEmailu, pocetTokenuPodleIp } from "@/db/queries";

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

export const MAX_ODKAZU_NA_EMAIL_ZA_HODINU = 5;
export const MAX_ODKAZU_NA_IP_ZA_HODINU = 20;

export type RateLimitVysledek =
  | { povoleno: true }
  | { povoleno: false; duvod: string };

/** Zjistí IP klienta z hlaviček, které před aplikaci staví Vercel. */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for může být seznam, první je původní klient
    return forwarded.split(",")[0]?.trim() || null;
  }
  return h.get("x-real-ip");
}

export async function zkontrolujRateLimit(
  email: string,
  ip: string | null,
): Promise<RateLimitVysledek> {
  const podleEmailu = await pocetTokenuPodleEmailu(email);
  if (podleEmailu >= MAX_ODKAZU_NA_EMAIL_ZA_HODINU) {
    return {
      povoleno: false,
      duvod:
        "Na tuhle adresu už odešlo několik odkazů za sebou. Zkus to prosím za hodinu, nebo použij odkaz z některého z dřívějších e-mailů.",
    };
  }

  if (ip) {
    const podleIp = await pocetTokenuPodleIp(ip);
    if (podleIp >= MAX_ODKAZU_NA_IP_ZA_HODINU) {
      return {
        povoleno: false,
        duvod:
          "Z tohoto připojení odešlo za poslední hodinu příliš mnoho odkazů. Zkus to prosím později.",
      };
    }
  }

  return { povoleno: true };
}
