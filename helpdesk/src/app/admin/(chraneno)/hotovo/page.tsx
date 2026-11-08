import Link from "next/link";
import { getClosedTickets } from "@/db/queries";
import { parseDateRange } from "@/lib/date-range";
import {
  STATUS_BADGE,
  categoryLabel,
  statusLabel,
  type TicketStatus,
} from "@/lib/statuses";
import {
  Badge,
  Card,
  Heading,
  InfoBox,
  Page,
  buttonSecondaryClass,
  formatDate,
  formatMinutes,
} from "@/components/ui";

/**
 * Archiv „co jsem udělal“ — druhý z obou cílů celé aplikace.
 *
 * Filtr období se drží v URL, takže se dá poslat odkazem a odkaz na export
 * z něj jen zkopíruje parametry.
 */
export default async function AdminDonePage(props: PageProps<"/admin/hotovo">) {
  const params = await props.searchParams;
  const od = typeof params.od === "string" ? params.od : undefined;
  const doDne = typeof params.do === "string" ? params.do : undefined;

  const range = parseDateRange({ from: od, to: doDne });
  const tickets = await getClosedTickets(range);

  const totalMinutes = tickets.reduce(
    (sum, t) => sum + (t.timeSpentMinutes ?? 0),
    0,
  );

  const exportParams = new URLSearchParams();
  if (od) exportParams.set("od", od);
  if (doDne) exportParams.set("do", doDne);
  const exportHref = `/admin/export${
    exportParams.size > 0 ? `?${exportParams}` : ""
  }`;

  return (
    <Page width="wide">
      <Heading sub="Seznam uzavřených závad. Použitelné jako podklad pro ředitele nebo jako vlastní výkaz práce.">
        Co jsem udělal
      </Heading>

      <Card className="mb-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="od" className="mb-1.5 block text-xs font-medium">
              Uzavřeno od
            </label>
            <input
              id="od"
              name="od"
              type="date"
              defaultValue={od ?? ""}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="do" className="mb-1.5 block text-xs font-medium">
              do
            </label>
            <input
              id="do"
              name="do"
              type="date"
              defaultValue={doDne ?? ""}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className={buttonSecondaryClass}>
            Zobrazit
          </button>
          {od || doDne ? (
            <Link href="/admin/hotovo" className={buttonSecondaryClass}>
              Zrušit filtr
            </Link>
          ) : null}
        </form>
      </Card>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {tickets.length === 0
            ? "Žádné uzavřené tikety v tomhle období."
            : `${tickets.length} ${tickets.length === 1 ? "tiket" : "tiketů"}${
                totalMinutes > 0
                  ? `, celkem ${formatMinutes(totalMinutes)} práce`
                  : ""
              }`}
        </p>
        {tickets.length > 0 ? (
          <a href={exportHref} className={buttonSecondaryClass} download>
            Export do CSV
          </a>
        ) : null}
      </div>

      {tickets.length === 0 ? (
        <Card>
          <InfoBox>
            Zkus rozšířit období, nebo filtr zruš a uvidíš všechno.
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
                  <Badge className={STATUS_BADGE[ticket.status as TicketStatus]}>
                    {statusLabel(ticket.status)}
                  </Badge>
                </div>

                <p className="mt-2 text-xs text-muted">
                  <span className="font-medium text-foreground">
                    {ticket.location}
                  </span>{" "}
                  · {categoryLabel(ticket.category)} ·{" "}
                  {ticket.requesterName ?? ticket.requesterEmail} · uzavřeno{" "}
                  {formatDate(ticket.resolvedAt)}
                  {ticket.timeSpentMinutes
                    ? ` · ${formatMinutes(ticket.timeSpentMinutes)}`
                    : ""}{" "}
                  · {ticket.code}
                </p>

                {ticket.resolution ? (
                  <p className="mt-2 line-clamp-2 text-sm">
                    {ticket.resolution}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
