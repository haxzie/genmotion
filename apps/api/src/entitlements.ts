import { and, count, eq, gt, db, schema } from "@genmotion/db";
import {
  PLANS,
  type PlanId,
  type SubscriptionStatus,
} from "@genmotion/shared";

/**
 * The one place that answers "what is this organization allowed to do".
 *
 * Every gate — quota checks, the invite hook, the billing page — resolves
 * through here, so plan policy is never re-implemented per call site. Seats,
 * limits and features are always read from the plan definition rather than
 * stored per-org, so changing a plan takes effect immediately with no backfill.
 *
 * Deliberately does NOT import ./limits — the dependency runs one way
 * (limits imports entitlements) so there is no cycle.
 */

type SubscriptionRow = typeof schema.organizationSubscriptions.$inferSelect;

export interface Entitlements {
  organizationId: string;
  plan: PlanId;
  planName: string;
  status: SubscriptionStatus | string;
  /** Seats the subscription currently covers — base plus add-on. */
  seats: number;
  canInvite: boolean;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  /** A paid plan is currently in force. */
  paid: boolean;
  /** A payment customer exists, so the billing portal can be opened. */
  manageable: boolean;
}

/** Statuses that entitle the org for as long as the paid period has left. */
const GRACE_STATUSES = new Set(["cancelled", "on_hold"]);

/**
 * Resolve a subscription row to what the org may actually do.
 *
 * Pure and exported so the whole downgrade policy is testable without a
 * database. Fails closed: anything unrecognised resolves to Free rather than
 * granting access, so a status the provider adds later can't silently entitle.
 */
export function entitlementsFromRow(
  organizationId: string,
  row: SubscriptionRow | null,
  now: Date = new Date(),
): Entitlements {
  let plan: PlanId = "free";
  const status = row?.status ?? "none";

  if (row && row.plan !== "free") {
    if (status === "active") {
      plan = row.plan;
    } else if (GRACE_STATUSES.has(status)) {
      // Cancelled or in dunning: keep what they paid for until the period ends.
      const end = row.currentPeriodEnd;
      if (end && end.getTime() > now.getTime()) plan = row.plan;
    }
    // Everything else — expired, failed, pending, none, or unknown — is Free.
  }

  const def = PLANS[plan];
  return {
    organizationId,
    plan,
    planName: def.name,
    status,
    seats: row?.seats ?? def.includedSeats,
    canInvite: def.canInvite,
    currentPeriodEnd: row?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: row?.cancelAtPeriodEnd ?? false,
    paid: plan !== "free",
    manageable: Boolean(row?.dodoCustomerId),
  };
}

export async function getSubscriptionRow(
  organizationId: string,
): Promise<SubscriptionRow | null> {
  const [row] = await db
    .select()
    .from(schema.organizationSubscriptions)
    .where(eq(schema.organizationSubscriptions.organizationId, organizationId));
  return row ?? null;
}

export async function getEntitlements(
  organizationId: string,
): Promise<Entitlements> {
  return entitlementsFromRow(
    organizationId,
    await getSubscriptionRow(organizationId),
  );
}

/**
 * People occupying a seat: accepted members plus invitations that could still
 * be accepted. An expired invitation can never become a member, so it must not
 * hold a seat hostage.
 */
export async function countSeats(
  organizationId: string,
  { includePendingInvitations = true }: { includePendingInvitations?: boolean } = {},
): Promise<number> {
  const [members, pending] = await Promise.all([
    db
      .select({ n: count() })
      .from(schema.member)
      .where(eq(schema.member.organizationId, organizationId)),
    includePendingInvitations
      ? db
          .select({ n: count() })
          .from(schema.invitation)
          .where(
            and(
              eq(schema.invitation.organizationId, organizationId),
              eq(schema.invitation.status, "pending"),
              gt(schema.invitation.expiresAt, new Date()),
            ),
          )
      : Promise.resolve([{ n: 0 }]),
  ]);
  return (members[0]?.n ?? 0) + (pending[0]?.n ?? 0);
}

export type InviteGateCode = "PLAN_REQUIRES_PRO" | "SEAT_LIMIT_REACHED";

export type InviteGate =
  | { ok: true }
  | {
      ok: false;
      code: InviteGateCode;
      message: string;
      plan: PlanId;
      seats: { used: number; max: number };
    };

/**
 * Whether the org may create one more invitation. Used by the invite hook and
 * mirrored to the client so the UI can gate the button before the round-trip.
 */
export async function assertCanInvite(
  organizationId: string,
  opts: { includePendingInvitations?: boolean } = {},
): Promise<InviteGate> {
  const ent = await getEntitlements(organizationId);

  if (!ent.canInvite) {
    return {
      ok: false,
      code: "PLAN_REQUIRES_PRO",
      plan: ent.plan,
      seats: { used: await countSeats(organizationId, opts), max: ent.seats },
      message: `Inviting teammates is part of ${PLANS.pro.name}. Upgrade to add your team at $${PLANS.pro.priceUsd} each.`,
    };
  }

  const used = await countSeats(organizationId, opts);
  if (used >= ent.seats) {
    return {
      ok: false,
      code: "SEAT_LIMIT_REACHED",
      plan: ent.plan,
      seats: { used, max: ent.seats },
      message: `Your ${ent.planName} plan includes ${ent.seats} seats and all of them are taken. Remove a member or cancel a pending invitation to free one up.`,
    };
  }

  return { ok: true };
}
