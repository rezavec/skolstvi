import Link from "next/link";
import { namitkyPodleStavu } from "@/db/queries";
import { STAVY_NAMITKY } from "@/lib/obory";
import { urlVidea } from "@/lib/youtube";
import {
  Badge,
  Card,
  Heading,
  InfoBox,
  Page,
  formatDateTime,
} from "@/components/ui";
import { VyrizeniForm } from "./forms";

export const metadata = { title: "Námitky", robots: { index: false } };

export default async function AdminNamitky() {
  const [nove, vyresene, zamitnute] = await Promise.all([
    namitkyPodleStavu("nova"),
    namitkyPodleStavu("vyresena"),
    namitkyPodleStavu("zamitnuta"),
  ]);

  /**
   * Jeden seznam, ne dva — ze stejného důvodu jako u recenzentů: po vyřízení
   * by se karta přesunula do jiného `<ul>`, React by komponentu odmontoval
   * a s ní zmizel i výsledek akce (včetně toho, že se nepovedlo odeslat
   * odpověď namítajícímu).
   */
  const uzavrene = [...vyresene, ...zamitnute].sort(
    (a, b) =>
      (b.namitka.vyrizenoAt?.getTime() ?? 0) -
      (a.namitka.vyrizenoAt?.getTime() ?? 0),
  );
  const vsechny = [...nove, ...uzavrene];

  return (
    <Page width="wide">
      <Heading sub="Námitka značku pozastaví okamžitě, ještě než ji kdokoli posoudí. I zamítnutí je vyřízení — bez něj značka nesvítí dál.">
        Námitky
      </Heading>

      <InfoBox>
        Bez téhle cesty zpátky by byla značka nevyvratitelná, a to si
        u tvrzení o vědeckém konsenzu nemůže dovolit nikdo. Námitky od autorů
        videí jsou v seznamu první.
      </InfoBox>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">
          {nove.length > 0 ? `K vyřízení: ${nove.length}` : "Žádná otevřená námitka"}
        </h2>
        {vsechny.length === 0 ? (
          <InfoBox>Zatím žádná námitka.</InfoBox>
        ) : (
          <ul className="space-y-3">
            {vsechny.map(({ namitka, video }) => (
              <li key={namitka.id}>
                <Card>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {namitka.stav !== "nova" ? (
                      <Badge className="bg-background text-muted ring-line">
                        {STAVY_NAMITKY[namitka.stav as keyof typeof STAVY_NAMITKY]
                          ?.label ?? namitka.stav}
                      </Badge>
                    ) : null}
                    {namitka.jeAutor === "ano" ? (
                      <Badge className="bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900">
                        hlásí se jako autor videa
                      </Badge>
                    ) : null}
                    <Badge className="bg-background text-muted ring-line">
                      {formatDateTime(namitka.createdAt)}
                    </Badge>
                  </div>

                  <p className="font-medium">{video.nazev}</p>
                  <p className="mb-3 flex flex-wrap gap-3 text-sm">
                    <a
                      href={urlVidea(video.youtubeId)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline"
                    >
                      na YouTube
                    </a>
                    <Link href={`/video/${video.youtubeId}`} className="underline">
                      detail a recenze
                    </Link>
                  </p>

                  <blockquote className="border-l-2 border-line pl-3 text-sm whitespace-pre-wrap">
                    {namitka.text}
                  </blockquote>
                  <p className="mt-2 text-xs text-muted">
                    {/* Kontakt je neveřejný — jen tady a v odpovědi. */}
                    kontakt: <code>{namitka.kontakt}</code>
                  </p>

                  <VyrizeniForm
                    namitkaId={namitka.id}
                    stav={namitka.stav}
                    vyrizeni={namitka.vyrizeni}
                  />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

    </Page>
  );
}
