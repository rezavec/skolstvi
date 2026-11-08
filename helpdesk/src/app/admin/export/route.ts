import type { NextRequest } from "next/server";
import { getClosedTickets } from "@/db/queries";
import { buildCsv } from "@/lib/csv";
import { parseDateRange } from "@/lib/date-range";
import { isAdmin } from "@/lib/session";
import { categoryLabel, priorityLabel, statusLabel } from "@/lib/statuses";
import { formatDateTime } from "@/components/ui";

/**
 * Export uzavřených tiketů do CSV.
 *
 * POZOR: guard v app/admin/layout.tsx se na route handlery NEVZTAHUJE —
 * layout se při požadavku na /admin/export vůbec nevykresluje. Kontrola
 * přihlášení proto musí být tady, jinak by byl celý archiv včetně jmen
 * a e-mailů veřejně stažitelný.
 */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return new Response("Nepřihlášen.", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const range = parseDateRange({
    from: params.get("od") ?? undefined,
    to: params.get("do") ?? undefined,
  });

  const tickets = await getClosedTickets(range);

  const csv = buildCsv(
    [
      "Kód",
      "Nahlášeno",
      "Uzavřeno",
      "Stav",
      "Priorita",
      "Kategorie",
      "Místo",
      "Žadatel",
      "E-mail žadatele",
      "Závada",
      "Popis",
      "Co jsem udělal",
      "Čas (min)",
    ],
    tickets.map((t) => [
      t.code,
      formatDateTime(t.createdAt),
      formatDateTime(t.resolvedAt),
      statusLabel(t.status),
      priorityLabel(t.priority),
      categoryLabel(t.category),
      t.location,
      t.requesterName ?? "",
      t.requesterEmail,
      t.title,
      t.description,
      t.resolution ?? "",
      t.timeSpentMinutes ?? "",
    ]),
  );

  const filename = `helpdesk-hotovo-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // export obsahuje osobní údaje, nikde se nemá cachovat
      "Cache-Control": "no-store",
    },
  });
}
