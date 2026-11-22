import type { Metadata } from "next";
import Link from "next/link";
import { Card, Heading, Hlavicka, Page, Paticka } from "@/components/ui";

export const metadata: Metadata = {
  title: "Ochrana údajů",
  description:
    "Co o uživatelích rozšíření a o recenzentech ukládáme — a co ne.",
};

/**
 * Zásady ochrany údajů.
 *
 * Nejde o formalitu: Chrome Web Store i addons.mozilla.org vyžadují veřejnou
 * adresu se zásadami jako podmínku vydání rozšíření, a hlavně je tady ta
 * jediná věta, na které projektu opravdu záleží — že se o sledování
 * uživatele nedozvíme nic.
 */
export default function Soukromi() {
  return (
    <>
      <Hlavicka />
      <Page>
        <Heading sub="Krátce, bez právnické vaty.">Ochrana údajů</Heading>

        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">
            Rozšíření o tobě neposílá nikam nic
          </h2>
          <p className="mb-3 text-sm">
            Rozšíření si <strong>jednou denně stáhne celý seznam</strong>
            {" "}ověřených videí a drží si ho v prohlížeči. Když pak na YouTube
            narazí na video, které v tom seznamu je, přidá k němu značku —
            celé rozhodnutí se děje <strong>u tebe v prohlížeči</strong>.
          </p>
          <p className="mb-3 text-sm">
            Server se proto nikdy nedozví, jaká videa sleduješ, co hledáš ani
            kdy jsi na YouTube byl. Stahuje se celý seznam právě proto, aby to
            tak být mohlo — dotazovat se serveru na jednotlivá videa by bylo
            jednodušší, ale znamenalo by to posílat mu historii sledování.
          </p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted">
            <li>
              Rozšíření si bere oprávnění jen na <code>youtube.com</code>{" "}
              a na doménu tohohle webu. Na ostatní stránky nevidí.
            </li>
            <li>
              Žádné účty, žádné přihlašování, žádné sledovací skripty,
              žádná analytika.
            </li>
            <li>
              Nastavení (režim zobrazení) se ukládá jen lokálně v prohlížeči.
            </li>
            <li>
              Server o každém stažení seznamu ví jen to, co ví každý webový
              server o každém požadavku — IP adresu a čas. Nespojuje se to
              s ničím dalším.
            </li>
          </ul>
        </Card>

        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">Recenzenti</h2>
          <p className="mb-3 text-sm">
            <strong>Zveřejňuje se:</strong> jméno, titul, instituce, obory,
            odkaz na profil u instituce, ORCID iD, datum schválení a všechny
            posudky s kladným výsledkem včetně zdůvodnění a data.
          </p>
          <p className="mb-3 text-sm">
            V tom je celá hodnota značky — bez jména, které za ní stojí, by
            to byla jen nálepka. Proto se souhlas se zveřejněním vyžaduje při
            vyplnění profilu a bez něj registrace nejde dokončit.
          </p>
          <p className="mb-3 text-sm">
            <strong>Nezveřejňuje se:</strong> e-mailová adresa. Používá se jen
            k přihlášení a k tomu, abychom mohli napsat, jak byla vyřízena
            žádost nebo námitka.
          </p>
          <p className="text-sm">
            <strong>Posudky s opačným výsledkem</strong> se nezveřejňují nikde
            — ani s tvým jménem, ani bez něj. Vidí je jen správce a ostatní
            recenzenti. Proč, je v{" "}
            <Link href="/jak-to-funguje" className="underline">
              pravidlech značky
            </Link>
            .
          </p>
        </Card>

        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">Námitky</h2>
          <p className="text-sm">
            Text námitky se ukládá a čte ho správce. Kontaktní adresa{" "}
            <strong>se nezveřejňuje</strong> a slouží jen k odpovědi. Pokud
            se hlásíš jako autor videa, ukládá se i tahle informace, protože
            podle ní se námitky řadí.
          </p>
        </Card>

        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">Jak dlouho a kde</h2>
          <ul className="ml-5 list-disc space-y-1.5 text-sm">
            <li>
              Přihlašovací tokeny: 30 minut platnost, v databázi jen jejich
              hash. Záznamy se dají po měsíci mazat.
            </li>
            <li>
              Profily recenzentů a posudky: dokud recenzent nepožádá o smazání.
              Smazaný profil znamená i zmizení značek, které podepsal — na
              tom je pravidlo postavené.
            </li>
            <li>
              Databáze běží v EU (region Frankfurt).
            </li>
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Chci svoje údaje smazat</h2>
          <p className="text-sm">
            Napiš správci — kontakt je ve stejném e-mailu, kterým ti přišlo
            rozhodnutí o žádosti. Smazání profilu znamená, že zmizí i značky
            z tvých posudků; to je důsledek pravidla, ne sankce.
          </p>
        </Card>
      </Page>
      <Paticka />
    </>
  );
}
