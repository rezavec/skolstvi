import { type NextRequest, NextResponse } from "next/server";
import { najdiNeboZalozRecenzenta, spotrebujToken } from "@/db/queries";
import { hashToken } from "@/lib/magic-link";
import { setRecenzentSession } from "@/lib/session";

/**
 * Cíl odkazu z e-mailu.
 *
 * Je to GET handler, ne stránka: e-mailoví klienti odkazy předem načítají
 * a některé bezpečnostní skenery je otevírají, takže se token spotřebuje
 * jedním atomickým UPDATE (`spotrebujToken`) a hned se přesměrovává.
 * Dvě souběžná kliknutí nemůžou projít obě.
 *
 * Token se nikdy neloguje ani nevrací v odpovědi.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/prihlaseni/neplatny-odkaz", request.url));
  }

  const email = await spotrebujToken(hashToken(token));
  if (!email) {
    return NextResponse.redirect(new URL("/prihlaseni/neplatny-odkaz", request.url));
  }

  const recenzent = await najdiNeboZalozRecenzenta(email);
  await setRecenzentSession(recenzent.id, recenzent.email);

  // Kdo nemá vyplněný profil, jde ho vyplnit; ostatní do své fronty.
  const kam = recenzent.jmeno === "" ? "/odbornik/profil" : "/odbornik";
  return NextResponse.redirect(new URL(kam, request.url));
}
