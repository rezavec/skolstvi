import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTicketByCode, getTicketEvents } from "@/db/queries";
import { getRequesterEmail } from "@/lib/session";
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
  buttonSecondaryClass,
  formatDateTime,
} from "@/components/ui";
import { CommentForm } from "./comment-form";

/** Detail vlastního tiketu: stav, co se s ním dělo, a možnost se ozvat. */
export default async function MyTicketPage(props: PageProps<"/moje/[kod]">) {
  const email = await getRequesterEmail();
  if (!email) {
    redirect("/");
  }

  const { kod } = await props.params;
  const ticket = await getTicketByCode(normalizeTicketCode(kod));

  // Cizí tiket se chová stejně jako neexistující — jinak by se dalo
  // uhádnutím kódu zjistit, že nějaký tiket existuje.
  if (!ticket || ticket.requesterEmail !== email) {
    notFound();
  }

  // includeInternal zůstává false: interní poznámky se k žadateli nedostanou
  const events = await getTicketEvents(ticket.id);

  return (
    <Page>
      <Link
        href="/moje"
        className="mb-5 inline-block text-sm text-muted underline underline-offset-2"
      >
        ← Moje závady
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

      <Card className="mb-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Místo</dt>
          <dd>{ticket.location}</dd>
          <dt className="text-muted">Týká se</dt>
          <dd>{categoryLabel(ticket.category)}</dd>
        </dl>
        <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">
          {ticket.description}
        </p>
      </Card>

      {ticket.resolution ? (
        <Card className="mb-5">
          <h2 className="mb-2 text-sm font-semibold">Co se s tím udělalo</h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {ticket.resolution}
          </p>
        </Card>
      ) : null}

      <Card className="mb-5">
        <h2 className="mb-4 text-sm font-semibold">Co se dělo</h2>
        <Timeline events={events} />
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">Chceš něco doplnit?</h2>
        <p className="mb-4 text-xs text-muted">
          {ticket.status === "done" || ticket.status === "rejected"
            ? "Pokud problém trvá, napiš to sem — tiket se tím otevře znovu."
            : "Napiš sem, pokud se něco změnilo nebo máš doplňující informaci."}
        </p>
        <CommentForm code={ticket.code} />
      </Card>

      <p className="mt-6">
        <Link href="/nahlasit" className={buttonSecondaryClass}>
          Nahlásit jinou závadu
        </Link>
      </p>
    </Page>
  );
}
