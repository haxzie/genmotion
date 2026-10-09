import { planPrice, TRIAL_DAYS, type UpgradeReason } from "./plans";

/**
 * What blocks an action, and how the client is told.
 *
 * Three things gate. The trial running out, which stops exports; an invite
 * that would exceed the seats paid for; and a chat plugin, which spends
 * provider credit we pay for and so needs a paid plan rather than merely an
 * unexpired one.
 *
 * Nothing is metered while the trial runs: projects, scenes and agent
 * conversations are unlimited on every plan, including the trial. See the note
 * at the top of plans.ts for why time is what Free is bounded by.
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
    /** Present for `trial`: when the clock ran out, if we can date it. */
    trial?: { endedAt: string | null };
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
 * Both sides call this, so neither can word the same refusal differently: the
 * desktop app renders locally and refuses locally, and it already holds the
 * trial state from `/api/billing/limits` rather than round-tripping the API a
 * second time to be told what it knows.
 */
export function trialEndedPaywall(endedAt?: Date | null): PaywallBody {
  return {
    error: "Your free trial has ended.",
    paywall: {
      reason: "trial",
      message: `Your ${TRIAL_DAYS}-day trial has ended. Upgrade to Pro to keep exporting, ${planPrice("pro")} a month.`,
      trial: { endedAt: endedAt?.toISOString() ?? null },
    },
  };
}

/** Narrow an arbitrary parsed response body to a paywall rejection. */
export function isPaywallBody(body: unknown): body is PaywallBody {
  if (!body || typeof body !== "object") return false;
  const paywall = (body as PaywallBody).paywall;
  if (!paywall || typeof paywall !== "object") return false;
  return (
    paywall.reason === "trial" ||
    paywall.reason === "seats" ||
    paywall.reason === "plugin" ||
    // `exports` is what the monthly-allowance release answered with. Still
    // accepted so a 0.2.x client's body (and an older API's, read by a newer
    // client) narrows to a paywall rather than falling through as an unknown
    // error. DELETE once no 0.2.x build is in the field.
    (paywall.reason as string) === "exports"
  );
}
