import type { Metadata } from "next";
import Link from "next/link";
import { katalog, oboryVKatalogu } from "@/db/queries";
import { OBORY, OBORY_PORADI, UROVNE, UROVNE_PORADI } from "@/lib/obory";
import { urlNahledu } from "@/lib/youtube";
import { katalogFiltrSchema } from "@/lib/validation";
import {
  Card,
  Heading,
  Hlavicka,
  InfoBox,
  Page,
  Paticka,
  ZnackaOvereno,
  formatDate,
  inputClass,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Katalog ověřených videí",
  description:
    "Videa, u kterých odborník z oboru potvrdil, že odpovídají současnému " +
    "vědeckému konsenzu. Filtr podle oboru a úrovně.",
};

/**
 * Katalog je to místo, kde „surfování jen po ověřených videích“ opravdu
 * funguje. Na homepage YouTube by při malé databázi zbyla prázdná stránka —
 * rozšíření dává značky v kontextu, katalog je cesta, jak videa objevovat.
 */
export default async function Katalog({ searchParams }: PageProps<"/katalog">) {
  const raw = await searchParams;
  const filtr = katalogFiltrSchema.parse({
    obor: prvni(raw.obor),
    uroven: prvni(raw.uroven),
    hledat: prvni(raw.hledat),
    strana: prvni(raw.strana),
  });

  const [vysledek, obory] = await Promise.all([
    katalog(filtr),
    oboryVKatalogu(),
  ]);

  const pocty = new Map(obory.map((o) => [o.obor, o.pocet]));

  return (
    <>
      <Hlavicka />
      <Page width="wide">
        <Heading sub="Jen videa, u kterých odborník z oboru podepsal, že obsah odpovídá současnému konsenzu. U každého je vidět kdo, kdy a proč.">
          Katalog
        </Heading>

        <form className="mb-6 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <div>
            <label htmlFor="hledat" className="sr-only">
              Hledat v názvech
            </label>
            <input
              id="hledat"
              name="hledat"
              defaultValue={filtr.hledat ?? ""}
              placeholder="Hledat v názvu nebo kanálu…"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="obor" className="sr-only">
              Obor
            </label>
            <select
              id="obor"
              name="obor"
              defaultValue={filtr.obor ?? ""}
              className={inputClass}
            >
              <option value="">Všechny obory</option>
              {OBORY_PORADI.filter((o) => pocty.has(o)).map((o) => (
                <option key={o} value={o}>
                  {OBORY[o]} ({pocty.get(o)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="uroven" className="sr-only">
              Pro koho
            </label>
            <select
              id="uroven"
              name="uroven"
              defaultValue={filtr.uroven ?? ""}
              className={inputClass}
            >
              <option value="">Pro kohokoli</option>
              {UROVNE_PORADI.map((u) => (
                <option key={u} value={u}>
                  {UROVNE[u].label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg border border-line bg-surface px-4 py-2.5 font-medium"
          >
            Filtrovat
          </button>
        </form>

        {vysledek.celkem === 0 ? (
          <InfoBox>
            {filtr.hledat || filtr.obor || filtr.uroven ? (
              <>
                Tomuhle filtru nic neodpovídá.{" "}
                <Link href="/katalog" className="underline">
                  Zrušit filtr
                </Link>
                .
              </>
            ) : (
              <>
                <strong>Katalog je zatím prázdný.</strong> Značku dostane
                video až po posudku odborníka z oboru — a těch je na začátku
                pár. Pokud na fakultu dosáhneš,{" "}
                <Link href="/pro-odborniky" className="underline">
                  pošli tam odkaz
                </Link>
                .
              </>
            )}
          </InfoBox>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              {vysledek.celkem}{" "}
              {vysledek.celkem === 1
                ? "ověřené video"
                : vysledek.celkem < 5
                  ? "ověřená videa"
                  : "ověřených videí"}
            </p>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vysledek.videa.map((v) => (
                <li key={v.id}>
                  <Card className="flex h-full flex-col gap-3">
                    <Link href={`/video/${v.youtubeId}`} className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={urlNahledu(v.youtubeId)}
                        alt=""
                        width={320}
                        height={180}
                        className="aspect-video w-full rounded bg-background object-cover"
                        loading="lazy"
                      />
                    </Link>
                    <div>
                      <ZnackaOvereno obor={OBORY[v.obor as keyof typeof OBORY]} />
                    </div>
                    <Link href={`/video/${v.youtubeId}`} className="font-medium">
                      {v.nazev}
                    </Link>
                    <p className="mt-auto text-xs text-muted">
                      {v.kanalNazev ? `${v.kanalNazev} · ` : ""}
                      {UROVNE[v.uroven as keyof typeof UROVNE]?.label}
                      {" · ověřeno "}
                      {formatDate(v.overenoAt)}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>

            {vysledek.stran > 1 ? (
              <nav className="mt-8 flex flex-wrap items-center gap-2 text-sm">
                {Array.from({ length: vysledek.stran }, (_, i) => i + 1).map((s) => (
                  <Link
                    key={s}
                    href={`/katalog?${dotaz({ ...filtr, strana: s })}`}
                    aria-current={s === vysledek.strana ? "page" : undefined}
                    className={`rounded-lg border px-3 py-1.5 ${
                      s === vysledek.strana
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-line bg-surface"
                    }`}
                  >
                    {s}
                  </Link>
                ))}
              </nav>
            ) : null}
          </>
        )}
      </Page>
      <Paticka />
    </>
  );
}

function prvni(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function dotaz(filtr: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [klic, hodnota] of Object.entries(filtr)) {
    if (hodnota !== undefined && hodnota !== "") params.set(klic, String(hodnota));
  }
  return params.toString();
}
