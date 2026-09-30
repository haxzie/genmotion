import { fileURLToPath } from "node:url";
import { assertLocalStorage, testDatabaseUrl } from "./src/__tests__/helpers/test-env";

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
process.env.DODOPAYMENT_MAX_PRODUCT_ID = "pdt_test_max";
process.env.DODOPAYMENT_SEAT_ADDON_ID = "adn_test_seat";

// Nor may a test reach a chat-plugin provider. Set rather than cleared: the
// route answers 503 when a key is missing, which would hide the gate and the
// bookkeeping behind a "not configured" branch. The suite stubs `fetch`, so
// these are never sent anywhere.
process.env.ELEVENLABS_API_KEY = "test_elevenlabs_api_key";
process.env.GEMINI_API_KEY = "test_gemini_api_key";

// Nor may a test reach production object storage. This is not hypothetical:
// the root .env above is the file the deployed API reads, so it carries real
// R2 credentials, and `packages/storage` builds its client from `process.env`
// at module load — one upload in a test and the bytes are in the live bucket.
//
// The AWS_* names are cleared rather than just overridden because the storage
// client prefers them over the S3_* ones; leaving them set would mean the
// endpoint below pointed at MinIO while the credentials still signed for R2.
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;
delete process.env.AWS_REGION;
process.env.S3_ENDPOINT = assertLocalStorage(
  process.env.TEST_S3_ENDPOINT ?? "http://localhost:9000",
);
process.env.S3_ACCESS_KEY_ID = "minioadmin";
process.env.S3_SECRET_ACCESS_KEY = "minioadmin";
process.env.S3_REGION = "us-east-1";
process.env.S3_BUCKET = process.env.TEST_S3_BUCKET ?? "genmotion";
// `publicUrl()` bakes absolute URLs into rows; pin it so a test never records
// a developer's localhost port or, worse, the production API.
process.env.API_URL = "http://localhost:4001";

// better-auth refuses to construct without a secret; keep tests independent of
// whether the developer has one set locally.
process.env.BETTER_AUTH_SECRET ??= "test-better-auth-secret";
