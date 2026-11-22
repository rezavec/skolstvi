import { zmenStavKanaluAkce } from "@/actions/admin";
import { vsechnyKanaly } from "@/db/queries";
import { OBORY, STAVY_KANALU } from "@/lib/obory";
import {
  Badge,
  Card,
  Heading,
  InfoBox,
  Page,
  ZnackaKanal,
  buttonSecondaryClass,
} from "@/components/ui";
import { PridatKanalForm } from "./forms";

export const metadata = { title: "Kanály", robots: { index: false } };

export default async function AdminKanaly() {
  const kanaly = await vsechnyKanaly();

  return (
    <Page width="wide">
      <Heading sub="Slabší značka: „kanál dlouhodobě drží úroveň“, ne „tohle video někdo přečetl“. V rozšíření vypadá jinak a striktní filtr ji nebere.">
        Důvěryhodné kanály
      </Heading>

      <InfoBox>
        Tahle kategorie existuje z praktického důvodu: dokud nebude dost
        recenzentů, byl by index skoro prázdný a rozšíření by vypadalo
        rozbité. Je to kompromis, ne náhrada posudku — <strong>značku
        u videa nahradit nemůže</strong>, protože za ní nestojí nikdo z oboru
        jmenovitě.
      </InfoBox>

      <Card className="my-8">
        <PridatKanalForm />
      </Card>

      {kanaly.length === 0 ? (
        <InfoBox>Zatím žádný kanál.</InfoBox>
      ) : (
        <ul className="space-y-3">
          {kanaly.map((k) => (
            <li key={k.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {k.stav === "overeno" ? (
                        <ZnackaKanal />
                      ) : (
                        <Badge className="bg-background text-muted ring-line">
                          {STAVY_KANALU[k.stav as keyof typeof STAVY_KANALU]?.label ??
                            k.stav}
                        </Badge>
                      )}
                      <Badge className="bg-background text-muted ring-line">
                        {OBORY[k.obor as keyof typeof OBORY] ?? k.obor}
                      </Badge>
                    </div>
                    <p className="mt-2 font-medium">{k.nazev}</p>
                    <p className="text-sm text-muted">
                      {k.prezdivka ? `${k.prezdivka} · ` : ""}
                      <code className="text-xs">{k.youtubeId}</code>
                    </p>
                    {k.poznamka ? (
                      <p className="mt-1 text-sm">{k.poznamka}</p>
                    ) : null}
                  </div>

                  <form action={zmenStavKanaluAkce}>
                    <input type="hidden" name="id" value={k.id} />
                    <input
                      type="hidden"
                      name="stav"
                      value={k.stav === "overeno" ? "pozastaveno" : "overeno"}
                    />
                    <button type="submit" className={buttonSecondaryClass}>
                      {k.stav === "overeno" ? "Pozastavit" : "Obnovit"}
                    </button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
