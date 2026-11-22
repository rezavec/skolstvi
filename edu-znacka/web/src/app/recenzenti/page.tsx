import type { Metadata } from "next";
import Link from "next/link";
import { recenzentiPodleStavu } from "@/db/queries";
import { OBORY } from "@/lib/obory";
import {
  Badge,
  Card,
  Heading,
  Hlavicka,
  InfoBox,
  Page,
  Paticka,
  jmenoSTitulem,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Recenzenti",
  description:
    "Odborníci, kteří udělují Edu značku — jmenovitě, s institucí a obory.",
};

export const revalidate = 3600;

export default async function Recenzenti() {
  const schvaleni = await recenzentiPodleStavu("schvalen");

  return (
    <>
      <Hlavicka />
      <Page>
        <Heading sub="Značku „ověřeno“ uděluje jedině někdo z tohohle seznamu, a vždy jen ve svém oboru.">
          Recenzenti
        </Heading>

        {schvaleni.length === 0 ? (
          <InfoBox>
            <strong>Zatím tu není nikdo.</strong> Projekt začíná a recenzenti
            se zvou postupně. Dokud nebude ani jeden, žádné video značku
            nedostane — tak je pravidlo postavené schválně.{" "}
            <Link href="/pro-odborniky" className="underline">
              Chci recenzovat
            </Link>
          </InfoBox>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {schvaleni.map((r) => (
              <li key={r.id}>
                <Card className="h-full">
                  <Link
                    href={`/recenzent/${r.slug}`}
                    className="font-medium underline"
                  >
                    {jmenoSTitulem(r)}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted">{r.instituce}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.obory.map((o) => (
                      <Badge
                        key={o}
                        className="bg-overeno-bg text-overeno ring-overeno-line"
                      >
                        {OBORY[o as keyof typeof OBORY] ?? o}
                      </Badge>
                    ))}
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
