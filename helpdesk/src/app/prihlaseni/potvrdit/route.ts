import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { consumeMagicToken } from "@/db/queries";
import { hashToken } from "@/lib/magic-link";
import { setRequesterSession } from "@/lib/session";

/**
 * Cíl přihlašovacího odkazu z e-mailu.
 *
 * Musí to být GET route handler — na odkaz v mailu se klikne, nedá se na něj
 * poslat POST. Cookie se tu nastavit smí, protože route handler ještě může
 * sáhnout na hlavičky odpovědi.
 *
 * Token se spotřebuje jediným atomickým UPDATE (viz consumeMagicToken),
 * takže dvojí kliknutí na stejný odkaz nemůže projít dvakrát.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    redirect("/prihlaseni/neplatny-odkaz");
  }

  const email = await consumeMagicToken(hashToken(token));

  if (!email) {
    // neexistuje, propadl, nebo už byl použitý — nerozlišujeme
    redirect("/prihlaseni/neplatny-odkaz");
  }

  await setRequesterSession(email);

  redirect("/nahlasit");
}
