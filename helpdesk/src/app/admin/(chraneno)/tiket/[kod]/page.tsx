import Link from "next/link";
import { notFound } from "next/navigation";
import { getTicketByCode, getTicketEvents } from "@/db/queries";
import { normalizeTicketCode } from "@/lib/ticket-code";
import {
  PRIORITY_BADGE,
  STATUS_BADGE,
  categoryLabel,
  priorityLabel,
  statusLabel,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/statuses";
import { Timeline } from "@/components/timeline";
import {
  Badge,
  Card,
  Heading,
  Page,
  formatDateTime,
  formatMinutes,
} from "@/components/ui";
import { AdminNoteForms, StatusForm } from "./forms";

/** Detail tiketu pro správce IT: změna stavu, zápis práce, komunikace. */
export default async function AdminTicketPage(
  props: PageProps<"/admin/tiket/[kod]">,
) {
  const { kod } = await props.params;
  const ticket = await getTicketByCode(normalizeTicketCode(kod));

  if (!ticket) {
    notFound();
  }

  // Admin vidí i interní poznámky
  const events = await getTicketEvents(ticket.id, { includeInternal: true });

  return (
    <Page width="wide">
      <Link
        href="/admin"
        className="mb-5 inline-block text-sm text-muted underline underline-offset-2"
      >
        ← Fronta
      </Link>

      <Heading sub={`${ticket.code} · nahlášeno ${formatDateTime(ticket.createdAt)}`}>
        {ticket.title}
      </Heading>

      <div className="mb-5 flex flex-wrap gap-2">
        <Badge className={STATUS_BADGE[ticket.status as TicketStatus]}>
          {statusLabel(ticket.status)}
        </Badge>
        <Badge className={PRIORITY_BADGE[ticket.priority as TicketPriority]}>
          {priorityLabel(ticket.priority)}
        </Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Od</dt>
              <dd>
                {ticket.requesterName ? `${ticket.requesterName} — ` : ""}
                <a
                  href={`mailto:${ticket.requesterEmail}`}
                  className="underline underline-offset-2"
                >
                  {ticket.requesterEmail}
                </a>
              </dd>
              <dt className="text-muted">Místo</dt>
              <dd className="font-medium">{ticket.location}</dd>
              <dt className="text-muted">Kategorie</dt>
              <dd>{categoryLabel(ticket.category)}</dd>
              <dt className="text-muted">Vzato do ruky</dt>
              <dd>{formatDateTime(ticket.startedAt)}</dd>
              <dt className="text-muted">Uzavřeno</dt>
              <dd>{formatDateTime(ticket.resolvedAt)}</dd>
              <dt className="text-muted">Strávený čas</dt>
              <dd>{formatMinutes(ticket.timeSpentMinutes)}</dd>
            </dl>

            <h2 className="mt-5 mb-2 text-sm font-semibold">Popis závady</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </p>
          </Card>

          {ticket.resolution ? (
            <Card>
              <h2 className="mb-2 text-sm font-semibold">Co jsem udělal</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {ticket.resolution}
              </p>
            </Card>
          ) : null}

          <Card>
            <h2 className="mb-4 text-sm font-semibold">Historie</h2>
            <Timeline events={events} />
          </Card>

          <AdminNoteForms code={ticket.code} />
        </div>

        <div>
          <StatusForm
            code={ticket.code}
            currentStatus={ticket.status as TicketStatus}
            currentResolution={ticket.resolution}
            currentTimeSpent={ticket.timeSpentMinutes}
          />
        </div>
      </div>
    </Page>
  );
}
