import { FREE_LIMITS, type LimitKind } from "./limits";

/**
 * Plan definitions — the single source of truth for what each plan allows.
 * Pure and browser-safe, so the API gates, the billing page, the upgrade modal
 * and the invite gate all describe the same product from one place.
 *
 * Nothing here is stored per-organization: an org row records which plan it is
 * on, and everything else is looked up from this table at read time. Changing
 * an allowance ships instantly with no backfill.
 */

export type PlanId = "free" | "pro" | "team";

export const PLAN_IDS = ["free", "pro", "team"] as const;

/** A limit of `null` means unlimited — gates skip counting entirely. */
export type PlanLimits = Record<LimitKind, number | null>;

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /**
   * List price in whole USD per month, for the plan as a whole — not per seat.
   * Team is a flat price covering its `seats`. Read through `planPrice()` so
   * the marketing page and the in-app billing page can never quote different
   * numbers; the payment provider remains the source of truth for what is
   * actually charged.
   */
  priceUsd: number;
  limits: PlanLimits;
  /** Total people an org may have: accepted members plus outstanding invites. */
  seats: number;
  /** Whether the org may create invitations at all. */
  canInvite: boolean;
  prioritySupport: boolean;
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
    // Derived from FREE_LIMITS rather than repeated, so the two can't drift.
    limits: {
      projects: FREE_LIMITS.projects,
      exports: FREE_LIMITS.exports,
      aiTurns: FREE_LIMITS.aiTurns,
    },
    seats: 1,
    canInvite: false,
    prioritySupport: false,
    purchasable: false,
    features: [
      `${FREE_LIMITS.projects} projects`,
      `${FREE_LIMITS.exports} exports a month`,
      `${FREE_LIMITS.aiTurns} AI messages a month`,
      "720p export with watermark",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 39,
    limits: { projects: null, exports: null, aiTurns: null },
    // Pro is deliberately single-seat: unlimited work for one person. Inviting
    // teammates is what Team is for.
    seats: 1,
    canInvite: false,
    prioritySupport: false,
    purchasable: true,
    features: [
      "Unlimited projects",
      "Unlimited exports",
      "Unlimited AI messages",
      "1080p & 4K export, no watermark",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceUsd: 199,
    limits: { projects: null, exports: null, aiTurns: null },
    seats: 10,
    canInvite: true,
    prioritySupport: true,
    purchasable: true,
    features: [
      "Everything in Pro",
      "Up to 10 seats",
      "Invite your teammates",
      "Priority support",
    ],
  },
};

/**
 * Hard ceiling on organization membership. This is NOT the per-plan seat count
 * — better-auth reuses its `membershipLimit` as the page size when listing
 * members, so a plan-derived value would truncate the members list of any org
 * that already has teammates. Plan-awareness belongs in the invite hooks.
 */
export const TEAM_SEATS = PLANS.team.seats;

/**
 * Free-plan counting starts here. Orgs that predate quota enforcement keep the
 * projects, exports and messages they already had — only activity from this
 * instant onward consumes an allowance, so nobody wakes up over quota.
 */
export const LIMITS_LIVE_AT = new Date("2026-08-01T00:00:00.000Z");

/** Subscription lifecycle, mirroring the states Dodo reports plus our own. */
export type SubscriptionStatus =
  | "none"
  | "pending"
  | "active"
  | "on_hold"
  | "cancelled"
  | "failed"
  | "expired";

/** Every reason the upgrade modal can open for. */
export type UpgradeReason = LimitKind | "invite" | "seats";

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

/**
 * List price as displayed, e.g. `$39`. Whole dollars, so no trailing `.00`.
 * Every surface that quotes a price goes through here.
 */
export function planPrice(plan: PlanId): string {
  return `$${PLANS[plan].priceUsd}`;
}

/** The org's cap for one quota, or null when the plan is unlimited. */
export function planLimit(plan: PlanId, kind: LimitKind): number | null {
  return PLANS[plan].limits[kind];
}

export function isUnlimited(plan: PlanId, kind: LimitKind): boolean {
  return planLimit(plan, kind) === null;
}
