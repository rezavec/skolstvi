import Link from "next/link";
import { prepniZnackuAkce, zmenZarazeniVideaAkce } from "@/actions/admin";
import { vsechnaVidea } from "@/db/queries";
import { OBORY, STAVY_VIDEA, UROVNE } from "@/lib/obory";
import { urlVidea } from "@/lib/youtube";
import { VyberOboru, VyberUrovne } from "@/components/vybery";
import {
  Badge,
  Card,
  Heading,
  InfoBox,
  Page,
  ZnackaOvereno,
  buttonSecondaryClass,
  formatDate,
} from "@/components/ui";
import { PridatVideoForm } from "./forms";

export const metadata = { title: "Videa", robots: { index: false } };

export default async function AdminVidea() {
  const videa = await vsechnaVidea();

  return (
    <Page width="wide">
      <Heading sub="Přidání videa znamená „tohle by si zasloužilo posudek“, ne „tohle je ověřené“. Značku dává jedině recenzent z oboru.">
        Videa
      </Heading>

      <Card className="mb-8">
        <PridatVideoForm />
      </Card>

      {videa.length === 0 ? (
        <InfoBox>
          Zatím tu není žádné video. Přidej první — pak ho uvidí recenzenti
          z jeho oboru ve své frontě.
        </InfoBox>
      ) : (
        <ul className="space-y-3">
          {videa.map((v) => (
            <li key={v.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {v.stav === "overeno" ? (
                        <ZnackaOvereno obor={OBORY[v.obor as keyof typeof OBORY]} />
                      ) : (
                        <Badge className="bg-background text-muted ring-line">
                          {STAVY_VIDEA[v.stav as keyof typeof STAVY_VIDEA]?.label ??
                            v.stav}
                        </Badge>
                      )}
                      {v.znackaOdebranaAt ? (
                        <Badge className="bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900">
                          značka odebrána {formatDate(v.znackaOdebranaAt)}
                        </Badge>
                      ) : null}
                    </div>

                    <p className="mt-2 font-medium">{v.nazev}</p>
                    <p className="text-sm text-muted">
                      {v.kanalNazev ? `${v.kanalNazev} · ` : ""}
                      {UROVNE[v.uroven as keyof typeof UROVNE]?.label ?? v.uroven}
                      {v.overenoAt ? ` · ověřeno ${formatDate(v.overenoAt)}` : ""}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-3 text-sm">
                      <a
                        href={urlVidea(v.youtubeId)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline"
                      >
                        na YouTube
                      </a>
                      <Link href={`/video/${v.youtubeId}`} className="underline">
                        detail a recenze
                      </Link>
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <form action={zmenZarazeniVideaAkce} className="flex flex-wrap gap-2">
                      <input type="hidden" name="youtubeId" value={v.youtubeId} />
                      <VyberOboru id={`obor-${v.id}`} defaultValue={v.obor} />
                      <VyberUrovne id={`uroven-${v.id}`} defaultValue={v.uroven} />
                      <button type="submit" className={buttonSecondaryClass}>
                        Přeřadit
                      </button>
                    </form>

                    <form action={prepniZnackuAkce}>
                      <input type="hidden" name="youtubeId" value={v.youtubeId} />
                      <input
                        type="hidden"
                        name="odebrat"
                        value={v.znackaOdebranaAt ? "ne" : "ano"}
                      />
                      <button type="submit" className={buttonSecondaryClass}>
                        {v.znackaOdebranaAt
                          ? "Zrušit odebrání značky"
                          : "Odebrat značku ručně"}
                      </button>
                    </form>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
