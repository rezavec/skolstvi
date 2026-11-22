import Link from "next/link";
import { redirect } from "next/navigation";
import { odhlasRecenzenta } from "@/actions/prihlaseni";
import { prihlasenyRecenzent } from "@/lib/auth";
import { IkonaFajfka, buttonSecondaryClass } from "@/components/ui";

/**
 * Guard části pro recenzenty.
 *
 * Pustí i neschváleného — musí si dojít vyplnit profil a vidět, že žádost
 * čeká. Co smí **udělat**, si ověřuje každá akce sama
 * (`pozadujSchvalenehoRecenzenta`), protože stav se čte z databáze,
 * ne z cookie: pozastavený recenzent by jinak mohl recenzovat dál celých
 * 90 dní platnosti cookie.
 */
export default async function OdbornikLayout({
  children,
}: LayoutProps<"/odbornik">) {
  const recenzent = await prihlasenyRecenzent();
  if (!recenzent) redirect("/pro-odborniky");

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <IkonaFajfka className="h-5 w-5 text-overeno" />
            Edu značka
          </Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <Link href="/odbornik" className="hover:text-foreground">
              K recenzi
            </Link>
            <Link href="/odbornik/profil" className="hover:text-foreground">
              Můj profil
            </Link>
            {recenzent.stav === "schvalen" ? (
              <Link
                href={`/recenzent/${recenzent.slug}`}
                className="hover:text-foreground"
              >
                Veřejný profil
              </Link>
            ) : null}
          </nav>
          <form action={odhlasRecenzenta} className="ml-auto">
            <button type="submit" className={buttonSecondaryClass}>
              Odhlásit
            </button>
          </form>
        </div>
      </header>
      {children}
    </>
  );
}
