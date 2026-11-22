import Link from "next/link";
import { notFound } from "next/navigation";
import { najdiRecenzi, najdiVideo } from "@/db/queries";
import { prihlasenyRecenzent } from "@/lib/auth";
import { OBORY, UROVNE } from "@/lib/obory";
import { urlVidea } from "@/lib/youtube";
import { Card, Heading, InfoBox, Page, jmenoSTitulem } from "@/components/ui";
import { RecenzeForm } from "./form";

export const metadata = { title: "Posudek videa", robots: { index: false } };

export default async function RecenzePage({
  params,
}: PageProps<"/odbornik/recenze/[youtubeId]">) {
  const { youtubeId } = await params;

  const recenzent = await prihlasenyRecenzent();
  if (!recenzent) return null;

  const video = await najdiVideo(youtubeId);
  if (!video) notFound();

  const oborLabel = OBORY[video.obor as keyof typeof OBORY] ?? video.obor;
  const smiRecenzovat =
    recenzent.stav === "schvalen" && recenzent.obory.includes(video.obor);

  const stavajici = await najdiRecenzi(video.id, recenzent.id);

  return (
    <Page>
      <Heading
        sub={
          <>
            {video.kanalNazev ? `${video.kanalNazev} · ` : ""}
            {oborLabel} · {UROVNE[video.uroven as keyof typeof UROVNE]?.label}
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
      <p className="mb-8 text-sm text-muted">
        Přehrávač je z youtube-nocookie.com.{" "}
        <a
          href={urlVidea(video.youtubeId)}
          target="_blank"
          rel="noreferrer noopener"
          className="underline"
        >
          Otevřít na YouTube
        </a>
      </p>

      {!smiRecenzovat ? (
        <InfoBox>
          {recenzent.stav !== "schvalen" ? (
            <>
              Tvůj účet není schválený, takže posudek zatím uložit nejde. Stav
              najdeš{" "}
              <Link href="/odbornik" className="underline">
                tady
              </Link>
              .
            </>
          ) : (
            <>
              Tohle video je zařazené do oboru <strong>{oborLabel}</strong>,
              který nemáš mezi svými. Pokud se jím zabýváš, přidej si ho{" "}
              <Link href="/odbornik/profil" className="underline">
                v profilu
              </Link>
              . Když je video zařazené špatně, napiš správci — přeřadit ho
              může jen on.
            </>
          )}
        </InfoBox>
      ) : (
        <Card>
          <p className="mb-5 text-sm text-muted">
            Posudek podepisuješ jako{" "}
            <strong className="text-foreground">{jmenoSTitulem(recenzent)}</strong>
            , {recenzent.instituce}. U značky bude tvoje jméno, obor a datum.
          </p>
          <RecenzeForm
            youtubeId={video.youtubeId}
            obor={video.obor}
            oborLabel={oborLabel}
            vychozi={
              stavajici
                ? {
                    verdikt: stavajici.verdikt,
                    zduvodneni: stavajici.zduvodneni,
                    zdroje: stavajici.zdroje,
                  }
                : null
            }
          />
        </Card>
      )}
    </Page>
  );
}
