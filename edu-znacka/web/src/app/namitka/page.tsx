import type { Metadata } from "next";
import { idVidea } from "@/lib/youtube";
import {
  Card,
  Heading,
  Hlavicka,
  InfoBox,
  Page,
  Paticka,
} from "@/components/ui";
import { NamitkaForm } from "./form";

export const metadata: Metadata = {
  title: "Námitka proti značce",
  description:
    "Nesouhlasíš s tím, že video má značku „ověřeno“? Napiš nám — značka se " +
    "do vyřízení pozastaví.",
  robots: { index: false },
};

export default async function Namitka({ searchParams }: PageProps<"/namitka">) {
  const raw = await searchParams;
  const param = Array.isArray(raw.video) ? raw.video[0] : raw.video;
  const youtubeId = param ? (idVidea(param) ?? "") : "";

  return (
    <>
      <Hlavicka />
      <Page width="narrow">
        <Heading sub="Značka se pozastaví okamžitě, ještě než námitku kdokoli posoudí.">
          Nesouhlasím se značkou
        </Heading>

        <div className="mb-6">
          <InfoBox>
            Bez téhle cesty zpátky by byla značka nevyvratitelná, a to si
            u tvrzení o vědeckém konsenzu nemůže dovolit nikdo. Platí to pro
            kohokoli — pro autora videa, pro učitele, který narazil na chybu,
            i pro odborníka, který s posudkem kolegy nesouhlasí.
          </InfoBox>
        </div>

        <Card>
          <NamitkaForm youtubeId={youtubeId} />
        </Card>

        <p className="mt-6 text-sm text-muted">
          Tohle není místo na stížnost, že video <em>nemá</em> značku —
          nejčastěji na něj jen ještě nikdo z oboru nedošel. Značku se dá
          získat jedině posudkem, ne na vyžádání.
        </p>
      </Page>
      <Paticka />
    </>
  );
}
