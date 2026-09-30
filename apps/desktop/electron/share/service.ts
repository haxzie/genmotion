import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { desktopAuth } from "../auth";
import { exportOutputPath } from "../export/service";
import { findExportRecord } from "../export/history";
import { thumbnailPath } from "../export/thumbnail";
import { track } from "../analytics";
import type { ShareJob } from "../shared";

/**
 * Publishing a finished export to a public page.
 *
 * Sharing starts from an export that already exists rather than rendering a
 * new one. That is what makes it free: a render is the metered operation
 * (`FREE_EXPORTS_PER_MONTH`), and the file sitting in the project's `exports/`
 * folder has already been paid for. It also means a share is exactly the video
 * the user watched before deciding to share it, not a re-render that might
 * differ.
 *
 * Only the video and its poster travel. The project is not uploaded — the
 * composition is the user's source, and a page that plays an MP4 has no need
 * of it.
 *
 * Shaped like `export/service.ts` and `git/service.ts`: a job map, a listener
 * set, and an id the renderer subscribes to over SSE, because an upload takes
 * long enough that the HTTP request which started it must not be what the user
 * is waiting on.
 */

type Listener = (job: ShareJob) => void;

interface Job extends ShareJob {
  controller: AbortController;
}

const jobs = new Map<string, Job>();
const listeners = new Set<Listener>();

/** Finished jobs are swept after this, so the map cannot grow without bound. */
const KEEP_MS = 10 * 60 * 1000;

function publicJob(job: Job): ShareJob {
  const { controller: _controller, ...rest } = job;
  return rest;
}

export function onShareChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getShareJob(id: string): ShareJob | null {
  const job = jobs.get(id);
  return job ? publicJob(job) : null;
}

function update(id: string, patch: Partial<ShareJob>): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch);
  const snapshot = publicJob(job);
  for (const listener of listeners) listener(snapshot);
}

function sweep(): void {
  const cutoff = Date.now() - KEEP_MS;
  for (const [id, job] of jobs) {
    if (job.status !== "running" && (job.finishedAt ?? job.createdAt) < cutoff) jobs.delete(id);
  }
}

/** Anything already uploading for this export — pressing Share twice must not send it twice. */
function runningFor(exportId: string): Job | null {
  for (const job of jobs.values()) {
    if (job.exportId === exportId && job.status === "running") return job;
  }
  return null;
}

export function startShare(input: {
  exportId: string;
  projectDir: string;
  title: string;
  description?: string;
}): ShareJob {
  const existing = runningFor(input.exportId);
  if (existing) return publicJob(existing);

  sweep();
  const job: Job = {
    id: randomBytes(9).toString("base64url"),
    exportId: input.exportId,
    projectDir: input.projectDir,
    status: "running",
    step: "Preparing",
    progress: 0,
    createdAt: Date.now(),
    controller: new AbortController(),
  };
  jobs.set(job.id, job);
  for (const listener of listeners) listener(publicJob(job));

  void run(job, input).then(
    (url) =>
      update(job.id, {
        status: "done",
        step: "Shared",
        progress: 100,
        url,
        finishedAt: Date.now(),
      }),
    (err: unknown) =>
      update(job.id, {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        finishedAt: Date.now(),
      }),
  );

  return publicJob(job);
}

async function run(
  job: Job,
  input: { exportId: string; projectDir: string; title: string; description?: string },
): Promise<string> {
  const step = (step: string, progress: number) => update(job.id, { step, progress });

  step("Reading the video", 5);
  const videoPath = await exportOutputPath(input.exportId);
  if (!videoPath) throw new Error("That export is no longer on disk.");
  const video = await fs.readFile(videoPath).catch(() => null);
  if (!video?.byteLength) {
    throw new Error("That export's file has been moved or deleted.");
  }

  // The project's card image, if one has been captured. Read the file rather
  // than `readThumbnail()`, which hands back a data URL meant for an `<img>`.
  const poster = await fs.readFile(thumbnailPath(input.projectDir)).catch(() => null);
  const record = await findExportRecord(input.exportId).catch(() => null);

  step("Creating the link", 15);
  const created = await desktopAuth.request<{
    id: string;
    slug: string;
    url: string;
    uploads: { video: string; poster: string | null };
  }>("/api/shares", {
    json: {
      title: input.title,
      ...(input.description ? { description: input.description } : {}),
      videoBytes: video.byteLength,
      ...(record?.width ? { width: record.width } : {}),
      ...(record?.height ? { height: record.height } : {}),
      ...(record?.durationSeconds ? { durationSeconds: record.durationSeconds } : {}),
      hasPoster: Boolean(poster?.byteLength),
      exportId: input.exportId,
    },
  });
  if (!created.ok) throw new Error(apiError(created.status, created.body));

  // Straight to storage on a presigned URL, which carries its own
  // authorisation — the session token stays in the main process and the bytes
  // never pass through our API.
  step("Uploading", 35);
  await put(created.body.uploads.video, video, "video/mp4", job.controller.signal);

  if (poster?.byteLength && created.body.uploads.poster) {
    step("Uploading the poster", 80);
    // A missing poster costs a nicer preview, not the share.
    await put(created.body.uploads.poster, poster, "image/jpeg", job.controller.signal).catch(
      () => null,
    );
  }

  step("Publishing", 90);
  const done = await desktopAuth.request<{ url: string }>(
    `/api/shares/${created.body.id}/complete`,
    { method: "POST" },
  );
  if (!done.ok) throw new Error(apiError(done.status, done.body));

  track("video_shared", { sizeBytes: video.byteLength, hasPoster: Boolean(poster?.byteLength) });
  return done.body.url;
}

async function put(
  url: string,
  body: Buffer,
  contentType: string,
  signal: AbortSignal,
): Promise<void> {
  // Only `content-type` is set, and it must match what the URL was signed for.
  // `content-length` is deliberately absent: the signature covers the headers
  // named in `X-Amz-SignedHeaders`, and sending one the signer did not account
  // for is rejected as a mismatch. `fetch` derives it from the body anyway.
  const res = await fetch(url, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: new Uint8Array(body),
    signal,
  });
  if (!res.ok) {
    throw new Error(`The upload was refused (${res.status}). Check your connection and try again.`);
  }
}

/** The API's `{ error }` if it sent one, and something actionable if it did not. */
function apiError(status: number, body: unknown): string {
  const message = (body as { error?: string } | null)?.error;
  if (message) return message;
  if (status === 401) return "Sign in to share a video.";
  return `The server refused the request (${status}).`;
}

/**
 * Stop anything in flight for a project that is closing.
 *
 * An aborted upload leaves a `pending` row with no bytes behind it, which no
 * public route will ever serve — `bySlug` only returns `ready` rows.
 */
export function cancelSharesForProject(projectDir: string): void {
  for (const job of jobs.values()) {
    if (job.projectDir !== projectDir || job.status !== "running") continue;
    job.controller.abort();
    update(job.id, { status: "failed", error: "Cancelled", finishedAt: Date.now() });
  }
}
