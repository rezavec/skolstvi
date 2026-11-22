import "server-only";
import { najdiRecenzentaPodleId } from "@/db/queries";
import type { Recenzent } from "@/db/schema";
import { getRecenzentSession, isAdmin } from "./session";

/**
 * Strážci pro Server Actions a route handlery.
 *
 * Guard v layoutu chrání jen **zobrazení stránek**. Server Actions se dají
 * zavolat POSTem mimo UI a route handlery se s layoutem vůbec nerenderují,
 * takže si přihlášení musí ověřit každá akce sama. Proto tyhle funkce.
 */

export class Nepovoleno extends Error {
  constructor(message = "Na tuhle akci nemáš právo.") {
    super(message);
    this.name = "Nepovoleno";
  }
}

export async function pozadujAdmina(): Promise<void> {
  if (!(await isAdmin())) throw new Nepovoleno();
}

/**
 * Vrátí přihlášeného recenzenta — ale jen když je **pořád schválený**.
 *
 * Stav se čte z databáze, ne z cookie. Cookie platí 90 dní, takže kdyby
 * v ní stav byl, pozastavený recenzent by mohl recenzovat dál až do jejího
 * vypršení. Jeden dotaz do DB za akci je za tuhle vlastnost dobrá cena.
 */
export async function pozadujSchvalenehoRecenzenta(): Promise<Recenzent> {
  const session = await getRecenzentSession();
  if (!session) throw new Nepovoleno("Nejsi přihlášený.");

  const recenzent = await najdiRecenzentaPodleId(session.id);
  if (!recenzent) throw new Nepovoleno("Účet už neexistuje.");

  if (recenzent.stav !== "schvalen") {
    throw new Nepovoleno(
      recenzent.stav === "ceka"
        ? "Tvoje žádost ještě čeká na schválení."
        : "Tvůj účet není aktivní.",
    );
  }
  return recenzent;
}

/** Přihlášený recenzent v jakémkoli stavu — pro zobrazení jeho profilu. */
export async function prihlasenyRecenzent(): Promise<Recenzent | null> {
  const session = await getRecenzentSession();
  if (!session) return null;
  return (await najdiRecenzentaPodleId(session.id)) ?? null;
}
