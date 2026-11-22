import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { detailVidea } from "@/db/queries";
import { OBORY, UROVNE } from "@/lib/obory";
import { jeIdVidea, urlVidea } from "@/lib/youtube";
import {
  Card,
  Heading,
  Hlavicka,
  InfoBox,
  Page,
  Paticka,
  ZnackaKanal,
  ZnackaOvereno,
  formatDate,
  formatStari,
  jmenoSTitulem,
} from "@/components/ui";

/**
 * Detail videa — tam vede značka z rozšíření.
 *
 * Bez téhle stránky by byla značka jen nálepka, které se musí věřit. Tady
 * je vidět kdo, kdy, proč a z jakých zdrojů, a odkud se dá podat námitka.
 */
export async function generateMetadata({
  params,
}: PageProps<"/video/[youtubeId]">): Promise<Metadata> {
  const { youtubeId } = await params;
  const detail = await detailVidea(youtubeId);

  if (!detail) return { title: "Video nenalezeno" };

  return {
    title: detail.video.nazev,
    description:
      detail.video.stav === "overeno"
        ? `Ověřeno odborníkem z oboru ${
            OBORY[detail.video.obor as keyof typeof OBORY] ?? detail.video.obor
          }.`
        : "Toto video zatím nemá značku.",
    robots: detail.video.stav === "overeno" ? undefined : { index: false },
  };
}

export default async function DetailVidea({
  params,
}: PageProps<"/video/[youtubeId]">) {
  const { youtubeId } = await params;
  if (!jeIdVidea(youtubeId)) notFound();

  const detail = await detailVidea(youtubeId);
  if (!detail) notFound();

  const { video, kanal, recenze, staraZnacka } = detail;
  const oborLabel = OBORY[video.obor as keyof typeof OBORY] ?? video.obor;
  const maZnacku = video.stav === "overeno";

  return (
    <>
      <Hlavicka />
      <Page>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {maZnacku ? <ZnackaOvereno obor={oborLabel} /> : null}
          {kanal?.stav === "overeno" ? <ZnackaKanal /> : null}
        </div>

        <Heading
          sub={
            <>
              {video.kanalNazev ? `${video.kanalNazev} · ` : ""}
              {oborLabel} ·{" "}
              {UROVNE[video.uroven as keyof typeof UROVNE]?.label ?? video.uroven}
            </>
          }
        >
          {video.nazev}
        </Heading>

        <div className="mb-6 aspect-video w-full overflow-hidden rounded-xl border border-line bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
            title={video.nazev}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full"
          />
        </div>

        {!maZnacku ? (
          <div className="mb-6">
            <InfoBox>
              {video.stav === "pozastaveno" ? (
                <>
                  <strong>Značka je pozastavená</strong>, protože k videu
                  přišla námitka. Dokud ji neprojdeme, nezobrazuje se ani
                  v rozšíření.
                </>
              ) : video.stav === "ceka" ? (
                <>
                  <strong>Tohle video zatím nikdo neposuzoval.</strong> Je ve
                  frontě pro odborníky z oboru {oborLabel}. Že nemá značku,
                  neznamená, že je špatné — jen že na něj ještě nikdo nedošel.
                </>
              ) : (
                <>
                  <strong>Tohle video značku nemá.</strong> Proč, tu
                  nezveřejňujeme: projekt záměrně neoznačuje videa jako
                  špatná, protože takové tvrzení o jmenovaném autorovi by
                  muselo být doložitelné a vyvratitelné. Značku mají jen
                  videa, u kterých někdo z oboru podepsal, že obsah odpovídá
                  konsenzu.
                </>
              )}
            </InfoBox>
          </div>
        ) : null}

        {staraZnacka && maZnacku ? (
          <div className="mb-6">
            <InfoBox>
              Tahle značka je <strong>{formatStari(video.overenoAt)}</strong>.
              Konsenzus se posouvá a video se dá po nahrání zkrátit, takže
              je ve frontě na nové přečtení.
            </InfoBox>
          </div>
        ) : null}

        {recenze.length > 0 ? (
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">
              {recenze.length === 1 ? "Posudek" : `Posudky (${recenze.length})`}
            </h2>
            <ul className="space-y-4">
              {recenze.map(({ recenze: r, recenzent }) => (
                <li key={r.id}>
                  <Card>
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <Link
                          href={`/recenzent/${recenzent.slug}`}
                          className="font-medium underline"
                        >
                          {jmenoSTitulem(recenzent)}
                        </Link>
                        <p className="text-sm text-muted">
                          {recenzent.instituce}
                          {recenzent.orcid ? (
                            <>
                              {" · "}
                              <a
                                href={`https://orcid.org/${recenzent.orcid}`}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="underline"
                              >
                                ORCID
                              </a>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <p className="text-sm text-muted">
                        {formatDate(r.createdAt)}
                      </p>
                    </div>

                    <p className="whitespace-pre-wrap text-sm">{r.zduvodneni}</p>

                    {r.zdroje ? (
                      <div className="mt-3 border-t border-line pt-3">
                        <p className="mb-1 text-xs font-medium text-muted">
                          Zdroje
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-muted">
                          {r.zdroje}
                        </p>
                      </div>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {kanal?.stav === "overeno" && kanal.poznamka ? (
          <Card className="mb-6">
            <h2 className="mb-2 font-semibold">
              Kanál {kanal.nazev} je označený jako důvěryhodný
            </h2>
            <p className="text-sm text-muted">{kanal.poznamka}</p>
            <p className="mt-2 text-xs text-muted">
              Tohle je slabší tvrzení než posudek videa a uděluje ho správce,
              ne odborník. Znamená to „kanál dlouhodobě drží úroveň“, ne
              „tohle video někdo přečetl“.
            </p>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-4 text-sm">
          <a
            href={urlVidea(video.youtubeId)}
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            Otevřít na YouTube
          </a>
          {maZnacku ? (
            <Link href={`/namitka?video=${video.youtubeId}`} className="underline">
              Nesouhlasím se značkou
            </Link>
          ) : null}
          <Link href="/katalog" className="underline">
            Zpět do katalogu
          </Link>
        </div>
      </Page>
      <Paticka />
    </>
  );
}
