import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./client";

// Apply the generated SQL migrations (packages/db/drizzle) to DATABASE_URL.
// Uses drizzle-orm's migrator over the runtime `pg` pool — no drizzle-kit
// needed at deploy time. drizzle tracks applied migrations, so it's idempotent.
const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

export async function runMigrations(): Promise<void> {
  console.log(`[db] applying migrations from ${migrationsFolder} …`);
  await migrate(db, { migrationsFolder });
  console.log("[db] migrations complete.");
}
