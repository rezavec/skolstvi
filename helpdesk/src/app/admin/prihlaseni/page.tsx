import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import { Page } from "@/components/ui";
import { AdminLoginForm } from "./form";

/**
 * Přihlášení správce IT heslem.
 *
 * Záměrně leží mimo route group `(chraneno)`, takže na ni guard z jejího
 * layoutu nedosáhne. Jinak by se přesměrovávala sama na sebe.
 */
export default async function AdminLoginPage() {
  if (await isAdmin()) {
    redirect("/admin");
  }

  return (
    <Page>
      <AdminLoginForm />
    </Page>
  );
}
