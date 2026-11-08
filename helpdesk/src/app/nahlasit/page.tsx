import Link from "next/link";
import { redirect } from "next/navigation";
import { getRequesterEmail } from "@/lib/session";
import { getTicketsByRequester } from "@/db/queries";
import { Heading, Page } from "@/components/ui";
import { TicketForm } from "./ticket-form";

/** Formulář na nahlášení závady. Dostupný jen po kliknutí na magic link. */
export default async function NewTicketPage() {
  const email = await getRequesterEmail();
  if (!email) {
    redirect("/");
  }

  const existing = await getTicketsByRequester(email);

  return (
    <Page>
      <Heading sub={`Přihlášen jako ${email}`}>Nahlásit závadu</Heading>

      {existing.length > 0 ? (
        <p className="mb-6 text-sm text-muted">
          Máš tu {existing.length === 1 ? "jeden tiket" : `${existing.length} tiketů`}.{" "}
          <Link href="/moje" className="font-medium underline underline-offset-2">
            Podívat se na stav
          </Link>
        </p>
      ) : null}

      <TicketForm />
    </Page>
  );
}
