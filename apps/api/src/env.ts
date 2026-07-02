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
  CHAT_MODEL: z.string().min(1).default("kimi-k2.7-code-highspeed"),

  // ── Renderer worker (apps/renderer) — where video exports run ───────
  RENDER_PROVIDER: z.enum(["local", "e2b"]).default("local"),
  E2B_RENDER_TEMPLATE: z.string().min(1).optional(),
  E2B_RENDER_CMD: z.string().min(1).optional(),
  RENDER_TIMEOUT_MS: z.coerce.number().int().positive().optional(),

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
