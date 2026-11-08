/**
 * Převod `od`/`do` z <input type="date"> na hranice pro databázi.
 *
 * `do` se posouvá na konec dne, aby filtr „do 6. 11.“ zahrnul i tikety
 * uzavřené v pět odpoledne — jinak by uživatel nechápal, kam se mu ztratily.
 */
export function parseDateRange(params: {
  from?: string;
  to?: string;
}): { from?: Date; to?: Date } {
  const result: { from?: Date; to?: Date } = {};

  if (params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from)) {
    const date = new Date(`${params.from}T00:00:00`);
    if (!Number.isNaN(date.getTime())) result.from = date;
  }

  if (params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to)) {
    const date = new Date(`${params.to}T23:59:59.999`);
    if (!Number.isNaN(date.getTime())) result.to = date;
  }

  return result;
}

/** Dnešní datum ve formátu pro <input type="date">. */
export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}
