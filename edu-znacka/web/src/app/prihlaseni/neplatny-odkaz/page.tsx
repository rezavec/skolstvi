import Link from "next/link";
import { Card, Heading, Page, Hlavicka } from "@/components/ui";

export const metadata = { title: "Odkaz už neplatí" };

export default function NeplatnyOdkaz() {
  return (
    <>
      <Hlavicka />
      <Page width="narrow">
        <Heading>Odkaz už neplatí</Heading>
        <Card>
          <p className="text-sm">Může to mít tři důvody:</p>
          <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-muted">
            <li>odkaz je starší než 30 minut,</li>
            <li>už byl použitý (platí jen jednou),</li>
            <li>nebo je zkopírovaný jen částečně.</li>
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/pro-odborniky" className="underline">
              Nech si poslat nový odkaz
            </Link>
            .
          </p>
        </Card>
      </Page>
    </>
  );
}
