import { sql } from "@genmotion/db";
import { db } from "@genmotion/db";
import { assertTestDatabase } from "./test-env";

/**
 * True when Postgres is reachable. Tests skip rather than fail when it isn't,
 * matching the existing convention in editor-agent.test.ts.
 */
export const dbReady: boolean = await db
  .execute(sql`select 1`)
  .then(() => true)
  .catch((err) => {
    console.warn(
      "[tests] DB unreachable — skipping DB-backed tests:",
      err instanceof Error ? err.message : err,
    );
    return false;
  });

let guarded = false;

/**
 * Empty every application table. Tables are read from the catalog rather than
 * listed by hand, so a table added later is reset automatically instead of
 * leaking rows between tests.
 *
 * CASCADE handles the FK graph; RESTART IDENTITY keeps sequences predictable.
 */
export async function truncateAll(): Promise<void> {
  if (!dbReady) return;

  // Belt-and-braces: the URL was already checked when it was derived, but this
  // is the function that can destroy data, so it verifies for itself. Once per
  // process — it's a constant.
  if (!guarded) {
    assertTestDatabase(
      process.env.DATABASE_URL ?? "postgres://localhost/unknown",
    );
    guarded = true;
  }

  const { rows } = await db.execute<{ tables: string | null }>(sql`
    select string_agg(format('%I.%I', schemaname, tablename), ', ') as tables
    from pg_tables
    where schemaname = 'public'
  `);
  const tables = rows[0]?.tables;
  if (!tables) return;

  await db.execute(sql.raw(`truncate table ${tables} restart identity cascade`));
}
