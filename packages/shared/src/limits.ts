import type { UpgradeReason } from "./plans";

/**
 * What blocks an action, and how the client is told.
 *
 * There are still no usage meters — no project, export or message quotas. The
 * desktop app does the work on the user's own machine with their own agent, so
 * there is nothing of ours being consumed to count. Three things gate: the
 * trial running out, an invite that would exceed the seats paid for, and a
 * chat plugin, which spends provider credit we pay for and so needs a paid
 * plan rather than merely an unexpired one.
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

/**
 * The trial-ended rejection, exactly as the hosted API answers it.
 *
 * A pure constant rather than something computed per-caller: the desktop app
 * builds this same body itself (it already holds `trial`/`subscription` from
 * `/api/billing/limits`, and has no reason to round-trip the API a second time
 * just to be told what it already knows) when it refuses a local export, and
 * the two must say the same thing.
 */
export function trialEndedPaywall(): PaywallBody {
  return {
    error: "Your free trial has ended.",
    paywall: {
      reason: "trial",
      message: "Your 7-day trial has ended. Upgrade to Pro to keep exporting — $19 a month.",
    },
  };
}

/** Narrow an arbitrary parsed response body to a paywall rejection. */
export function isPaywallBody(body: unknown): body is PaywallBody {
  if (!body || typeof body !== "object") return false;
  const paywall = (body as PaywallBody).paywall;
  return (
    !!paywall &&
    typeof paywall === "object" &&
    (paywall.reason === "trial" ||
      paywall.reason === "seats" ||
      paywall.reason === "plugin")
  );
}
