import { z } from "zod";

/**
 * Central, validated environment for the API process. Import `env` instead of
 * reaching for `process.env` directly — values are parsed and typed here, and
 * the process fails fast at startup with a clear message if anything required
 * is missing or malformed. Mark new vars `.optional()` (or give a `.default()`)
 * unless the server genuinely can't run without them.
 *
 * The root `.env` is loaded by tsx via `--env-file=../../.env` (see package.json).
 */
const DEFAULT_DATABASE_URL =
  "postgres://genmotion:genmotion@localhost:5433/genmotion";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // ── Server ──────────────────────────────────────────────────────────
  PORT: z.coerce.number().int().positive().default(4001),
  WEB_URL: z.url().default("http://localhost:4000"),
  API_URL: z.url().optional(),

  // ── Database ────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1).default(DEFAULT_DATABASE_URL),

  // ── Auth (better-auth) ──────────────────────────────────────────────
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url().default("http://localhost:4001"),

  // OAuth providers — optional; a provider turns on once both halves are set.
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),

  // ── Desktop releases (GitHub) ───────────────────────────────────────
  // Where the macOS build is published. The download endpoint reads the latest
  // release from here — anonymously, because the repo is public.
  GITHUB_RELEASE_REPO: z.string().min(1).default("haxzie/genmotion"),
  // A CDN copy of the DMG, written by .github/workflows/release-mirror.yml when
  // a release is published. The download endpoint prefers it — the same bytes
  // arrive an order of magnitude faster than from GitHub's release storage —
  // and falls back to GitHub whenever it cannot be read.
  RELEASE_MIRROR_URL: z.string().url().default("https://assets.genmotion.dev/desktop"),

  // ── Analytics ───────────────────────────────────────────────────────
  // Server-side analytics. Optional: unset means the API emits nothing, and
  // the desktop events endpoint accepts and discards.
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),

  // ── Email (Amazon SES) — optional ───────────────────────────────────
  EMAIL_FROM: z.email().optional(),
  AWS_SES_REGION: z.string().min(1).optional(),
  AWS_SES_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SES_ACCESS_KEY: z.string().min(1).optional(),
  // Legacy aliases, still honored by the mailer.
  SES_REGION: z.string().min(1).optional(),
  SES_ACCESS_KEY_ID: z.string().min(1).optional(),
  SES_SECRET_ACCESS_KEY: z.string().min(1).optional(),

  // ── Object storage (S3 / R2 / MinIO) — optional, with dev defaults ──
  S3_BUCKET: z.string().min(1).default("genmotion"),
  S3_ENDPOINT: z.url().default("http://localhost:9000"),
  S3_REGION: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_PUBLIC_URL: z.url().optional(),
  AWS_REGION: z.string().min(1).optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),

  // ── AI providers — optional (features degrade without them) ─────────
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  MOONSHOT_API_KEY: z.string().min(1).optional(),
  FIRECRAWL_API_KEY: z.string().min(1).optional(),
  E2B_API_KEY: z.string().min(1).optional(),
  // Custom E2B template (ffmpeg + A/V python) for the chat workbench tool.
  E2B_WORKBENCH_TEMPLATE: z.string().min(1).optional(),
  // Google Gemini "Nano Banana" image generation (generateImage tool).
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_IMAGE_MODEL: z.string().min(1).default("gemini-2.5-flash-image"),
  // Agent models (Moonshot Kimi). Chat/compaction stream, so they run the base
  // tier; the scene writer blocks the chat stream, so it runs the high-speed
  // tier. Defaults must match packages/ai/src/models.ts, which reads
  // process.env directly — a workspace package can't import this module.
  CHAT_MODEL: z.string().min(1).default("kimi-k2.6"),
  SCENE_MODEL: z.string().min(1).default("kimi-k2.7-code-highspeed"),

  // ── Chat plugins — the providers we pay per call for ────────────────
  // Voiceover. Unset means the plugin answers 503 rather than failing at the
  // provider, so an org that pays for Pro is told the feature is off here
  // rather than that its own request was bad. Image generation reuses
  // GEMINI_API_KEY above.
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_MODEL: z.string().min(1).default("eleven_multilingual_v2"),
  // Rachel, from the default voice library — a neutral narrator, and the one
  // the agent gets when it does not name a voice.
  ELEVENLABS_VOICE_ID: z.string().min(1).default("21m00Tcm4TlvDq8ikWAM"),

  // ── Renderer worker (apps/renderer) — where video exports run ───────
  RENDER_PROVIDER: z.enum(["local", "e2b", "docker"]).default("local"),
  E2B_RENDER_TEMPLATE: z.string().min(1).optional(),
  E2B_RENDER_CMD: z.string().min(1).optional(),
  RENDER_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  // How many renders the worker runs in parallel (one E2B/docker sandbox each).
  RENDER_CONCURRENCY: z.coerce.number().int().positive().optional(),
  // Shared secret for the short-lived per-job render tokens. Falls back to
  // BETTER_AUTH_SECRET when unset; must match on the API and the renderer.
  RENDER_JWT_SECRET: z.string().min(1).optional(),

  // ── Billing (Dodo Payments) — optional; billing is inert until set ───
  DODOPAYMENT_API_KEY: z.string().min(1).optional(),
  DODOPAYMENT_ENVIRONMENT: z
    .enum(["test_mode", "live_mode"])
    .default("test_mode"),
  // The single paid product: Pro, one seat included.
  DODOPAYMENT_PRO_PRODUCT_ID: z.string().min(1).optional(),
  // Every teammate beyond the first is a quantity on this add-on, at the same
  // price as the base seat. See docs.dodopayments.com/features/seat-based-billing.
  DODOPAYMENT_SEAT_ADDON_ID: z.string().min(1).optional(),
  // Standard Webhooks signing secret. Without it the receiver refuses every
  // delivery rather than trusting an unverified payload.
  DODOPAYMENT_WEBHOOK_KEY: z.string().min(1).optional(),

  // ── Web (Next.js public) ────────────────────────────────────────────
  NEXT_PUBLIC_API_URL: z.url().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  console.error(`\n❌ Invalid environment variables:\n${details}\n`);
  throw new Error("Invalid environment variables — see the list above.");
}

export const env = parsed.data;
export type Env = typeof env;
