import type { Metadata } from "next";
import Link from "next/link";
import { academicDomainsLabel } from "@/lib/magic-link";
import {
  Card,
  Heading,
  Hlavicka,
  InfoBox,
  Page,
  Paticka,
} from "@/components/ui";
import { OdkazForm } from "./form";

export const metadata: Metadata = {
  title: "Pro odborníky",
  description:
    "Jak se stát recenzentem Edu značky a co to znamená podepsat posudek videa.",
};

export default function ProOdborniky() {
  return (
    <>
      <Hlavicka />
      <Page>
        <Heading sub="Značku „ověřeno“ uděluje jedině člověk z oboru, pod svým jménem. Tohle je cesta, jak se jím stát.">
          Chci recenzovat
        </Heading>

        <Card className="mb-8">
          <h2 className="mb-3 font-semibold">Co se po tobě chce</h2>
          <ol className="ml-5 list-decimal space-y-2 text-sm">
            <li>
              <strong>Přečíst video celé</strong> a posoudit, jestli to, co
              tvrdí, odpovídá současnému konsenzu ve tvém oboru. Ne jestli je
              dobře udělané, ne jestli se ti líbí výklad.
            </li>
            <li>
              <strong>Napsat zdůvodnění.</strong> Je veřejné a je u značky
              vidět. Stojí na něm celá její hodnota — bez něj by to byla jen
              nálepka.
            </li>
            <li>
              <strong>Podepsat to.</strong> U každé značky, kterou dáš, je
              tvoje jméno, titul, instituce a datum.
            </li>
          </ol>
          <p className="mt-4 text-sm text-muted">
            Zjednodušení není chyba. Školní video nemůže být přesné jako
            přehledový článek — otázka je, jestli si z něj člověk odnese něco
            nesprávného.
          </p>
        </Card>

        <Card className="mb-8">
          <h2 className="mb-3 font-semibold">Jak se ověřuje, že jsi odborník</h2>
          <p className="mb-3 text-sm">
            Ve třech vrstvách, protože žádná sama nestačí:
          </p>
          <ul className="ml-5 list-disc space-y-1.5 text-sm">
            <li>
              <strong>Akademická adresa.</strong> Přihlašovací odkaz pošleme
              jen na doménu instituce. Dokazuje to, že tu adresu ovládáš.
            </li>
            <li>
              <strong>Ruční kontrola.</strong> Správce si dohledá tvůj profil
              na stránkách instituce a ověří, že jméno i zaměření souhlasí.
            </li>
            <li>
              <strong>Veřejná dohledatelnost.</strong> Máš veřejný profil se
              všemi svými posudky. Kdo značce nevěří, může si přečíst, kdo ji
              dal a proč — to je nakonec ta nejsilnější kontrola.
            </li>
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Přihlášení</h2>
          <OdkazForm domenyPopis={academicDomainsLabel()} />
          <p className="mt-4 text-xs text-muted">
            Žádné heslo se nezakládá. Po kliknutí na odkaz budeš přihlášený
            90 dní. Co se o tobě ukládá a co se zveřejňuje, je v{" "}
            <Link href="/soukromi" className="underline">
              ochraně údajů
            </Link>
            .
          </p>
        </Card>

        <div className="mt-6">
          <InfoBox>
            <strong>Nemáš adresu na žádné z našich domén?</strong> Typicky
            u zahraničních institucí. Napiš nám — doménu přidáme, nebo tě
            přihlásíme ručně. Nechceme kvůli seznamu domén vylučovat lidi,
            kteří do toho mají co říct.
          </InfoBox>
        </div>
      </Page>
      <Paticka />
    </>
  );
}
