import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

/**
 * Dvě nezávislé session: recenzent (ověřený magic linkem) a správce (heslo).
 *
 * Obě jsou bezstavové — podepsaný JWT v httpOnly cookie, žádná tabulka
 * session v databázi. Nic se neuklízí a nepřidává to dotaz do DB na každý
 * request.
 *
 * Cena za bezstavovost: odhlásit jednoho konkrétního člověka na dálku nejde,
 * cookie platí do vypršení. Kdyby to bylo potřeba, stačí změnit APP_SECRET —
 * tím se odhlásí všichni.
 *
 * **Pozor:** v cookie recenzenta je jen jeho `id` a e-mail, NE jeho stav.
 * Stav (`ceka`/`schvalen`/`pozastaven`) se musí přečíst z databáze při každé
 * akci — jinak by pozastavený recenzent mohl 90 dní dál recenzovat s starou
 * cookie. Viz `requireSchvalenyRecenzent()` v `lib/auth.ts`.
 */

const RECENZENT_COOKIE = "znacka_recenzent";
const ADMIN_COOKIE = "znacka_admin";

const RECENZENT_DAYS = 90;
const ADMIN_DAYS = 30;

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.appSecret);
}

/**
 * `secure` jen v produkci — přes http na localhostu by prohlížeč secure
 * cookie vůbec neuložil a nešlo by se lokálně přihlásit.
 */
function cookieOptions(days: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // lax je potřeba, aby cookie přežila příchod z e-mailového klienta
    sameSite: "lax" as const,
    path: "/",
    maxAge: days * 24 * 60 * 60,
  };
}

async function sign(payload: Record<string, unknown>, days: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secretKey());
}

// ── Recenzent ───────────────────────────────────────────────────────────────

export type RecenzentSession = { id: number; email: string };

export async function setRecenzentSession(
  id: number,
  email: string,
): Promise<void> {
  const token = await sign({ id, email, role: "recenzent" }, RECENZENT_DAYS);
  (await cookies()).set(RECENZENT_COOKIE, token, cookieOptions(RECENZENT_DAYS));
}

/** Kdo je přihlášený, nebo null. Nevyhazuje výjimku a NEsahá do databáze. */
export async function getRecenzentSession(): Promise<RecenzentSession | null> {
  const token = (await cookies()).get(RECENZENT_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      payload.role !== "recenzent" ||
      typeof payload.id !== "number" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }
    return { id: payload.id, email: payload.email };
  } catch {
    // propadlý nebo zmanipulovaný token — bereme jako nepřihlášeného
    return null;
  }
}

export async function clearRecenzentSession(): Promise<void> {
  (await cookies()).delete(RECENZENT_COOKIE);
}

// ── Správce ─────────────────────────────────────────────────────────────────

export async function setAdminSession(): Promise<void> {
  const token = await sign({ role: "admin" }, ADMIN_DAYS);
  (await cookies()).set(ADMIN_COOKIE, token, cookieOptions(ADMIN_DAYS));
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

/**
 * Porovnání hesla správce v konstantním čase.
 *
 * Oba vstupy se nejdřív prohashují — timingSafeEqual vyhazuje výjimku při
 * rozdílné délce, což by samo o sobě prozradilo délku hesla. Hash má vždy
 * 32 bajtů, takže porovnání je skutečně v konstantním čase.
 */
export function verifyAdminPassword(input: string): boolean {
  const expected = createHash("sha256").update(env.adminPassword).digest();
  const provided = createHash("sha256").update(input).digest();
  return timingSafeEqual(expected, provided);
}
