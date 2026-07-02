import { pool, runMigrations } from "@genmotion/db";

// Standalone migration runner: applies pending migrations, then exits. Run once
// per deploy — the API Docker image runs it before starting the server; because
// drizzle tracks applied migrations, re-runs on restart are no-ops.
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — cannot run migrations.");
    process.exit(1);
  }
  await runMigrations();
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
