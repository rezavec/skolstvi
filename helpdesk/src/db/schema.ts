import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Tikety — jeden řádek = jedna nahlášená závada.
 *
 * `code` je krátký lidsky čitelný kód (např. T-7F3K), kterým se o tiketu dá
 * mluvit na chodbě a který je v URL. Nepoužíváme `id`, aby z adresy nešlo
 * hádat cizí tikety podle pořadí.
 */
export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 10 }).notNull().unique(),

    // kdo to nahlásil — e-mail je ověřený magic linkem, takže se mu dá věřit
    requesterEmail: text("requester_email").notNull(),
    requesterName: text("requester_name"),

    // kde to je, co to je a jak to spěchá
    location: text("location").notNull(),
    category: text("category").notNull(),
    priority: text("priority").notNull().default("normal"),

    title: text("title").notNull(),
    description: text("description").notNull(),

    status: text("status").notNull().default("new"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // kdy jsem to vzal do ruky a kdy to bylo hotové — z toho se dá spočítat,
    // jak dlouho lidi čekají
    startedAt: timestamp("started_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    // co jsem s tím udělal a jak dlouho to zabralo (podklad pro výkaz práce)
    resolution: text("resolution"),
    timeSpentMinutes: integer("time_spent_minutes"),
  },
  (t) => [
    index("tickets_status_idx").on(t.status),
    index("tickets_created_at_idx").on(t.createdAt),
    index("tickets_requester_email_idx").on(t.requesterEmail),
    index("tickets_resolved_at_idx").on(t.resolvedAt),
  ],
);

/**
 * Historie tiketu — změny stavu, komentáře žadatele i moje, interní poznámky.
 *
 * Jedna tabulka schválně pokrývá všechno tři: timeline, diskuzi i audit.
 * Typ `internal_note` se žadateli NIKDY nezobrazuje (viz db/queries.ts).
 */
export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),

    // status_change | comment | internal_note
    type: text("type").notNull(),
    body: text("body").notNull(),

    // 'admin' nebo e-mail žadatele
    author: text("author").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ticket_events_ticket_id_idx").on(t.ticketId)],
);

/**
 * Jednorázové přihlašovací tokeny (magic link).
 *
 * V databázi je jen SHA-256 hash tokenu, nikdy token sám — kdyby někdo
 * získal přístup k DB, nemůže se s jejím obsahem přihlásit.
 *
 * Tabulka slouží zároveň jako záznam pro rate limit (viz lib/rate-limit.ts),
 * proto se tu ukládá i IP a čas vytvoření.
 */
export const magicTokens = pgTable(
  "magic_tokens",
  {
    id: serial("id").primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    email: text("email").notNull(),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [
    index("magic_tokens_email_created_at_idx").on(t.email, t.createdAt),
    index("magic_tokens_ip_created_at_idx").on(t.ip, t.createdAt),
  ],
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketEvent = typeof ticketEvents.$inferSelect;
