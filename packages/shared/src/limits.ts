/**
 * Free-plan quotas, shared so the API enforces and the UI predicts the same
 * numbers. The API is always the authority — the client copy exists only to
 * avoid walking a user into a wall they could have been warned about.
 */
export const FREE_LIMITS = {
  /** Total projects that may exist at once. Deleting one frees a slot. */
  projects: 5,
  /** Exports started per calendar month. Failed exports don't count. */
  exports: 10,
  /** Chat turns sent to the agent per calendar month. */
  aiTurns: 10,
} as const;

export type LimitKind = keyof typeof FREE_LIMITS;

export interface LimitUsage {
  used: number;
  /** The org's cap, or null when its plan is unlimited for this quota. */
  max: number | null;
  /** How many more actions are allowed, or null when unlimited. */
  remaining: number | null;
  unlimited: boolean;
}

export type LimitSnapshot = Record<LimitKind, LimitUsage>;

/**
 * Body returned with HTTP 402 when a quota blocks an action. `max` stays a
 * plain number — you can only exceed a finite cap — so this contract is
 * unchanged by unlimited plans.
 */
export interface LimitExceededBody {
  error: string;
  limit: { kind: LimitKind; used: number; max: number };
}

/**
 * 402 Payment Required. Chosen over 403 so a quota block is never confused
 * with an auth failure — the client redirects on 401/403, but a quota should
 * open the upgrade modal and leave the user exactly where they were.
 */
export const LIMIT_STATUS = 402;

/** Narrow an arbitrary parsed response body to a quota rejection. */
export function isLimitExceededBody(body: unknown): body is LimitExceededBody {
  if (!body || typeof body !== "object") return false;
  const limit = (body as LimitExceededBody).limit;
  return (
    !!limit &&
    typeof limit === "object" &&
    typeof limit.kind === "string" &&
    limit.kind in FREE_LIMITS
  );
}

/**
 * Pull a quota rejection out of an opaque error string. The AI SDK's chat
 * transport surfaces a failed response as an Error whose message is the raw
 * body, so this is the only handle we get on the chat path.
 */
export function parseLimitFromText(text: string): LimitExceededBody | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    return isLimitExceededBody(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
