import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { env } from "./env";

/** Jak dlouho platí přihlašovací odkaz. */
export const TOKEN_VALID_MINUTES = 30;

/**
 * Vytvoří nový token. Vrací token samotný (pošle se v odkazu) a jeho hash
 * (uloží se do databáze). Token sám se nikam neukládá — kdo získá přístup
 * k databázi, nemůže se s jejím obsahem přihlásit.
 */
export function createToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenExpiry(): Date {
  return new Date(Date.now() + TOKEN_VALID_MINUTES * 60 * 1000);
}

export function magicLinkUrl(token: string): string {
  return `${env.appUrl}/prihlaseni/potvrdit?token=${encodeURIComponent(token)}`;
}

/**
 * Je adresa na povolené školní doméně?
 *
 * Porovnává se přesná doména, ne „končí na“ — jinak by `zsulesa.cz.evil.com`
 * nebo `nasezsulesa.cz` prošly.
 */
export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return env.allowedEmailDomains.includes(domain);
}

/** Lidský výpis povolených domén do chybové zprávy: „@a.cz nebo @b.cz“. */
export function allowedDomainsLabel(): string {
  const domains = env.allowedEmailDomains.map((d) => `@${d}`);
  if (domains.length === 1) return domains[0];
  return `${domains.slice(0, -1).join(", ")} nebo ${domains.at(-1)}`;
}
