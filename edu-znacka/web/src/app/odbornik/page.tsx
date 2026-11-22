import Link from "next/link";
import { recenzeRecenzenta, videaKRecenzi } from "@/db/queries";
import { prihlasenyRecenzent } from "@/lib/auth";
import { OBORY, UROVNE, VERDIKTY } from "@/lib/obory";
import { urlNahledu, urlVidea } from "@/lib/youtube";
import {
  Badge,
  Card,
  Heading,
  InfoBox,
  Page,
  ZnackaOvereno,
  formatDate,
} from "@/components/ui";

export const metadata = { title: "K recenzi", robots: { index: false } };

export default async function OdbornikFronta() {
  const recenzent = await prihlasenyRecenzent();
  if (!recenzent) return null;

  if (recenzent.jmeno === "") {
    return (
      <Page>
        <Heading>Ještě jeden krok</Heading>
        <InfoBox>
          Nejdřív prosím{" "}
          <Link href="/odbornik/profil" className="underline">
            vyplň profil
          </Link>{" "}
          — bez jména a instituce nemá značka komu patřit.
        </InfoBox>
      </Page>
    );
  }

  if (recenzent.stav !== "schvalen") {
    return (
      <Page>
        <Heading sub="Jméno, titul a instituci kontrolujeme ručně proti stránkám instituce.">
          {recenzent.stav === "ceka" ? "Žádost čeká" : "Účet není aktivní"}
        </Heading>
        <InfoBox>
          {recenzent.stav === "ceka" ? (
            <>
              Tvoje žádost je podaná a čeká na projití. Ozveme se e-mailem.
              Mezitím si můžeš{" "}
              <Link href="/odbornik/profil" className="underline">
                upravit profil
              </Link>
              .
            </>
          ) : (
            <>
              Tvůj účet je {recenzent.stav === "zamitnut" ? "zamítnutý" : "pozastavený"}.
              {recenzent.duvod ? (
                <>
                  {" "}
                  Důvod: <strong>{recenzent.duvod}</strong>
                </>
              ) : null}{" "}
              Pokud je to omyl, odpověz na e-mail, který ti přišel.
            </>
          )}
        </InfoBox>
      </Page>
    );
  }

  const [fronta, moje] = await Promise.all([
    videaKRecenzi(recenzent.id, recenzent.obory),
    recenzeRecenzenta(recenzent.id),
  ]);

  return (
    <Page width="wide">
      <Heading
        sub={`Videa z tvých oborů (${recenzent.obory
          .map((o) => OBORY[o as keyof typeof OBORY] ?? o)
          .join(", ")}), která jsi ještě neposuzoval.`}
      >
        K recenzi
      </Heading>

      {fronta.length === 0 ? (
        <InfoBox>
          Nic nového. Jakmile správce přidá video z tvého oboru, objeví se
          tady. Narazil jsi na video, které by si posudek zasloužilo? Pošli
          odkaz správci — přidat ho do fronty může jen on, aby se hlídalo
          zařazení do oborů.
        </InfoBox>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {fronta.map((v) => (
            <li key={v.id}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urlNahledu(v.youtubeId)}
                    alt=""
                    width={120}
                    height={90}
                    className="h-[68px] w-[120px] shrink-0 rounded bg-background object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-medium">{v.nazev}</p>
                    <p className="mt-1 text-xs text-muted">
                      {v.kanalNazev ? `${v.kanalNazev} · ` : ""}
                      {UROVNE[v.uroven as keyof typeof UROVNE]?.label}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-3 text-sm">
                  <Link
                    href={`/odbornik/recenze/${v.youtubeId}`}
                    className="font-medium underline"
                  >
                    Napsat posudek
                  </Link>
                  <a
                    href={urlVidea(v.youtubeId)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted underline"
                  >
                    pustit na YouTube
                  </a>
                  {v.stav === "overeno" ? (
                    <span className="ml-auto">
                      <ZnackaOvereno />
                    </span>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {moje.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-3 text-lg font-semibold">
            Moje posudky ({moje.length})
          </h2>
          <ul className="space-y-2">
            {moje.map(({ recenze, video }) => (
              <li key={recenze.id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{video.nazev}</p>
                      <p className="text-sm text-muted">
                        {formatDate(recenze.createdAt)} ·{" "}
                        {VERDIKTY[recenze.verdikt as keyof typeof VERDIKTY]?.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {video.stav === "overeno" ? (
                        <ZnackaOvereno
                          obor={OBORY[video.obor as keyof typeof OBORY]}
                        />
                      ) : (
                        <Badge className="bg-background text-muted ring-line">
                          bez značky
                        </Badge>
                      )}
                      <Link
                        href={`/odbornik/recenze/${video.youtubeId}`}
                        className="text-sm underline"
                      >
                        upravit
                      </Link>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Page>
  );
}
