import { fileURLToPath } from "node:url";

// Load the repo-root .env the same file the dev/start scripts use via
// --env-file, so tests see MOONSHOT_API_KEY, DATABASE_URL, etc.
try {
  process.loadEnvFile(fileURLToPath(new URL("../../.env", import.meta.url)));
} catch {
  // No .env — tests that need it will skip themselves.
}
