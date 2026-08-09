/**
 * A best-effort per-IP token bucket for the public tool endpoints.
 *
 * Deliberately in-memory: it is per-instance and resets on deploy, which is
 * acceptable here because it is not the primary defence. Next's data cache in
 * front of every upstream call is — a repeat request for a popular repo never
 * reaches GitHub at all, so the worst a flood can do is burn our own CPU. This
 * bucket just stops one client monopolising that.
 *
 * If these tools ever get an endpoint that costs real money per call, replace
 * this with something shared across instances.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
/** Above this many tracked clients we drop the oldest, bounding memory. */
const MAX_TRACKED = 10_000;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the caller may retry; only meaningful when `ok` is false. */
  retryAfter: number;
}

export function rateLimit(key: string, now = Date.now()): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED) {
      // Map preserves insertion order, so the first key is the oldest bucket.
      const oldest = buckets.keys().next();
      if (!oldest.done) buckets.delete(oldest.value);
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }

  existing.count++;
  if (existing.count > MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * Best guess at the caller's address. Behind a proxy the left-most
 * `x-forwarded-for` entry is the client; with no header at all we fall back to
 * a shared bucket, which throttles the whole instance rather than nobody.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
