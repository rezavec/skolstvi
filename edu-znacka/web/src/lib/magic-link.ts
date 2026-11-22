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
 * Vytáhne z adresy domén(u) v normalizované podobě.
 *
 * Bere část za **posledním** zavináčem: `a@b@cuni.cz` má doménu `cuni.cz`,
 * ne `b`. Kdyby se bralo `split("@")[1]`, dalo by se tím pravděpodobně
 * projít přes kontrolu níž.
 *
 * Koncové tečky se odřezávají — `jan@cuni.cz.` je pro DNS totéž jako
 * `jan@cuni.cz`, ale jako řetězec by se neshodovalo.
 */
function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return null;

  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/\.+$/, "");

  if (domain.length === 0) return null;

  // Doména s prázdným labelem (`.cuni.cz`, `mff..cuni.cz`) neexistuje.
  // Zod takovou adresu odmítne dřív, ale kontrola níž se nemá spoléhat
  // na to, že před ní někdo něco ověřil.
  if (domain.split(".").some((label) => label.length === 0)) return null;

  return domain;
}

/**
 * Je adresa na akademické doméně, na kterou se smí poslat odkaz?
 *
 * **Pravidlo: doména se rovná povolené, NEBO je její pravou subdoménou.**
 *
 * Helpdesk ve stejné sadě porovnává domény na přesnou shodu, protože mu jde
 * o jednu školní doménu. Tady to nestačí: fakultní adresy jsou subdomény
 * (`mff.cuni.cz`, `natur.cuni.cz`, `sci.muni.cz`) a odborník jinou než
 * fakultní adresu většinou nemá.
 *
 * Porovnání proto musí být na tečce, ne pouhé „končí na“:
 *
 *   povolené `cuni.cz`
 *   ✓ cuni.cz              rovnost
 *   ✓ mff.cuni.cz          končí na ".cuni.cz"
 *   ✗ evil-cuni.cz         končí na "cuni.cz", ale ne na ".cuni.cz"
 *   ✗ cuni.cz.utocnik.cz   končí na ".utocnik.cz"
 *   ✗ xcuni.cz             totéž jako evil-cuni.cz
 *
 * Bez té tečky by si útočník zaregistroval `evil-cuni.cz`, poslal si odkaz
 * a vystupoval by pak na veřejném profilu jako odborník z Univerzity
 * Karlovy. To je celá podstata téhle kontroly.
 */
export function isAcademicEmailDomain(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;

  return env.academicEmailDomains.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
  );
}

/** Lidský výpis pár příkladů povolených domén do chybové zprávy. */
export function academicDomainsLabel(limit = 6): string {
  const domains = env.academicEmailDomains;
  const ukazka = domains.slice(0, limit).map((d) => `@${d}`);

  if (domains.length <= limit) {
    if (ukazka.length === 1) return ukazka[0];
    return `${ukazka.slice(0, -1).join(", ")} nebo ${ukazka.at(-1)}`;
  }
  return `${ukazka.join(", ")} a další (včetně fakultních subdomén)`;
}
