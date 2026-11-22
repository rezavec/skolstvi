import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Připojení k databázi.
 *
 * Používáme klasický Postgres driver (`pg`), ne `@neondatabase/serverless`.
 * Důvod: s `pg` mluví stejný kód s Neonem i s obyčejným Postgresem, takže
 * se dá vyvíjet lokálně bez účtu u Neonu — a hlavně je k dispozici
 * `db.transaction()`. HTTP driver Neonu transakce neumí (má jen `batch()`),
 * což by znamenalo dvě různé verze kódu pro lokál a produkci.
 *
 * Na Vercelu použij z Neonu POOLED connection string (obsahuje `-pooler`).
 * Bez něj by každá serverless instance držela vlastní spojení a databáze
 * by brzy odmítala další.
 *
 * Pool se vytváří líně při prvním dotazu, aby `next build` nepotřeboval
 * DATABASE_URL.
 */
let pool: Pool | undefined;
let instance: ReturnType<typeof drizzle<typeof schema>> | undefined;

function connect() {
  if (!instance) {
    const url = env.databaseUrl;

    // Lokální Postgres jede bez TLS, hostované databáze ho vyžadují.
    const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);

    pool = new Pool({
      connectionString: url,
      // Serverless instance obslouží jeden request po druhém, velký pool
      // by jen zabíral spojení v Neonu.
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ...(isLocal ? {} : { ssl: { rejectUnauthorized: true } }),
    });

    instance = drizzle(pool, { schema });
  }
  return instance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(connect(), prop, receiver);
  },
});

export { schema };
