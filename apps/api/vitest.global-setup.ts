import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  assertTestDatabase,
  databaseName,
  maintenanceUrl,
  testDatabaseUrl,
} from "./src/__tests__/helpers/test-env";

/**
 * Creates the isolated test database and brings it up to the current schema.
 *
 * Runs once per `vitest` invocation, before any test module is imported.
 */
export default async function setup() {
  // The root .env is loaded here as well as in vitest.setup.ts: globalSetup
  // runs in its own module graph, so it can't rely on the setup file having
  // run. Without it DATABASE_URL is unset and we'd derive from the fallback.
  try {
    process.loadEnvFile(fileURLToPath(new URL("../../.env", import.meta.url)));
  } catch {
    // No .env — fall back to the dev-default connection string.
  }

  const url = testDatabaseUrl();
  const name = databaseName(url);

  const admin = new pg.Client({ connectionString: maintenanceUrl(url) });
  try {
    await admin.connect();
  } catch (err) {
    console.warn(
      `[test setup] Postgres unreachable — DB-backed tests will skip:`,
      err instanceof Error ? err.message : err,
    );
    return;
  }
  try {
    // Identifier can't be parameterised; assertTestDatabase has already
    // constrained it to a "_test" suffix, and it comes from our own env.
    await admin.query(`CREATE DATABASE "${name}"`);
    console.log(`[test setup] created ${name}`);
  } catch (err) {
    // 42P01 duplicate_database — already there, which is the common case.
    if ((err as { code?: string }).code !== "42P04") throw err;
  } finally {
    await admin.end();
  }

  // Point the process at the test database BEFORE @genmotion/db is imported.
  // The dynamic import below is load-bearing: a static import would bind the
  // pool to whatever DATABASE_URL held at module-evaluation time.
  process.env.DATABASE_URL = url;
  const { runMigrations, pool } = await import("@genmotion/db");
  await runMigrations();
  await pool.end();
  console.log(`[test setup] migrated ${name}`);
}
