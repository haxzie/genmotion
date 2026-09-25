/**
 * Plan definitions — the single source of truth for what each plan allows.
 * Pure and browser-safe, so the API gates, the billing page, the upgrade modal
 * and the invite gate all describe the same product from one place.
 *
 * Free is a tier, not a clock. It does not expire, and it caps nothing the
 * user's own machine pays for: projects, scenes and agent conversations are
 * unlimited on every plan, because the desktop app runs that work locally
 * with the user's own agent and there is nothing of ours being consumed.
 *
 * Two things do cost us something, and those are what Free is bounded by:
 *
 *  - Exports. The render is local, so a finished video costs us nothing to
 *    produce — but it is the moment of value, and a tier that hands out an
 *    unlimited supply of them has nothing left to sell. Free gets
 *    FREE_EXPORTS_PER_MONTH a month; paid plans get no ceiling. The video
 *    itself is identical either way: no badge, no branding, nothing to crop
 *    out. A free export is a finished export.
 *  - Chat plugins. Voiceover, sound effects and image generation run against
 *    providers we hold the keys for and pay per call, so Free does not get
 *    them at all and paid plans get a monthly allowance. Calls are logged as
 *    well as counted: the log is what a Pro seat actually costs us.
 *
 * Everything else is looked up from the plan at read time, never stored.
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

/**
 * Exports a Free organization may finish in a calendar month.
 *
 * The number is a judgement, not a cost recovery: rendering happens on the
 * user's machine, so five costs us exactly what fifty would. It is set where
 * one real launch fits comfortably inside it — draft, re-cut, ship — and a
 * second one does not, because the org that makes video every week is the one
 * the paid plan is for.
 *
 * Counted per organization rather than per seat: Free carries a single seat,
 * so the two are the same number today, and making it per-org means adding
 * seats can never multiply the free allowance.
 */
export const FREE_EXPORTS_PER_MONTH = 5;

/**
 * How many exports `plan` may finish this month; `null` for no ceiling.
 *
 * `null` rather than `Infinity` so a caller has to decide what an unlimited
 * plan does instead of accidentally rendering "3 of Infinity" in a meter.
 */
export function exportAllowance(plan: PlanId): number | null {
  return plan === "free" ? FREE_EXPORTS_PER_MONTH : null;
}

/**
 * The export meter as the API reports it and the app draws it.
 *
 * `limit: null` is an unlimited plan; `used` is still counted and returned for
 * it, because "you exported 40 videos this month" is worth showing to someone
 * paying for the privilege even when nothing is enforced.
 */
export interface ExportUsage {
  /** ISO timestamps: the calendar month, UTC. The clock `PluginUsage` keeps. */
  period: { start: string; end: string };
  used: number;
  limit: number | null;
  /** Exports left, or `null` when the plan has no ceiling. Never negative. */
  remaining: number | null;
}

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
    name: "Free",
    priceUsd: 0,
    includedSeats: 1,
    canInvite: false,
    allowanceMultiplier: 0,
    purchasable: false,
    features: [
      "Unlimited projects, scenes and chat",
      "Bring your own coding agent",
      `${FREE_EXPORTS_PER_MONTH} exports a month, unbranded`,
      "No voiceover, sound effects or image generation",
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
      "Everything in Free, uncapped",
      "Unlimited exports, at any resolution",
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
 * `exports` is a Free month's allowance spent; `seats` is an invite that would
 * exceed what the subscription covers; `plugin` is a provider-backed feature
 * Free deliberately does not include, because each call spends money we would
 * not get back from an org that never converts.
 */
export type UpgradeReason = "exports" | "seats" | "plugin";

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
