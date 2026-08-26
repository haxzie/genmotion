import type { UpgradeReason } from "./plans";

/**
 * What blocks an action, and how the client is told.
 *
 * There are no usage meters any more — no project, export or message quotas.
 * The desktop app does the work on the user's own machine with their own
 * agent, so there is nothing of ours being consumed to count. Two things gate:
 * the trial running out, and an invite that would exceed the seats paid for.
 */

/**
 * Body returned with HTTP 402 when a paywall blocks an action.
 *
 * `reason` is what the upgrade modal opens for; `message` is what a client
 * without a modal (the desktop app) can show verbatim.
 */
export interface PaywallBody {
  error: string;
  paywall: {
    reason: UpgradeReason;
    message: string;
    /** Present for `seats`: what they have, and what the action needed. */
    seats?: { used: number; included: number };
  };
}

/**
 * 402 Payment Required. Chosen over 403 so a paywall is never confused with an
 * auth failure — the client redirects on 401/403, but a paywall should open the
 * upgrade path and leave the user exactly where they were.
 */
export const PAYWALL_STATUS = 402;

/** Narrow an arbitrary parsed response body to a paywall rejection. */
export function isPaywallBody(body: unknown): body is PaywallBody {
  if (!body || typeof body !== "object") return false;
  const paywall = (body as PaywallBody).paywall;
  return (
    !!paywall &&
    typeof paywall === "object" &&
    (paywall.reason === "trial" || paywall.reason === "seats")
  );
}
