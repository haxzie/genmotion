import { randomBytes } from "node:crypto";
import type { GitJob, GitJobKind } from "../shared";
import type { ProjectSession } from "../project-session";
import { publish, sync, type PublishInput } from "./repo";

/**
 * Publish and Sync as jobs, for the same reason exports are.
 *
 * A push is a network operation over a folder of megabytes; it takes long
 * enough that the renderer needs to show something moving, and the HTTP request
 * that started it must not be what the user is waiting on. So the POST returns
 * an id and the button subscribes to the job's progress — the shape
 * `export/service.ts` already established.
 *
 * Unlike exports there is no queue. Two git operations in one folder would
 * fight over the index, so a second request for a project that is already
 * running one is refused rather than lined up.
 */

type Listener = (job: GitJob) => void;

interface Job extends GitJob {
  controller: AbortController;
}

const jobs = new Map<string, Job>();
const listeners = new Set<Listener>();

/** Jobs older than this are dropped when a new one starts, so the map can't grow forever. */
const KEEP_MS = 10 * 60 * 1000;

function publicJob(job: Job): GitJob {
  const { controller: _controller, ...rest } = job;
  return rest;
}

export function onGitChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGitJob(id: string): GitJob | null {
  const job = jobs.get(id);
  return job ? publicJob(job) : null;
}

function update(id: string, patch: Partial<GitJob>): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch);
  const snapshot = publicJob(job);
  for (const listener of listeners) listener(snapshot);
}

function runningFor(projectDir: string): Job | null {
  for (const job of jobs.values()) {
    if (job.projectDir === projectDir && job.status === "running") return job;
  }
  return null;
}

function sweep(): void {
  const cutoff = Date.now() - KEEP_MS;
  for (const [id, job] of jobs) {
    if (job.status !== "running" && (job.finishedAt ?? job.createdAt) < cutoff) jobs.delete(id);
  }
}

function start(session: ProjectSession, kind: GitJobKind): Job {
  if (runningFor(session.dir)) {
    throw new Error(
      "This project is already talking to GitHub. Wait for that to finish and try again.",
    );
  }
  sweep();
  const job: Job = {
    id: randomBytes(9).toString("base64url"),
    kind,
    projectId: session.dir,
    projectDir: session.dir,
    status: "running",
    step: kind === "publish" ? "Preparing the folder" : "Staging changes",
    progress: 0,
    createdAt: Date.now(),
    controller: new AbortController(),
  };
  jobs.set(job.id, job);
  for (const listener of listeners) listener(publicJob(job));
  return job;
}

function finish(id: string, err: unknown, url?: string | null): void {
  if (err) {
    update(id, {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      finishedAt: Date.now(),
    });
    return;
  }
  update(id, {
    status: "done",
    step: "Up to date",
    progress: 100,
    finishedAt: Date.now(),
    ...(url ? { url } : {}),
  });
}

export function startPublish(
  session: ProjectSession,
  input: Omit<PublishInput, "projectName" | "engine">,
  projectName: string,
  engine: PublishInput["engine"],
): GitJob {
  const job = start(session, "publish");
  void publish(
    session.dir,
    { ...input, projectName, engine },
    (step, progress) => update(job.id, { step, progress }),
    job.controller.signal,
  )
    .then(
      (result) => finish(job.id, null, result.url),
      (err: unknown) => finish(job.id, err),
    )
    // The publish rewrote `.gitignore` and maybe added a README; the editor's
    // file tree should show them without the user reopening the project.
    .finally(() => session.touch());
  return publicJob(job);
}

export function startSync(session: ProjectSession, projectName: string): GitJob {
  const job = start(session, "sync");
  void sync(
    session.dir,
    projectName,
    (step, progress) => update(job.id, { step, progress }),
    job.controller.signal,
  )
    .then(
      (result) => finish(job.id, null, result.url),
      (err: unknown) => finish(job.id, err),
    )
    .finally(() => session.touch());
  return publicJob(job);
}

/**
 * Stop anything running for a project that is being closed.
 *
 * Called from `closeSession`, alongside the export and scaffold equivalents. A
 * killed `git push` leaves the local repo intact — the worst case is a commit
 * that didn't reach GitHub, which the next Sync sends.
 */
export function cancelGitForProject(projectDir: string): void {
  for (const job of jobs.values()) {
    if (job.projectDir !== projectDir || job.status !== "running") continue;
    job.controller.abort();
    update(job.id, { status: "failed", error: "Cancelled", finishedAt: Date.now() });
  }
}
