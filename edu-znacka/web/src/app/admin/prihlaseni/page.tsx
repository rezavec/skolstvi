import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import { Card, Heading, Page } from "@/components/ui";
import { PrihlasovaciForm } from "./form";

export const metadata: Metadata = {
  title: "Přihlášení správce",
  robots: { index: false, follow: false },
};

/**
 * Přihlašovací stránka správce.
 *
 * Leží **mimo** složku `(chraneno)`, a to schválně: layouty se v App Routeru
 * vnořují, nenahrazují. Kdyby guard seděl v `app/admin/layout.tsx`, platil
 * by i pro tuhle stránku a ta by přesměrovávala sama na sebe.
 */
export default async function Prihlaseni() {
  if (await isAdmin()) redirect("/admin");

  return (
    <Page width="narrow">
      <Heading sub="Správa videí, kanálů, recenzentů a námitek.">
        Správa Edu značky
      </Heading>
      <Card>
        <PrihlasovaciForm />
      </Card>
    </Page>
  );
}
