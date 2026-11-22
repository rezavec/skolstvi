import Link from "next/link";
import { vsichniRecenzenti } from "@/db/queries";
import { OBORY, STAVY_RECENZENTA } from "@/lib/obory";
import {
  Badge,
  Card,
  Heading,
  InfoBox,
  Page,
  formatDate,
  jmenoSTitulem,
} from "@/components/ui";
import { RozhodnutiForm } from "./forms";

export const metadata = { title: "Recenzenti", robots: { index: false } };

/** Jaká rozhodnutí má smysl nabízet podle současného stavu. */
function moznostiPro(stav: string) {
  switch (stav) {
    case "ceka":
      return [
        { hodnota: "schvalit", text: "Schválit" },
        { hodnota: "zamitnout", text: "Zamítnout" },
      ];
    case "schvalen":
      return [{ hodnota: "pozastavit", text: "Pozastavit" }];
    default:
      return [{ hodnota: "obnovit", text: "Obnovit" }];
  }
}

export default async function AdminRecenzenti() {
  const vsichni = await vsichniRecenzenti();

  // Prázdné záznamy = někdo klikl na přihlašovací odkaz a profil nedokončil.
  // Ve frontě jen překážejí.
  const nedokoncene = vsichni.filter((r) => r.jmeno === "");
  const skutecne = vsichni.filter((r) => r.jmeno !== "");

  /**
   * Jeden seznam, ne dva.
   *
   * Kdyby byly čekající a vyřízení ve dvou `<ul>`, přesunula by se karta po
   * schválení z jednoho do druhého, React by komponentu odmontoval a s ní
   * by zmizel i výsledek akce — včetně upozornění, že se nepodařilo odeslat
   * e-mail. V jednom seznamu se karta podle `key` jen přesune a stav
   * zůstane.
   */
  const cekajici = skutecne.filter((r) => r.stav === "ceka");
  const serazeni = [
    ...cekajici,
    ...skutecne.filter((r) => r.stav !== "ceka"),
  ];

  return (
    <Page width="wide">
      <Heading sub="Tady se rozhoduje, čí podpis má váhu. Akademický e-mail dokazuje jen to, že někdo ovládá adresu na instituci — že je to ten člověk a že se oborem zabývá, musíš dohledat ty.">
        Recenzenti
      </Heading>

      <InfoBox>
        <strong>Než někoho schválíš:</strong> otevři jeho odkaz na profil
        u instituce a zkontroluj, že ta stránka existuje, že jméno souhlasí
        a že zaměření odpovídá oborům, které si zvolil. U ORCID se podívej,
        jestli tam jsou publikace z toho oboru. Schválení znamená, že jeho
        jméno bude veřejně stát za každou značkou, kterou dá.
      </InfoBox>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">
          {cekajici.length > 0
            ? `Čeká na vyřízení: ${cekajici.length}`
            : "Žádná nová žádost"}
        </h2>

        {serazeni.length === 0 ? (
          <InfoBox>Zatím se nikdo nepřihlásil.</InfoBox>
        ) : (
          <ul className="space-y-3">
            {serazeni.map((r) => (
              <li key={r.id}>
                <Card
                  className={
                    r.stav === "ceka" ? "border-accent" : "opacity-80"
                  }
                >
                  <Zaznam recenzent={r} />
                  <RozhodnutiForm recenzentId={r.id} moznosti={moznostiPro(r.stav)} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {nedokoncene.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-2 text-lg font-semibold">
            Nedokončené registrace ({nedokoncene.length})
          </h2>
          <p className="mb-3 text-sm text-muted">
            Někdo klikl na přihlašovací odkaz a profil nevyplnil. Nic se s tím
            dělat nemusí.
          </p>
          <Card>
            <ul className="space-y-1 text-sm text-muted">
              {nedokoncene.map((r) => (
                <li key={r.id}>
                  {r.email} — {formatDate(r.createdAt)}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </Page>
  );
}

function Zaznam({
  recenzent: r,
}: {
  recenzent: Awaited<ReturnType<typeof vsichniRecenzenti>>[number];
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge className="bg-background text-muted ring-line">
          {STAVY_RECENZENTA[r.stav as keyof typeof STAVY_RECENZENTA]?.label ??
            r.stav}
        </Badge>
        {r.obory.map((o) => (
          <Badge key={o} className="bg-overeno-bg text-overeno ring-overeno-line">
            {OBORY[o as keyof typeof OBORY] ?? o}
          </Badge>
        ))}
      </div>

      <p className="font-medium">{jmenoSTitulem(r)}</p>
      <p className="text-sm text-muted">{r.instituce}</p>

      <dl className="mt-2 space-y-1 text-sm">
        <Radek popis="E-mail">
          {/* Neveřejné — vidí ho jen správce v administraci. */}
          <code className="text-xs">{r.email}</code>
        </Radek>
        <Radek popis="Profil u instituce">
          {r.profilUrl ? (
            <a
              href={r.profilUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="underline"
            >
              {r.profilUrl}
            </a>
          ) : (
            <span className="text-muted">neuveden</span>
          )}
        </Radek>
        <Radek popis="ORCID">
          {r.orcid ? (
            <a
              href={`https://orcid.org/${r.orcid}`}
              target="_blank"
              rel="noreferrer noopener"
              className="underline"
            >
              {r.orcid}
            </a>
          ) : (
            <span className="text-muted">neuveden</span>
          )}
        </Radek>
        <Radek popis="Žádost z">{formatDate(r.createdAt)}</Radek>
        {r.stav === "schvalen" ? (
          <Radek popis="Veřejný profil">
            <Link href={`/recenzent/${r.slug}`} className="underline">
              /recenzent/{r.slug}
            </Link>
          </Radek>
        ) : null}
        {r.duvod ? <Radek popis="Důvod">{r.duvod}</Radek> : null}
      </dl>
    </div>
  );
}

function Radek({ popis, children }: { popis: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-muted">{popis}:</dt>
      <dd className="min-w-0 break-all">{children}</dd>
    </div>
  );
}
