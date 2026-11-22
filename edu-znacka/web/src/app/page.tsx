import Link from "next/link";
import { oboryVKatalogu, statistiky } from "@/db/queries";
import { OBORY } from "@/lib/obory";
import {
  Card,
  Heading,
  Hlavicka,
  InfoBox,
  Page,
  Paticka,
  ZnackaKanal,
  ZnackaOvereno,
} from "@/components/ui";

/** Titulní stránka se mění jen s novými recenzemi — hodina v cache stačí. */
export const revalidate = 3600;

export default async function Titulka() {
  const [stat, obory] = await Promise.all([statistiky(), oboryVKatalogu()]);

  return (
    <>
      <Hlavicka />
      <Page>
        <Heading
          sub="Na YouTube se nedá poznat, jestli se z videa naučíš něco, co platí, nebo autorův výmysl. Tohle rozšíření ti to ukáže přímo u videa."
        >
          Která videa se dají učit
        </Heading>

        <div className="mb-8 flex flex-wrap gap-3">
          <a
            href="#instalace"
            className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 font-semibold text-accent-foreground"
          >
            Nainstalovat do prohlížeče
          </a>
          <Link
            href="/katalog"
            className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-5 py-3 font-medium"
          >
            Prohlížet ověřená videa ({stat.overenychVidei})
          </Link>
        </div>

        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">Co znamenají ty dvě značky</h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="mb-1">
                <ZnackaOvereno obor="Fyzika" />
              </dt>
              <dd className="text-muted">
                Konkrétní video přečetl <strong>odborník z toho oboru</strong>{" "}
                a potvrdil, že jeho obsah odpovídá současnému vědeckému
                konsenzu. Je u toho jeho jméno, instituce, zdůvodnění a datum —
                všechno je dohledatelné.
              </dd>
            </div>
            <div>
              <dt className="mb-1">
                <ZnackaKanal />
              </dt>
              <dd className="text-muted">
                Slabší tvrzení: <strong>kanál</strong> dlouhodobě drží úroveň,
                ale tohle konkrétní video nikdo nerecenzoval. Proto vypadá
                jinak — a v režimu „jen ověřená“ se nepočítá.
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted">
            Co značku nemá, <strong>není tím označené za špatné.</strong>{" "}
            Nejčastěji na něj jen ještě nikdo nedošel. Negativní značku
            projekt záměrně nemá.
          </p>
        </Card>

        {obory.length > 0 ? (
          <Card className="mb-6">
            <h2 className="mb-3 font-semibold">Co už je ověřené</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {obory.map(({ obor, pocet }) => (
                <li key={obor}>
                  <Link
                    href={`/katalog?obor=${obor}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-3 py-1 hover:border-accent"
                  >
                    {OBORY[obor as keyof typeof OBORY] ?? obor}
                    <span className="text-muted tabular-nums">{pocet}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">
              {stat.recenzentu}{" "}
              {stat.recenzentu === 1 ? "schválený recenzent" : "schválených recenzentů"}
              {" · "}
              {stat.recenzi} podepsaných posudků{" · "}
              {stat.duveryhodnychKanalu} důvěryhodných kanálů
            </p>
          </Card>
        ) : (
          <div className="mb-6">
            <InfoBox>
              <strong>Databáze se teprve plní.</strong> Rozšíření se dá
              nainstalovat už teď, ale značek bude ze začátku málo — každá
              znamená, že se nad videem posadil někdo z oboru a napsal
              posudek. To se nedá uspěchat.
            </InfoBox>
          </div>
        )}

        <Card id="instalace" className="mb-6">
          <h2 className="mb-3 font-semibold">Instalace</h2>
          <p className="mb-3 text-sm text-muted">
            Rozšíření nepotřebuje účet ani přihlášení. Index ověřených videí
            si stáhne jednou denně celý a drží si ho v prohlížeči — takže{" "}
            <strong>server se nikdy nedozví, co sleduješ.</strong>
          </p>
          <ul className="ml-5 list-disc space-y-1.5 text-sm">
            <li>Chrome, Edge, Brave, Opera — Chrome Web Store</li>
            <li>Firefox — addons.mozilla.org</li>
          </ul>
          <p className="mt-3 text-sm text-muted">
            Odkazy sem přijdou, až rozšíření projde schvalováním ve storech.
            Do té doby se dá nainstalovat ze zdrojáků — postup je v README
            projektu.
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Jsi z fakulty nebo z Akademie?</h2>
          <p className="text-sm text-muted">
            Celý projekt stojí na tom, že posudky píšou lidi, kteří tomu
            rozumí. Jeden posudek je práce na dvacet minut a znamená, že se
            z toho videa můžou učit tisíce lidí bez obav.{" "}
            <Link href="/pro-odborniky" className="font-medium underline">
              Jak se stát recenzentem
            </Link>
            .
          </p>
        </Card>
      </Page>
      <Paticka />
    </>
  );
}
