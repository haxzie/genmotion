import { FREE_EXPORTS_PER_MONTH, planPrice, type UpgradeReason } from "./plans";

/**
 * What blocks an action, and how the client is told.
 *
 * Three things gate. A Free month's exports being spent; an invite that would
 * exceed the seats paid for; and a chat plugin, which spends provider credit
 * we pay for and so needs a paid plan rather than merely a signed-in one.
 *
 * Nothing the user's own machine does is gated: projects, scenes and agent
 * conversations are unlimited on every plan, including Free. See the note at
 * the top of plans.ts for why the export meter is the exception.
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
    /**
     * Present for `exports`: the spent meter and when it comes back. The
     * reset date is what stops the refusal reading as permanent — a Free user
     * who waits is not blocked, and the message should say so.
     */
    exports?: { used: number; limit: number; resetsAt: string };
  };
}

/**
 * 402 Payment Required. Chosen over 403 so a paywall is never confused with an
 * auth failure — the client redirects on 401/403, but a paywall should open the
 * upgrade path and leave the user exactly where they were.
 */
export const PAYWALL_STATUS = 402;

/** "March 1" — how a reset date reads inside a sentence. */
function resetDay(resetsAt: string): string {
  return new Date(resetsAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The export-allowance rejection, exactly as the hosted API answers it.
 *
 * Built from the meter rather than hardcoded, because the desktop app renders
 * locally and refuses locally: it holds the same counts from
 * `/api/billing/limits` and has no reason to round-trip the API a second time
 * to be told what it already knows. Both sides call this so the two can never
 * word the same refusal differently.
 */
export function exportLimitPaywall(meter: {
  used: number;
  limit: number;
  resetsAt: string;
}): PaywallBody {
  return {
    error: "This month's free exports are used up.",
    paywall: {
      reason: "exports",
      message: `Free includes ${meter.limit} exports a month and you have used ${meter.used}. The allowance resets on ${resetDay(meter.resetsAt)}. Upgrade to Pro for unlimited exports — ${planPrice("pro")} a month.`,
      exports: meter,
    },
  };
}

/**
 * The same refusal when the caller has no live meter to quote — an offline
 * desktop that has never successfully read `/limits`, for instance. Says the
 * plan's rule rather than this org's count, which is the most it can honestly
 * claim to know.
 */
export function exportLimitPaywallUnmetered(): PaywallBody {
  return {
    error: "This month's free exports are used up.",
    paywall: {
      reason: "exports",
      message: `Free includes ${FREE_EXPORTS_PER_MONTH} exports a month. Upgrade to Pro for unlimited exports — ${planPrice("pro")} a month.`,
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
    (paywall.reason === "exports" ||
      paywall.reason === "seats" ||
      paywall.reason === "plugin")
  );
}
