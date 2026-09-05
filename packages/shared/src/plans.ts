/**
 * Plan definitions — the single source of truth for what each plan allows.
 * Pure and browser-safe, so the API gates, the billing page, the upgrade modal
 * and the invite gate all describe the same product from one place.
 *
 * The product is one paid plan priced per person. An organization buys Pro,
 * which carries one seat; every teammate after that is a seat add-on at the
 * same price. There are no usage meters — no project, export or message
 * quotas — because the desktop app runs the work on the user's own machine
 * with their own agent, so there is nothing metered for us to meter.
 *
 * Chat plugins are the one exception, and the reason `UpgradeReason` has a
 * third member. Rendering still happens on the user's machine, but voiceover
 * and image generation run against providers we hold the keys for and pay per
 * call — so they gate on a paid subscription rather than on the trial. Calls
 * are logged, not counted: there is no quota, only a record of what a Pro seat
 * actually costs.
 *
 * Free is a seven-day trial of everything else, not a reduced tier.
 */

export type PlanId = "free" | "pro";

export const PLAN_IDS = ["free", "pro"] as const;

/** Price per person, per month, in whole USD. One number, everywhere. */
export const SEAT_PRICE_USD = 19;

/** How long a new organization may use the app before it has to pay. */
export const TRIAL_DAYS = 7;

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /**
   * List price in whole USD per person per month. Read through `planPrice()`
   * so the marketing page and the in-app billing page can never quote
   * different numbers; the payment provider remains the source of truth for
   * what is actually charged.
   */
  priceUsd: number;
  /** Seats the plan carries before any add-on. */
  includedSeats: number;
  /** Whether the org may create invitations at all. */
  canInvite: boolean;
  /** Buyable through checkout. Free is the absence of a subscription. */
  purchasable: boolean;
  /** Marketing bullets — used by both the modal and the billing page. */
  features: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free trial",
    priceUsd: 0,
    includedSeats: 1,
    canInvite: false,
    purchasable: false,
    features: [
      `${TRIAL_DAYS} days of the full studio`,
      "Unlimited projects and exports",
      "Bring your own coding agent",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: SEAT_PRICE_USD,
    includedSeats: 1,
    canInvite: true,
    purchasable: true,
    features: [
      "Everything in the trial, without the clock",
      "Unlimited projects, exports and scenes",
      "Exports with no GenMotion watermark",
      "Voiceover and image generation in chat",
      `Invite teammates at $${SEAT_PRICE_USD} each`,
      "Priority support",
    ],
  },
};

/**
 * Hard ceiling on organization membership. This is NOT a plan seat count —
 * better-auth reuses its `membershipLimit` as the page size when listing
 * members, so a plan-derived value would truncate the members list of any org
 * that already has teammates. Seat enforcement belongs in the invite hooks.
 */
export const TEAM_SEATS = 100;

/** Subscription lifecycle, mirroring the states Dodo reports plus our own. */
export type SubscriptionStatus =
  | "none"
  | "pending"
  | "active"
  | "on_hold"
  | "paused"
  | "cancelled"
  | "failed"
  | "expired";

/**
 * Every reason the upgrade modal can open for.
 *
 * `trial` is the expiry of the free week; `seats` is an invite that would
 * exceed what the subscription covers; `plugin` is a provider-backed feature
 * the trial deliberately does not include, because each call spends money we
 * would not get back from an org that never converts.
 */
export type UpgradeReason = "trial" | "seats" | "plugin";

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

/**
 * List price as displayed, e.g. `$19`. Whole dollars, so no trailing `.00`.
 * Every surface that quotes a price goes through here.
 */
export function planPrice(plan: PlanId): string {
  return `$${PLANS[plan].priceUsd}`;
}

/** What an org of this size costs per month on Pro. */
export function monthlyTotalUsd(seats: number): number {
  return Math.max(1, seats) * SEAT_PRICE_USD;
}

// ── Trial ────────────────────────────────────────────────────────────────

/**
 * When the trial runs out.
 *
 * Measured from when the organization was created, which is a server fact
 * recorded once. Anchoring on anything the client controls — first launch,
 * first export — would reset with a reinstall.
 */
export function trialEndsAt(organizationCreatedAt: Date): Date {
  return new Date(organizationCreatedAt.getTime() + TRIAL_DAYS * 86_400_000);
}

export function isTrialActive(
  organizationCreatedAt: Date,
  now: Date = new Date(),
): boolean {
  return now < trialEndsAt(organizationCreatedAt);
}

/**
 * Whole days left, rounded up, floored at zero.
 *
 * Rounded up because a trial with four hours left should read "1 day left",
 * not "0 days left" — which sounds like it has already gone.
 */
export function trialDaysLeft(
  organizationCreatedAt: Date,
  now: Date = new Date(),
): number {
  const ms = trialEndsAt(organizationCreatedAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
