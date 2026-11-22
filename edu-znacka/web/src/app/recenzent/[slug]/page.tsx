import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verejnyProfil } from "@/db/queries";
import { OBORY } from "@/lib/obory";
import { urlNahledu } from "@/lib/youtube";
import {
  Badge,
  Card,
  Heading,
  Hlavicka,
  InfoBox,
  Page,
  Paticka,
  ZnackaOvereno,
  formatDate,
  jmenoSTitulem,
} from "@/components/ui";

/**
 * Veřejný profil recenzenta.
 *
 * Tohle je ta nejsilnější kontrola celého projektu: kdo značce nevěří,
 * může si přečíst, kdo ji dal, čím se zabývá a co všechno kdy podepsal.
 * Proto se jméno, instituce a obory zveřejňují — se souhlasem, který
 * recenzent dává při vyplnění profilu.
 */
export async function generateMetadata({
  params,
}: PageProps<"/recenzent/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const profil = await verejnyProfil(slug);
  if (!profil) return { title: "Recenzent nenalezen" };

  return {
    title: jmenoSTitulem(profil.recenzent),
    description: `${profil.recenzent.instituce} — recenzent Edu značky.`,
  };
}

export default async function ProfilRecenzenta({
  params,
}: PageProps<"/recenzent/[slug]">) {
  const { slug } = await params;
  const profil = await verejnyProfil(slug);
  if (!profil) notFound();

  const { recenzent, recenze } = profil;

  return (
    <>
      <Hlavicka />
      <Page>
        <Heading sub={recenzent.instituce}>{jmenoSTitulem(recenzent)}</Heading>

        <Card className="mb-8">
          <dl className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted">Recenzuje v oborech:</dt>
              <dd className="flex flex-wrap gap-1.5">
                {recenzent.obory.map((o) => (
                  <Badge
                    key={o}
                    className="bg-overeno-bg text-overeno ring-overeno-line"
                  >
                    {OBORY[o as keyof typeof OBORY] ?? o}
                  </Badge>
                ))}
              </dd>
            </div>

            {recenzent.profilUrl ? (
              <div className="flex flex-wrap gap-2">
                <dt className="text-muted">Profil u instituce:</dt>
                <dd className="min-w-0 break-all">
                  <a
                    href={recenzent.profilUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline"
                  >
                    {recenzent.profilUrl}
                  </a>
                </dd>
              </div>
            ) : null}

            {recenzent.orcid ? (
              <div className="flex flex-wrap gap-2">
                <dt className="text-muted">ORCID iD:</dt>
                <dd>
                  <a
                    href={`https://orcid.org/${recenzent.orcid}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline"
                  >
                    {recenzent.orcid}
                  </a>
                </dd>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <dt className="text-muted">Recenzuje od:</dt>
              <dd>{formatDate(recenzent.schvalenoAt ?? recenzent.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        <h2 className="mb-3 text-lg font-semibold">
          Podepsané značky ({recenze.length})
        </h2>

        {recenze.length === 0 ? (
          <InfoBox>
            Zatím nepodepsal žádnou značku, která by platila. Posudky
            s opačným výsledkem se nezveřejňují.
          </InfoBox>
        ) : (
          <ul className="space-y-4">
            {recenze.map(({ recenze: r, video }) => (
              <li key={r.id}>
                <Card>
                  <div className="flex flex-wrap gap-4">
                    <Link href={`/video/${video.youtubeId}`} className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={urlNahledu(video.youtubeId)}
                        alt=""
                        width={160}
                        height={90}
                        className="h-[90px] w-[160px] rounded bg-background object-cover"
                        loading="lazy"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5">
                        <ZnackaOvereno
                          obor={OBORY[video.obor as keyof typeof OBORY]}
                        />
                      </div>
                      <Link
                        href={`/video/${video.youtubeId}`}
                        className="font-medium"
                      >
                        {video.nazev}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        {video.kanalNazev ? `${video.kanalNazev} · ` : ""}
                        posudek z {formatDate(r.createdAt)}
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm text-muted">
                        {r.zduvodneni}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Page>
      <Paticka />
    </>
  );
}
