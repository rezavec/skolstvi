import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  ne,
  sql,
} from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { db } from "./index";
import { magicTokens, ticketEvents, tickets } from "./schema";
import type { Ticket, TicketEvent } from "./schema";
import { generateTicketCode } from "@/lib/ticket-code";
import {
  CLOSED_STATUSES,
  OPEN_STATUSES,
  type TicketStatus,
} from "@/lib/statuses";

/**
 * Všechny databázové dotazy na jednom místě.
 *
 * Kde je potřeba atomicita, je to vyřešené transakcí (changeTicketStatus),
 * nebo jedním SQL příkazem s podmínkou tam, kde transakce nestačí a šlo by
 * o soutěž dvou požadavků (consumeMagicToken).
 */

/** Řazení fronty: nejdřív podle priority, v rámci priority od nejstaršího. */
const priorityWeight = sql`case ${tickets.priority}
  when 'high' then 3
  when 'normal' then 2
  when 'low' then 1
  else 0 end`;

// ── Tikety ──────────────────────────────────────────────────────────────────

export type CreateTicketInput = {
  requesterEmail: string;
  requesterName: string | null;
  location: string;
  category: string;
  priority: string;
  title: string;
  description: string;
};

/**
 * Založí tiket. Kód se generuje náhodně, takže může (velmi vzácně) kolidovat
 * s existujícím — na unique violation to zkusíme znovu s novým kódem.
 */
export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const MAX_ATTEMPTS = 5;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const [ticket] = await db
        .insert(tickets)
        .values({ ...input, code: generateTicketCode(), status: "new" })
        .returning();
      return ticket;
    } catch (error) {
      const isDuplicateCode =
        error instanceof Error &&
        /duplicate key|unique constraint/i.test(error.message) &&
        /code/i.test(error.message);

      if (!isDuplicateCode || attempt === MAX_ATTEMPTS) {
        throw error;
      }
      // kolize kódu — zkusíme znovu s jiným
    }
  }

  throw new Error("Nepodařilo se vygenerovat unikátní kód tiketu.");
}

export async function getTicketByCode(code: string): Promise<Ticket | null> {
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.code, code))
    .limit(1);
  return ticket ?? null;
}

/** Tikety jednoho žadatele, nejnovější první. */
export async function getTicketsByRequester(email: string): Promise<Ticket[]> {
  return db
    .select()
    .from(tickets)
    .where(eq(tickets.requesterEmail, email))
    .orderBy(desc(tickets.createdAt));
}

/** Fronta „co mám udělat“ — otevřené tikety podle priority a věku. */
export async function getOpenTickets(): Promise<Ticket[]> {
  return db
    .select()
    .from(tickets)
    .where(inArray(tickets.status, OPEN_STATUSES))
    .orderBy(desc(priorityWeight), asc(tickets.createdAt));
}

/** Archiv „co jsem udělal“ za období. Hranice jsou včetně. */
export async function getClosedTickets(range?: {
  from?: Date;
  to?: Date;
}): Promise<Ticket[]> {
  const conditions = [inArray(tickets.status, CLOSED_STATUSES)];
  if (range?.from) {
    conditions.push(gte(tickets.resolvedAt, range.from));
  }
  if (range?.to) {
    conditions.push(lte(tickets.resolvedAt, range.to));
  }

  return db
    .select()
    .from(tickets)
    .where(and(...conditions))
    .orderBy(desc(tickets.resolvedAt));
}

/** Počty tiketů po stavech — pro odznaky v admin navigaci. */
export async function getStatusCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: tickets.status, total: count() })
    .from(tickets)
    .groupBy(tickets.status);

  return Object.fromEntries(rows.map((r) => [r.status, Number(r.total)]));
}

/**
 * Změní stav tiketu a zapíše to do historie.
 *
 * `startedAt` se plní při prvním přechodu do „řeším“, `resolvedAt` při
 * uzavření — obojí jen pokud ještě nejsou vyplněné, aby se přeřazováním
 * stavů nepřepisovala původní data.
 */
export async function changeTicketStatus(args: {
  ticketId: number;
  status: TicketStatus;
  note: string;
  resolution?: string | null;
  timeSpentMinutes?: number | null;
}): Promise<void> {
  const patch: PgUpdateSetSource<typeof tickets> = { status: args.status };

  if (args.status === "in_progress") {
    patch.startedAt = sql`coalesce(${tickets.startedAt}, now())`;
  }
  if (args.status === "done" || args.status === "rejected") {
    patch.resolvedAt = sql`coalesce(${tickets.resolvedAt}, now())`;
  }
  if (args.resolution !== undefined) {
    patch.resolution = args.resolution;
  }
  if (args.timeSpentMinutes !== undefined) {
    patch.timeSpentMinutes = args.timeSpentMinutes;
  }

  // Transakce: tiket a záznam v historii se změní buď oba, nebo ani jeden.
  await db.transaction(async (tx) => {
    await tx.update(tickets).set(patch).where(eq(tickets.id, args.ticketId));
    await tx.insert(ticketEvents).values({
      ticketId: args.ticketId,
      type: "status_change",
      body: args.note,
      author: "admin",
    });
  });
}

// ── Historie tiketu ─────────────────────────────────────────────────────────

export async function addTicketEvent(args: {
  ticketId: number;
  type: "comment" | "internal_note" | "status_change";
  body: string;
  author: string;
}): Promise<void> {
  await db.insert(ticketEvents).values(args);
}

/**
 * Historie tiketu.
 *
 * `includeInternal: false` je výchozí a pro pohled žadatele — interní
 * poznámky se filtrují už v SQL, aby se k žadateli nemohly dostat ani
 * omylem při úpravě šablony.
 */
export async function getTicketEvents(
  ticketId: number,
  options: { includeInternal?: boolean } = {},
): Promise<TicketEvent[]> {
  const conditions = [eq(ticketEvents.ticketId, ticketId)];
  if (!options.includeInternal) {
    conditions.push(ne(ticketEvents.type, "internal_note"));
  }

  return db
    .select()
    .from(ticketEvents)
    .where(and(...conditions))
    .orderBy(asc(ticketEvents.createdAt));
}

// ── Přihlašovací tokeny ─────────────────────────────────────────────────────

export async function createMagicToken(args: {
  tokenHash: string;
  email: string;
  ip: string | null;
  expiresAt: Date;
}): Promise<void> {
  await db.insert(magicTokens).values(args);
}

/**
 * Spotřebuje token a vrátí e-mail, pro který platil.
 *
 * Jediný UPDATE s podmínkou — platnost, nepoužitost i označení za použitý
 * se vyhodnotí atomicky, takže dvě souběžná kliknutí na stejný odkaz nemohou
 * obě uspět. Vrátí null, pokud token neexistuje, propadl nebo už byl použitý.
 */
export async function consumeMagicToken(
  tokenHash: string,
): Promise<string | null> {
  const rows = await db
    .update(magicTokens)
    .set({ usedAt: sql`now()` })
    .where(
      and(
        eq(magicTokens.tokenHash, tokenHash),
        isNull(magicTokens.usedAt),
        sql`${magicTokens.expiresAt} > now()`,
      ),
    )
    .returning({ email: magicTokens.email });

  return rows[0]?.email ?? null;
}

/** Kolik odkazů se poslalo na tento e-mail za poslední hodinu. */
export async function countRecentTokensByEmail(email: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(magicTokens)
    .where(
      and(
        eq(magicTokens.email, email),
        sql`${magicTokens.createdAt} > now() - interval '1 hour'`,
      ),
    );
  return Number(row?.total ?? 0);
}

/** Kolik odkazů se poslalo z této IP za poslední hodinu. */
export async function countRecentTokensByIp(ip: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(magicTokens)
    .where(
      and(
        eq(magicTokens.ip, ip),
        sql`${magicTokens.createdAt} > now() - interval '1 hour'`,
      ),
    );
  return Number(row?.total ?? 0);
}

/** Úklid propadlých tokenů. Volá se příležitostně při přihlašování. */
export async function deleteExpiredTokens(): Promise<void> {
  await db
    .delete(magicTokens)
    .where(sql`${magicTokens.expiresAt} < now() - interval '7 days'`);
}

/**
 * Znovu otevře uzavřený tiket.
 *
 * Používá se, když žadatel odpoví na vyřešený tiket — slibujeme mu to
 * v e-mailu o vyřešení. `resolvedAt` se maže, aby tiket vypadl z archivu
 * a vrátil se do fronty; `resolution` zůstává jako historie toho, co se
 * zkoušelo předtím.
 */
export async function reopenTicket(args: {
  ticketId: number;
  note: string;
  author: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({ status: "new", resolvedAt: null })
      .where(eq(tickets.id, args.ticketId));
    await tx.insert(ticketEvents).values({
      ticketId: args.ticketId,
      type: "status_change",
      body: args.note,
      author: args.author,
    });
  });
}
