/**
 * A render provider decides WHERE a queued render runs. The render pipeline
 * itself (compile scenes → drive Chromium frame-by-frame → ffmpeg → upload) is
 * identical across providers; only the execution environment differs.
 *
 * Select one with the RENDER_PROVIDER env var ("local" or "e2b"). New backends
 * (a dedicated render farm, Cloudflare Containers, …) just implement this
 * interface and get wired into the factory.
 */
export interface RenderProvider {
  /** Optional warm-up (build the host bundle, launch a browser) so the first
   *  job isn't slow. No-op for providers that spin up per job. */
  warmup?(): Promise<void>;
  /** Produce the MP4 for an export job. The pipeline updates the job's DB
   *  status itself; this resolves when the run finishes (or throws on an
   *  infrastructure failure). */
  renderJob(exportJobId: string): Promise<void>;
  /** Render / refresh a project's thumbnail. */
  renderThumbnail(projectId: string): Promise<void>;
  /** Release resources (a reused browser, sandboxes, …). */
  dispose(): Promise<void>;
}

export type RenderProviderKind = "local" | "e2b";

/** Resolve which provider to use from the environment (default: "local"). */
export function resolveProviderKind(
  env: Record<string, string | undefined> = process.env,
): RenderProviderKind {
  const raw = (env.RENDER_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "") return "local";
  if (raw === "local" || raw === "e2b") return raw;
  throw new Error(
    `Invalid RENDER_PROVIDER "${raw}" — expected "local" or "e2b".`,
  );
}

/**
 * The subset of env the render pipeline needs to reach Postgres and R2. Passed
 * into an E2B sandbox so the render running inside it can read scenes and upload
 * the result. Only keys that are actually set are forwarded.
 */
export const RENDER_ENV_KEYS = [
  "DATABASE_URL",
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_REGION",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_URL",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "API_URL",
  "NEXT_PUBLIC_API_URL",
] as const;

export function pickRenderEnv(
  env: Record<string, string | undefined> = process.env,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of RENDER_ENV_KEYS) {
    const value = env[key];
    if (value) out[key] = value;
  }
  return out;
}
