import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import { getStatusCounts } from "@/db/queries";
import { adminLogout } from "@/actions/admin";

/**
 * Guard a navigace administrace.
 *
 * Proč je tenhle layout v route group `(chraneno)` a ne přímo v `/admin`:
 * layouty se v App Routeru VNOŘUJÍ, nenahrazují. Kdyby guard seděl
 * v app/admin/layout.tsx, platil by i pro přihlašovací stránku —
 * nepřihlášený uživatel by se přesměrovával na /admin/prihlaseni, kde by
 * guard zabral znovu, a prohlížeč by skončil na ERR_TOO_MANY_REDIRECTS.
 * Název skupiny v závorkách se do URL nepropisuje, takže adresy zůstávají
 * /admin, /admin/hotovo a /admin/tiket/<kod>.
 *
 * POZOR: tohle chrání jen zobrazení stránek. Server Actions se dají zavolat
 * přímo POSTem mimo layout a route handlery (/admin/export) se layoutem
 * vůbec nerenderují — proto si přihlášení ověřuje každá akce v
 * actions/admin.ts i export sám. Layout NENÍ bezpečnostní hranice.
 */
export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  if (!(await isAdmin())) {
    redirect("/admin/prihlaseni");
  }

  const counts = await getStatusCounts();
  const open =
    (counts.new ?? 0) + (counts.in_progress ?? 0) + (counts.waiting ?? 0);
  const closed = (counts.done ?? 0) + (counts.rejected ?? 0);

  return (
    <div className="min-h-full">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <span className="text-sm font-semibold">Školní IT</span>
          <nav className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link href="/admin" className="underline-offset-2 hover:underline">
              Fronta{" "}
              <span className="text-muted">({open})</span>
            </Link>
            <Link
              href="/admin/hotovo"
              className="underline-offset-2 hover:underline"
            >
              Hotovo <span className="text-muted">({closed})</span>
            </Link>
          </nav>
          <form action={adminLogout}>
            <button
              type="submit"
              className="text-sm text-muted underline-offset-2 hover:underline"
            >
              Odhlásit
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
