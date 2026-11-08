import { randomInt } from "node:crypto";

/**
 * Abeceda bez znaků, které se dají snadno splést: chybí 0, O, 1, I, L.
 * Kód se předčítá po telefonu a přepisuje z papíru, takže na tom záleží.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 4;

/** Vygeneruje kód tiketu ve formátu T-XXXX (31^4 = asi 920 tisíc kombinací). */
export function generateTicketCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `T-${code}`;
}

/**
 * Normalizuje kód z URL nebo z ručního opisu: velká písmena, povolí
 * vynechanou předponu i pomlčku, takže "t7f3k" i "T-7F3K" najdou totéž.
 */
export function normalizeTicketCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const withoutPrefix = cleaned.startsWith("T") ? cleaned.slice(1) : cleaned;
  return `T-${withoutPrefix}`;
}
