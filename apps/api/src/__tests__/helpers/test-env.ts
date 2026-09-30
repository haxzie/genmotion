/**
 * Test database URL derivation.
 *
 * Deliberately dependency-free: this is imported by `vitest.global-setup.ts`
 * and `vitest.setup.ts`, both of which must run BEFORE `@genmotion/db` is ever
 * loaded (its pool is built at module load from `process.env.DATABASE_URL` and
 * cached on globalThis, so a late override silently binds the wrong database).
 */

/** Fallback matching packages/db/src/client.ts. */
const DEV_FALLBACK = "postgres://genmotion:genmotion@localhost:5433/genmotion";

function databaseName(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

/**
 * The guard that makes "the suite never touches dev data" a property of the
 * code rather than a hope. Every test-side helper that can drop or truncate
 * goes through here first, so a mis-set env var fails loudly instead of
 * wiping the developer's database.
 */
export function assertTestDatabase(url: string): string {
  const name = databaseName(url);
  if (!name.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests against "${name}": the test database name must end in "_test". ` +
        `Set TEST_DATABASE_URL, or leave it unset to derive one from DATABASE_URL.`,
    );
  }
  return url;
}

/**
 * `TEST_DATABASE_URL` when set, otherwise DATABASE_URL with `_test` appended to
 * the database name — same server, same credentials, separate database.
 */
export function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) return assertTestDatabase(explicit);

  const url = new URL(process.env.DATABASE_URL ?? DEV_FALLBACK);
  const base = url.pathname.replace(/^\//, "") || "genmotion";
  // Idempotent: globalSetup writes the derived URL back to DATABASE_URL and
  // that propagates into the test workers, where vitest.setup.ts calls this
  // again — without the guard the suffix would stack into "genmotion_test_test".
  if (base.endsWith("_test")) return assertTestDatabase(url.toString());
  url.pathname = `/${base}_test`;
  return assertTestDatabase(url.toString());
}

/**
 * The same guarantee as `assertTestDatabase`, for object storage.
 *
 * The repo-root `.env` carries production R2 credentials — it is the file the
 * deployed API reads — and `packages/storage` builds its client straight from
 * `process.env` at module load. Without this, any test that uploads writes to
 * the live bucket, and any test that deletes deletes from it.
 *
 * Localhost only, so a mis-set variable fails the suite instead of reaching a
 * real bucket.
 */
export function assertLocalStorage(endpoint: string): string {
  const host = new URL(endpoint).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(
      `Refusing to run tests against object storage at "${host}": the endpoint must be ` +
        `local. Start MinIO with \`docker compose up -d\`, or set S3_ENDPOINT.`,
    );
  }
  return endpoint;
}

/** The maintenance connection used to CREATE DATABASE. */
export function maintenanceUrl(testUrl: string): string {
  const url = new URL(testUrl);
  url.pathname = "/postgres";
  return url.toString();
}

export { databaseName };
