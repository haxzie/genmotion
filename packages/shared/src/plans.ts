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

export type PlanId = "free" | "pro" | "max";

export const PLAN_IDS = ["free", "pro"] as const;

/** Price per person, per month, in whole USD. One number, everywhere. */
export const SEAT_PRICE_USD = 19;
/** GenMotion Max: one price for the whole team. */
export const MAX_PRICE_USD = 199;

/**
 * What Pro may generate in a calendar month, per meter; Max gets a multiple
 * of it (see `allowanceMultiplier`), pooled across the whole team.
 *
 * Sized so a seat that uses all three costs us about a third of its price
 * at list rates, and a typical one far less: 15,000 characters is roughly
 * ten minutes of narration, or fifteen to twenty short videos. The API
 * enforces it; the app shows it.
 */
export const PLUGIN_ALLOWANCE = {
  /** Characters of narration through `generate_voiceover`. */
  characters: 15_000,
  /** Sound effects generated. */
  sfx: 60,
  /** Images generated. */
  images: 100,
} as const;

export type PluginMeter = keyof typeof PLUGIN_ALLOWANCE;

/** The allowance an org on `plan` has this month: the base times the plan's multiplier. */
export function pluginAllowance(plan: PlanId): Record<PluginMeter, number> {
  const n = PLANS[plan].allowanceMultiplier;
  return {
    characters: PLUGIN_ALLOWANCE.characters * n,
    sfx: PLUGIN_ALLOWANCE.sfx * n,
    images: PLUGIN_ALLOWANCE.images * n,
  };
}

/** One meter as the API reports it and the app draws it. */
export interface MeterUsage {
  used: number;
  limit: number;
}

export interface PluginUsage {
  /** ISO timestamps: the calendar month, UTC. */
  period: { start: string; end: string };
  characters: MeterUsage;
  sfx: MeterUsage;
  images: MeterUsage;
}

/**
 * The team policy as the API decides it and the apps render it — one block on
 * /api/billing/limits. Whether an invite may go, the sentence beside the
 * control, and which plan to pitch when an upgrade would lift the refusal.
 * The apps branch on none of the rules behind it.
 */
export interface TeamPolicy {
  canInvite: boolean;
  seats: { used: number; max: number };
  /** Every seat taken — members plus pending invitations. */
  full: boolean;
  message: string;
  code?: "PLAN_REQUIRES_UPGRADE" | "SEAT_LIMIT_REACHED" | "TEAM_FULL";
  upgrade?: PlanId;
}

/**
 * HTTP 429 body when a meter is spent. Not a paywall — the org is paying —
 * so a different shape, and the message says when it comes back.
 */
export interface QuotaBody {
  error: string;
  quota: { meter: PluginMeter; used: number; limit: number; resetsAt: string };
}

export const QUOTA_STATUS = 429;

export function isQuotaBody(body: unknown): body is QuotaBody {
  if (!body || typeof body !== "object") return false;
  const quota = (body as QuotaBody).quota;
  return Boolean(quota && typeof quota === "object" && typeof quota.meter === "string");
}

/** How long a new organization may use the app before it has to pay. */
export const TRIAL_DAYS = 7;

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /**
   * List price in whole USD per month for the whole plan. Read through
   * `planPrice()` so the marketing page and the in-app billing page can never
   * quote different numbers; the payment provider remains the source of truth
   * for what is actually charged.
   */
  priceUsd: number;
  /**
   * Seats the plan carries — the whole of them: there are no add-ons. Pro is
   * one person; Max is a team of five. More than that is a conversation.
   */
  includedSeats: number;
  /** Whether the org may create invitations at all. */
  canInvite: boolean;
  /** How many Pro allowances of generation the plan gets a month. */
  allowanceMultiplier: number;
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
    allowanceMultiplier: 0,
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
    canInvite: false,
    allowanceMultiplier: 1,
    purchasable: true,
    features: [
      "Everything in the trial, without the clock",
      "Unlimited projects, exports and scenes",
      "Exports with no GenMotion watermark",
      `${PLUGIN_ALLOWANCE.characters.toLocaleString("en-US")} characters of voiceover, ${PLUGIN_ALLOWANCE.sfx} sound effects and ${PLUGIN_ALLOWANCE.images} images a month`,
      "One seat",
      "Priority support",
    ],
  },
  max: {
    id: "max",
    name: "Max",
    priceUsd: MAX_PRICE_USD,
    includedSeats: 5,
    canInvite: true,
    allowanceMultiplier: 5,
    purchasable: true,
    features: [
      "Everything in Pro",
      "Five seats — invite your team",
      `${(PLUGIN_ALLOWANCE.characters * 5).toLocaleString("en-US")} characters of voiceover, ${PLUGIN_ALLOWANCE.sfx * 5} sound effects and ${PLUGIN_ALLOWANCE.images * 5} images a month, shared`,
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

/** What a plan costs per month — the same whatever the headcount within it. */
export function monthlyTotalUsd(plan: PlanId): number {
  return PLANS[plan].priceUsd;
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
