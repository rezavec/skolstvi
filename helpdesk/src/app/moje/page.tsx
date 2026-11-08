import Link from "next/link";
import { redirect } from "next/navigation";
import { getTicketsByRequester } from "@/db/queries";
import { getRequesterEmail } from "@/lib/session";
import { logout } from "@/actions/login";
import {
  STATUS_BADGE,
  statusLabel,
  type TicketStatus,
} from "@/lib/statuses";
import {
  Badge,
  Card,
  Heading,
  InfoBox,
  Page,
  buttonClass,
  buttonSecondaryClass,
  formatDate,
} from "@/components/ui";

/** Přehled vlastních tiketů — „co jsem nahlásil a jak to vypadá“. */
export default async function MyTicketsPage() {
  const email = await getRequesterEmail();
  if (!email) {
    redirect("/");
  }

  const tickets = await getTicketsByRequester(email);

  return (
    <Page>
      <Heading sub={`Přihlášen jako ${email}`}>Moje závady</Heading>

      {tickets.length === 0 ? (
        <Card>
          <InfoBox>Zatím jsi nic nenahlásil.</InfoBox>
          <div className="mt-4">
            <Link href="/nahlasit" className={buttonClass}>
              Nahlásit závadu
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <ul className="space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/moje/${ticket.code}`}
                  className="block rounded-xl border border-line bg-surface p-4 hover:border-accent/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{ticket.title}</span>
                    <Badge
                      className={STATUS_BADGE[ticket.status as TicketStatus]}
                    >
                      {statusLabel(ticket.status)}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    {ticket.code} · {ticket.location} ·{" "}
                    {formatDate(ticket.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/nahlasit" className={buttonSecondaryClass}>
              Nahlásit další závadu
            </Link>
            <form action={logout}>
              <button type="submit" className={buttonSecondaryClass}>
                Odhlásit se
              </button>
            </form>
          </div>
        </>
      )}
    </Page>
  );
}
