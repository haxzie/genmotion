import { fileURLToPath } from "node:url";
import { testDatabaseUrl } from "./src/__tests__/helpers/test-env";

// Load the repo-root .env the same file the dev/start scripts use via
// --env-file, so tests see MOONSHOT_API_KEY, DATABASE_URL, etc.
try {
  process.loadEnvFile(fileURLToPath(new URL("../../.env", import.meta.url)));
} catch {
  // No .env — tests that need it will skip themselves.
}

// ── Everything below MUST come after loadEnvFile ────────────────────────────
// .env carries the developer's real DATABASE_URL and a live billing key. These
// overrides run afterwards so the file can't win, and before any test module is
// imported so @genmotion/db and ./src/env both observe the test values.

process.env.DATABASE_URL = testDatabaseUrl();

// No test may reach the real payment provider. Fixed, obviously-fake values —
// the webhook key is a base64 secret because Standard Webhooks decodes it.
process.env.DODOPAYMENT_API_KEY = "test_dodo_api_key";
process.env.DODOPAYMENT_ENVIRONMENT = "test_mode";
process.env.DODOPAYMENT_WEBHOOK_KEY = "whsec_dGVzdHdlYmhvb2tzZWNyZXQ=";
process.env.DODOPAYMENT_PRO_PRODUCT_ID = "pdt_test_pro";
process.env.DODOPAYMENT_TEAM_PRODUCT_ID = "pdt_test_team";

// better-auth refuses to construct without a secret; keep tests independent of
// whether the developer has one set locally.
process.env.BETTER_AUTH_SECRET ??= "test-better-auth-secret";
