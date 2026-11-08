import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

/**
 * Dvě nezávislé session: žadatel (ověřený magic linkem) a admin (heslo).
 *
 * Obě jsou bezstavové — podepsaný JWT v httpOnly cookie, žádná tabulka
 * session v databázi. Pro tuhle velikost je to to nejjednodušší, co funguje:
 * nic se neuklízí a nepřidává to dotaz do DB na každý request.
 *
 * Cena za bezstavovost: odhlásit jednoho konkrétního člověka na dálku nejde,
 * cookie platí do vypršení. Kdyby to bylo potřeba, stačí změnit APP_SECRET —
 * tím se odhlásí všichni.
 */

const REQUESTER_COOKIE = "helpdesk_zadatel";
const ADMIN_COOKIE = "helpdesk_admin";

const REQUESTER_DAYS = 90;
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

// ── Žadatel ─────────────────────────────────────────────────────────────────

export async function setRequesterSession(email: string): Promise<void> {
  const token = await sign({ email, role: "requester" }, REQUESTER_DAYS);
  (await cookies()).set(
    REQUESTER_COOKIE,
    token,
    cookieOptions(REQUESTER_DAYS),
  );
}

/** E-mail přihlášeného žadatele, nebo null. Nevyhazuje výjimku. */
export async function getRequesterEmail(): Promise<string | null> {
  const token = (await cookies()).get(REQUESTER_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.role !== "requester" || typeof payload.email !== "string") {
      return null;
    }
    return payload.email;
  } catch {
    // propadlý nebo zmanipulovaný token — bereme jako nepřihlášeného
    return null;
  }
}

export async function clearRequesterSession(): Promise<void> {
  (await cookies()).delete(REQUESTER_COOKIE);
}

// ── Admin ───────────────────────────────────────────────────────────────────

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
 * Porovnání admin hesla v konstantním čase.
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
