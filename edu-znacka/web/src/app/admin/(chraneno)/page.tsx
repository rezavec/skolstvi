import Link from "next/link";
import {
  namitkyPodleStavu,
  statistiky,
  videaKRerecenzi,
  zadostiKVyrizeni,
} from "@/db/queries";
import { RERECENZE_PO_DNECH } from "@/lib/obory";
import { Card, Heading, InfoBox, Page, formatDate } from "@/components/ui";

export const metadata = { title: "Přehled", robots: { index: false } };

export default async function AdminPrehled() {
  const [stat, zadosti, namitky, kRerecenzi] = await Promise.all([
    statistiky(),
    zadostiKVyrizeni(),
    namitkyPodleStavu("nova"),
    videaKRerecenzi(),
  ]);

  return (
    <Page width="wide">
      <Heading sub="Co čeká na vyřízení a jak velký index zatím je.">
        Přehled
      </Heading>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cislo popis="ověřených videí" hodnota={stat.overenychVidei} />
        <Cislo popis="důvěryhodných kanálů" hodnota={stat.duveryhodnychKanalu} />
        <Cislo popis="schválených recenzentů" hodnota={stat.recenzentu} />
        <Cislo popis="podepsaných recenzí" hodnota={stat.recenzi} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Fronta
          nazev="Námitky"
          pocet={namitky.length}
          odkaz="/admin/namitky"
          naléhavé
          prazdne="Žádná otevřená námitka."
        >
          {namitky.slice(0, 5).map(({ namitka, video }) => (
            <li key={namitka.id} className="truncate">
              {namitka.jeAutor === "ano" ? (
                <strong className="text-red-700 dark:text-red-400">
                  od autora:{" "}
                </strong>
              ) : null}
              {video.nazev}
            </li>
          ))}
        </Fronta>

        <Fronta
          nazev="Žádosti o recenzování"
          pocet={zadosti.length}
          odkaz="/admin/recenzenti"
          prazdne="Žádná nová žádost."
        >
          {zadosti.slice(0, 5).map((z) => (
            <li key={z.id} className="truncate">
              {z.jmeno} — {z.instituce}
            </li>
          ))}
        </Fronta>
      </div>

      {kRerecenzi.length > 0 ? (
        <Card className="mt-4">
          <h2 className="mb-1 font-semibold">
            Značky starší než {Math.round(RERECENZE_PO_DNECH / 365)} roky
          </h2>
          <p className="mb-3 text-sm text-muted">
            Konsenzus se posouvá a video se dá po nahrání zkrátit. Tahle videa
            by si zasloužila nové přečtení — není to nic akutního.
          </p>
          <ul className="space-y-1 text-sm">
            {kRerecenzi.slice(0, 10).map((v) => (
              <li key={v.id} className="flex gap-2">
                <span className="text-muted">{formatDate(v.overenoAt)}</span>
                <Link href={`/video/${v.youtubeId}`} className="truncate underline">
                  {v.nazev}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {stat.recenzentu === 0 ? (
        <div className="mt-6">
          <InfoBox>
            <strong>Zatím nemáš ani jednoho schváleného recenzenta.</strong>{" "}
            Dokud nebudou, žádné video značku nedostane — tak je pravidlo
            postavené. Do té doby má smysl přidávat{" "}
            <Link href="/admin/kanaly" className="underline">
              důvěryhodné kanály
            </Link>
            , aby rozšíření nebylo úplně prázdné, a rozeslat odkaz na{" "}
            <Link href="/pro-odborniky" className="underline">
              /pro-odborniky
            </Link>{" "}
            lidem z fakult, které znáš.
          </InfoBox>
        </div>
      ) : null}
    </Page>
  );
}

function Cislo({ popis, hodnota }: { popis: string; hodnota: number }) {
  return (
    <Card className="text-center">
      <div className="text-3xl font-semibold tabular-nums">{hodnota}</div>
      <div className="mt-1 text-xs text-muted">{popis}</div>
    </Card>
  );
}

function Fronta({
  nazev,
  pocet,
  odkaz,
  prazdne,
  naléhavé = false,
  children,
}: {
  nazev: string;
  pocet: number;
  odkaz: string;
  prazdne: string;
  naléhavé?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{nazev}</h2>
        <Link href={odkaz} className="text-sm underline">
          {pocet > 0 ? `vyřídit (${pocet})` : "otevřít"}
        </Link>
      </div>
      {pocet === 0 ? (
        <p className="text-sm text-muted">{prazdne}</p>
      ) : (
        <ul
          className={`space-y-1 text-sm ${naléhavé ? "font-medium" : ""}`}
        >
          {children}
        </ul>
      )}
    </Card>
  );
}
