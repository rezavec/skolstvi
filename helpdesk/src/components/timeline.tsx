import type { TicketEvent } from "@/db/schema";
import { formatDateTime } from "./ui";

/**
 * Historie tiketu. Používá ji pohled žadatele i admin.
 *
 * Interní poznámky se do pohledu žadatele nedostanou — filtrují se už
 * v SQL (getTicketEvents), tady se jen jinak obarví pro admina.
 */
export function Timeline({ events }: { events: TicketEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">Zatím se nic nestalo.</p>;
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <div
            aria-hidden
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
              event.type === "status_change"
                ? "bg-blue-500"
                : event.type === "internal_note"
                  ? "bg-amber-500"
                  : "bg-zinc-400"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">
              {authorLabel(event.author)} · {formatDateTime(event.createdAt)}
              {event.type === "internal_note" ? (
                <span className="ml-1.5 font-medium text-amber-700 dark:text-amber-400">
                  — interní, žadatel nevidí
                </span>
              ) : null}
            </p>
            <p
              className={`mt-0.5 text-sm leading-relaxed whitespace-pre-wrap ${
                event.type === "status_change" ? "text-muted italic" : ""
              }`}
            >
              {event.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function authorLabel(author: string): string {
  return author === "admin" ? "Školní IT" : author;
}
