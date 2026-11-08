import Link from "next/link";
import { getOpenTickets } from "@/db/queries";
import {
  PRIORITY_BADGE,
  STATUS_BADGE,
  categoryLabel,
  priorityLabel,
  statusLabel,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/statuses";
import {
  Badge,
  Card,
  Heading,
  InfoBox,
  Page,
  formatAge,
} from "@/components/ui";

/**
 * Fronta „co mám udělat“.
 *
 * Řazeno podle priority a v rámci priority od nejstaršího — co leží nejdéle,
 * je nahoře. Záměrně jeden plochý seznam, ne sloupce po stavech: na mobilu
 * se v něm dá projít prstem shora dolů.
 */
export default async function AdminQueuePage() {
  const tickets = await getOpenTickets();

  return (
    <Page width="wide">
      <Heading
        sub={
          tickets.length === 0
            ? undefined
            : "Nahoře to, co spěchá a leží nejdéle."
        }
      >
        Co mám udělat{tickets.length > 0 ? ` (${tickets.length})` : ""}
      </Heading>

      {tickets.length === 0 ? (
        <Card>
          <InfoBox>
            Fronta je prázdná. Všechno nahlášené je vyřešené.
          </InfoBox>
        </Card>
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/admin/tiket/${ticket.code}`}
                className="block rounded-xl border border-line bg-surface p-4 hover:border-accent/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <span className="font-medium">{ticket.title}</span>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Badge
                      className={PRIORITY_BADGE[ticket.priority as TicketPriority]}
                    >
                      {priorityLabel(ticket.priority).split(" —")[0]}
                    </Badge>
                    <Badge
                      className={STATUS_BADGE[ticket.status as TicketStatus]}
                    >
                      {statusLabel(ticket.status)}
                    </Badge>
                  </div>
                </div>

                <p className="mt-2 text-xs text-muted">
                  <span className="font-medium text-foreground">
                    {ticket.location}
                  </span>{" "}
                  · {categoryLabel(ticket.category)} ·{" "}
                  {ticket.requesterName ?? ticket.requesterEmail} · leží{" "}
                  {formatAge(ticket.createdAt)} · {ticket.code}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
