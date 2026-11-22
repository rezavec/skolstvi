import { prihlasenyRecenzent } from "@/lib/auth";
import { Card, Heading, InfoBox, Page } from "@/components/ui";
import { ProfilForm } from "./form";

export const metadata = { title: "Můj profil", robots: { index: false } };

export default async function Profil() {
  const recenzent = await prihlasenyRecenzent();
  if (!recenzent) return null;

  const prvniVyplneni = recenzent.jmeno === "";

  return (
    <Page>
      <Heading
        sub={
          prvniVyplneni
            ? "Vyplněním profilu podáváš žádost o recenzování. Projdeme ji ručně."
            : "Úprava profilu schválení neruší — oprava překlepu neshodí tvoje značky."
        }
      >
        {prvniVyplneni ? "Žádost o recenzování" : "Můj profil"}
      </Heading>

      {prvniVyplneni ? (
        <div className="mb-6">
          <InfoBox>
            Přihlášený jsi jako <code>{recenzent.email}</code>. Tahle adresa
            se nikde nezveřejňuje — slouží jen k přihlášení a k tomu, abychom
            ti mohli napsat.
          </InfoBox>
        </div>
      ) : null}

      <Card>
        <ProfilForm
          prvniVyplneni={prvniVyplneni}
          vychozi={{
            jmeno: recenzent.jmeno,
            titul: recenzent.titul,
            instituce: recenzent.instituce,
            orcid: recenzent.orcid,
            profilUrl: recenzent.profilUrl,
            obory: recenzent.obory,
            jeSouhlas: recenzent.souhlasZverejneni !== null,
          }}
        />
      </Card>
    </Page>
  );
}
