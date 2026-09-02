import path from "node:path";
import fs from "node:fs/promises";
import { app } from "electron";

/**
 * Product analytics for the desktop app.
 *
 * The app ships no PostHog key — bundling a write credential into an
 * open-source distributable would hand it to every user — so events go to the
 * hosted API's `POST /api/events`, which holds the key and forwards them under
 * a `desktop_` prefix. See apps/api/src/routes/events.ts.
 *
 * That endpoint is session-authed, so nothing can be sent until the user has
 * signed in. Rather than throw away everything that happens before that (the
 * launch, the sign-in itself — precisely the funnel worth measuring), events
 * queue here with the time they actually happened and flush once a token
 * exists. The endpoint accepts that `timestamp`, so a backfilled launch lands
 * where it belongs rather than at the moment of sign-in.
 *
 * The queue is on disk for the same reason: a first run that ends before the
 * user signs in is still a first run, and it should survive the quit.
 *
 * Nothing here is allowed to throw or to make a caller wait. Analytics that can
 * break the app is worse than no analytics.
 */

/** One queued event, in the shape the endpoint takes. */
interface QueuedEvent {
  name: string;
  properties?: Record<string, unknown>;
  /** ISO 8601. When it happened, which is rarely when it is sent. */
  timestamp: string;
}

/**
 * Sends one batch. Resolves with the HTTP status so the queue can tell "not
 * signed in yet" (401 — keep waiting) from "delivered" (2xx — drop them).
 */
export type EventSender = (
  events: QueuedEvent[],
) => Promise<{ ok: boolean; status: number }>;

/** The server refuses a larger batch; see MAX_BATCH in the events route. */
const MAX_BATCH = 50;
/**
 * How much backlog is worth keeping. Generous enough to cover a long spell
 * signed out, small enough that a client which never signs in cannot grow a
 * file without bound. Oldest events are dropped first — the recent ones are
 * the ones still worth having.
 */
const MAX_QUEUE = 500;
/** Idle flush cadence. Lifecycle events are low-volume; there is no hurry. */
const FLUSH_INTERVAL_MS = 30_000;
/** After a failure that isn't "signed out", wait before trying again. */
const RETRY_DELAY_MS = 60_000;

let queue: QueuedEvent[] = [];
let sender: EventSender | null = null;
let timer: NodeJS.Timeout | null = null;
let flushing = false;
/** Set once the file has been read, so a flush cannot race the initial load. */
let loaded = false;

function queueFile(): string {
  return path.join(app.getPath("userData"), "analytics-queue.json");
}

async function persist(): Promise<void> {
  try {
    await fs.writeFile(queueFile(), JSON.stringify(queue), "utf8");
  } catch {
    // A queue we cannot write is a queue we keep only in memory. Not worth
    // reporting to the user, and definitely not worth failing over.
  }
}

async function load(): Promise<void> {
  try {
    const raw = await fs.readFile(queueFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const restored = parsed.filter(
        (e): e is QueuedEvent =>
          !!e && typeof (e as QueuedEvent).name === "string" && typeof (e as QueuedEvent).timestamp === "string",
      );
      // Prepended, not assigned: `track()` is callable the moment the app is
      // ready, so anything recorded while this read was in flight is already in
      // `queue` and must not be overwritten. Older events go first.
      queue = [...restored, ...queue].slice(-MAX_QUEUE);
    }
  } catch {
    // No queue, or an unreadable one. Either way there is nothing to send.
  }
  loaded = true;
}

/**
 * Record an event. Returns immediately — delivery happens later, or never, and
 * neither outcome concerns the caller.
 */
export function track(name: string, properties?: Record<string, unknown>): void {
  queue.push({ name, properties, timestamp: new Date().toISOString() });
  // Drop from the front: when the backlog is capped, the newest events are the
  // ones still worth having.
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  void persist();
  schedule(0);
}

function schedule(delayMs: number): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), delayMs);
}

/**
 * Send what is queued, oldest first, a batch at a time.
 *
 * Stops at the first batch that does not land, leaving it queued: a 401 means
 * the user has not signed in yet, and anything else means the API is having a
 * moment. Both are worth waiting out rather than dropping events over.
 */
async function flush(): Promise<void> {
  if (flushing || !sender || !loaded) return;
  flushing = true;
  try {
    while (queue.length > 0) {
      const batch = queue.slice(0, MAX_BATCH);
      let res: { ok: boolean; status: number };
      try {
        res = await sender(batch);
      } catch {
        // Offline. Keep everything and try again later.
        schedule(RETRY_DELAY_MS);
        return;
      }
      if (!res.ok) {
        // 401: signed out. The next sign-in triggers a flush, so there is no
        // need to poll for it — the idle timer is only a backstop.
        schedule(res.status === 401 ? FLUSH_INTERVAL_MS : RETRY_DELAY_MS);
        return;
      }
      queue = queue.slice(batch.length);
      await persist();
    }
  } finally {
    flushing = false;
  }
  // Idle: nothing queued, so this is purely a backstop for events recorded
  // while a flush was already in flight.
  schedule(FLUSH_INTERVAL_MS);
}

/**
 * Wire up delivery and drain whatever last run left behind.
 *
 * Called once from the main process at startup. The sender is injected rather
 * than imported so this module knows nothing about auth — which is what keeps
 * `auth.ts` free to record its own events without a circular import.
 */
export function startAnalytics(send: EventSender): void {
  sender = send;
  void load().then(() => flush());
}

/** A token just arrived. Send the backlog now rather than waiting out the timer. */
export function flushAnalytics(): void {
  schedule(0);
}
