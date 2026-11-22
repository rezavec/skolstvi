import type { Metadata } from "next";
import Link from "next/link";
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

export const metadata: Metadata = {
  title: "Jak se značka uděluje",
  description:
    "Pravidlo, podle kterého video dostane značku „ověřeno“, a co všechno " +
    "ji zase odebere.",
};

export default function JakToFunguje() {
  return (
    <>
      <Hlavicka />
      <Page>
        <Heading sub="Celé pravidlo, bez výjimek a bez ručních zásahů. Smysl je, aby nemohla vzniknout značka, ke které by neexistoval podepsaný důvod.">
          Jak se značka uděluje
        </Heading>

        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">
            Značku <ZnackaOvereno /> video dostane, právě když platí všechno
            tohle
          </h2>
          <ul className="ml-5 list-disc space-y-2 text-sm">
            <li>
              existuje posudek s výsledkem <strong>„odpovídá konsenzu“</strong>,
            </li>
            <li>
              od recenzenta, který je <strong>v daný moment schválený</strong>,
            </li>
            <li>
              z oboru, který se <strong>rovná oboru videa</strong> — fyzik
              nedává značku videu o dědičnosti,
            </li>
            <li>
              ten obor má recenzent <strong>schválený</strong> ve svém profilu,
            </li>
            <li>
              na videu <strong>není otevřená námitka</strong>,
            </li>
            <li>
              a značka nebyla <strong>odebrána po vyhovění námitce</strong>.
            </li>
          </ul>
        </Card>

        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">Co značku zase odebere</h2>
          <ul className="ml-5 list-disc space-y-2 text-sm">
            <li>
              <strong>Námitka.</strong> Okamžitě, ještě než ji kdokoli
              posoudí. Kdo nesouhlasí, {" "}
              <Link href="/namitka" className="underline">
                napíše
              </Link>
              , a značka do vyřízení nesvítí.
            </li>
            <li>
              <strong>Pozastavení recenzenta.</strong> Když správce někomu
              pozastaví účet, zmizí všechny značky, které podepsal.
            </li>
            <li>
              <strong>Přeřazení videa do jiného oboru.</strong> Posudek fyzika
              se nepřenese na biologii.
            </li>
            <li>
              <strong>Zmizení videa z YouTube.</strong> Smazané a neveřejné
              video značku ztrácí.
            </li>
          </ul>
        </Card>

        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">
            Proč není značka „tohle je špatně“
          </h2>
          <p className="mb-3 text-sm">
            Byla by užitečná — přesně na ty případy, kdy žák přinese video
            o ploché Zemi. Projekt ji přesto nemá, a to ze dvou důvodů:
          </p>
          <ul className="ml-5 list-disc space-y-2 text-sm">
            <li>
              Veřejně vystavené tvrzení „tohle video je nesmysl“ u jmenovaného
              autora je <strong>zásah do jeho dobré pověsti</strong>. Musel by
              být doložitelný a muselo by existovat řádné rozporové řízení —
              to je úplně jiný projekt než tenhle.
            </li>
            <li>
              Rozlišit „je to špatně“ od „je to zjednodušené“ nebo „je to
              starší pohled“ je u školních videí často věc názoru, a značka
              má být jednoznačná.
            </li>
          </ul>
          <p className="mt-3 text-sm">
            Posudek s opačným výsledkem se tedy ukládá, ale{" "}
            <strong>nikde se nezveřejňuje</strong> — vidí ho jen správce
            a ostatní recenzenti, aby stejnou práci nedělali dvakrát.
          </p>
        </Card>

        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">
            Druhá značka: <ZnackaKanal />
          </h2>
          <p className="text-sm">
            Je slabší a uděluje ji správce, ne odborník. Znamená „kanál
            dlouhodobě drží úroveň“, ne „tohle video někdo přečetl“. Proto
            vypadá jinak a v režimu <em>jen ověřená</em> se nepočítá.
          </p>
          <p className="mt-3 text-sm text-muted">
            Existuje z praktického důvodu: dokud nebude dost recenzentů, byl
            by index skoro prázdný a rozšíření by vypadalo rozbité. Je to
            přiznaný kompromis, ne náhrada posudku.
          </p>
        </Card>

        <InfoBox>
          <strong>Co značku nemá, není tím označené za špatné.</strong>{" "}
          Nejčastěji na něj jen ještě nikdo z oboru nedošel. Nerecenzovaná
          přednáška z MFF a video o ploché Zemi jsou v tomhle systému na
          stejné úrovni — bez značky. To je vědomé omezení, ne chyba.
        </InfoBox>
      </Page>
      <Paticka />
    </>
  );
}
