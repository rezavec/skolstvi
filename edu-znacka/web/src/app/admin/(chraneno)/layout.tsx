import Link from "next/link";
import { redirect } from "next/navigation";
import { odhlasSpravce } from "@/actions/admin";
import { pocetOtevrenychNamitek, zadostiKVyrizeni } from "@/db/queries";
import { isAdmin } from "@/lib/session";
import { buttonSecondaryClass } from "@/components/ui";

/**
 * Guard administrace.
 *
 * Chrání **jen zobrazení stránek**. Každá Server Action a route handler si
 * přihlášení ověřuje sama (`pozadujAdmina()`), protože se dají zavolat
 * POSTem mimo UI a `/admin/export` by se s layoutem vůbec nerenderoval.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!(await isAdmin())) redirect("/admin/prihlaseni");

  const [namitek, zadosti] = await Promise.all([
    pocetOtevrenychNamitek(),
    zadostiKVyrizeni(),
  ]);

  const odkazy = [
    { href: "/admin", text: "Přehled" },
    { href: "/admin/videa", text: "Videa" },
    { href: "/admin/kanaly", text: "Kanály" },
    { href: "/admin/recenzenti", text: "Recenzenti", pocet: zadosti.length },
    { href: "/admin/namitky", text: "Námitky", pocet: namitek },
  ];

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <span className="font-semibold">Správa</span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {odkazy.map((o) => (
              <Link key={o.href} href={o.href} className="hover:text-foreground">
                {o.text}
                {o.pocet ? (
                  <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {o.pocet}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <form action={odhlasSpravce} className="ml-auto">
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
