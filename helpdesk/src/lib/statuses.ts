/**
 * Stavy, kategorie a priority na jednom místě.
 *
 * V databázi jsou anglické slugy, v UI české labely. Kdyby se někdy měnily
 * texty, mění se jen tady — a díky `as const` + odvozeným typům TypeScript
 * pohlídá, že se nikde nepoužije neexistující hodnota.
 */

export const TICKET_STATUSES = {
  new: { label: "Nový", short: "Nový", order: 1 },
  in_progress: { label: "Řeším", short: "Řeším", order: 2 },
  waiting: { label: "Čeká (díly, servis)", short: "Čeká", order: 3 },
  done: { label: "Hotovo", short: "Hotovo", order: 4 },
  rejected: { label: "Zamítnuto", short: "Zamítnuto", order: 5 },
} as const;

export type TicketStatus = keyof typeof TICKET_STATUSES;

/** Stavy, které mám ve frontě „k udělání“. */
export const OPEN_STATUSES: TicketStatus[] = ["new", "in_progress", "waiting"];

/** Stavy, které jsou uzavřené — patří do archivu. */
export const CLOSED_STATUSES: TicketStatus[] = ["done", "rejected"];

export const TICKET_CATEGORIES = {
  pc: "Počítač / notebook",
  printer: "Tiskárna",
  projector: "Projektor / interaktivní tabule",
  network: "Síť / internet / Wi-Fi",
  software: "Software / účty / přihlášení",
  other: "Jiné",
} as const;

export type TicketCategory = keyof typeof TICKET_CATEGORIES;

export const TICKET_PRIORITIES = {
  high: { label: "Vysoká — nemůžu učit", weight: 3 },
  normal: { label: "Normální — tento týden", weight: 2 },
  low: { label: "Nízká — až bude čas", weight: 1 },
} as const;

export type TicketPriority = keyof typeof TICKET_PRIORITIES;

export function isTicketStatus(value: string): value is TicketStatus {
  return value in TICKET_STATUSES;
}

export function statusLabel(value: string): string {
  return isTicketStatus(value) ? TICKET_STATUSES[value].label : value;
}

export function categoryLabel(value: string): string {
  return value in TICKET_CATEGORIES
    ? TICKET_CATEGORIES[value as TicketCategory]
    : value;
}

export function priorityLabel(value: string): string {
  return value in TICKET_PRIORITIES
    ? TICKET_PRIORITIES[value as TicketPriority].label
    : value;
}

/** Barvy odznaků stavů. Tailwind třídy, aby se daly použít přímo v JSX. */
export const STATUS_BADGE: Record<TicketStatus, string> = {
  new: "bg-blue-100 text-blue-900 ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-900",
  in_progress:
    "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900",
  waiting:
    "bg-purple-100 text-purple-900 ring-purple-200 dark:bg-purple-950 dark:text-purple-200 dark:ring-purple-900",
  done: "bg-green-100 text-green-900 ring-green-200 dark:bg-green-950 dark:text-green-200 dark:ring-green-900",
  rejected:
    "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
};

export const PRIORITY_BADGE: Record<TicketPriority, string> = {
  high: "bg-red-100 text-red-900 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900",
  normal:
    "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
  low: "bg-zinc-50 text-zinc-500 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800",
};
