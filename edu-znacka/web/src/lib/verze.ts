import "server-only";
import { sql } from "drizzle-orm";
import type { db as Db } from "@/db";

/**
 * Přidělí další verzi indexu.
 *
 * Musí se volat **ve stejné transakci** jako zápis, který se do indexu
 * propisuje — jinak by mohla verze existovat bez odpovídající změny.
 *
 * Jediný `INSERT … ON CONFLICT` zároveň založí řádek čítače, pokud ještě
 * není, a zvýší ho. Díky tomu není potřeba žádný seed po `db:push`.
 */
export async function dalsiVerze(
  tx: typeof Db | Parameters<Parameters<typeof Db.transaction>[0]>[0],
): Promise<number> {
  const result = await tx.execute<{ hodnota: number }>(sql`
    INSERT INTO citac_verze (id, hodnota)
    VALUES (1, 1)
    ON CONFLICT (id) DO UPDATE SET hodnota = citac_verze.hodnota + 1
    RETURNING hodnota
  `);

  const row = result.rows[0];
  if (!row) {
    throw new Error("Čítač verzí nevrátil hodnotu — to by nemělo jít.");
  }
  return Number(row.hodnota);
}
