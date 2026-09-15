import { and, count, eq, gt, db, schema } from "@genmotion/db";
import {
  PLANS,
  type PlanId,
  type SubscriptionStatus,
  type TeamPolicy,
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

/**
 * Statuses that entitle the org for as long as the paid period has left.
 * `paused` is a customer-initiated pause; like dunning, what was paid for
 * stays usable until the period it covered runs out.
 */
const GRACE_STATUSES = new Set(["cancelled", "on_hold", "paused"]);

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
    // The plan's seats, whole: Pro is one person, Max is five. The row's
    // own count is history from when seats were add-ons.
    seats: def.includedSeats,
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

/**
 * Why a team action is refused. `PLAN_REQUIRES_UPGRADE` is a plan without
 * teammates (Pro) — the answer is Max. `SEAT_LIMIT_REACHED` is Max with every
 * seat taken — the answer is a word with us. `TEAM_FULL` is the invitee's side
 * of the same wall.
 */
export type InviteGateCode = "PLAN_REQUIRES_UPGRADE" | "SEAT_LIMIT_REACHED" | "TEAM_FULL";

export type InviteGate =
  | { ok: true }
  | {
      ok: false;
      code: InviteGateCode;
      message: string;
      plan: PlanId;
      seats: { used: number; max: number };
      /** The plan that lifts the refusal, when one does. */
      upgrade?: PlanId;
    };

/** See `TeamPolicy` in @genmotion/shared — this is where it is decided. */
export async function teamPolicy(organizationId: string): Promise<TeamPolicy> {
  const gate = await assertCanInvite(organizationId);
  if (gate.ok) {
    const ent = await getEntitlements(organizationId);
    const used = await countSeats(organizationId);
    const left = ent.seats - used;
    return {
      canInvite: true,
      seats: { used, max: ent.seats },
      full: false,
      message: `${used} of ${ent.seats} seats in use · ${left} ${left === 1 ? "seat" : "seats"} left.`,
    };
  }
  return {
    canInvite: false,
    seats: gate.seats,
    full: gate.code === "SEAT_LIMIT_REACHED",
    message: gate.message,
    code: gate.code,
    ...(gate.upgrade ? { upgrade: gate.upgrade } : {}),
  };
}

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
      code: "PLAN_REQUIRES_UPGRADE",
      plan: ent.plan,
      seats: { used: await countSeats(organizationId, opts), max: ent.seats },
      upgrade: "max",
      message: `Teammates are part of GenMotion ${PLANS.max.name} — ${PLANS.max.includedSeats} seats for $${PLANS.max.priceUsd} a month. Upgrade to invite your team.`,
    };
  }

  const used = await countSeats(organizationId, opts);
  if (used >= ent.seats) {
    return {
      ok: false,
      // The invitee's side reads the same wall as TEAM_FULL — see the accept hook.
      code: opts.includePendingInvitations === false ? "TEAM_FULL" : "SEAT_LIMIT_REACHED",
      plan: ent.plan,
      seats: { used, max: ent.seats },
      message:
        opts.includePendingInvitations === false
          ? `This team is already full (${ent.seats} of ${ent.seats} seats). Ask an admin to make room, or to contact us for more seats.`
          : `Your ${ent.planName} plan covers ${ent.seats} seats and all of them are taken. Remove a member or cancel a pending invitation to free one — or contact us for more seats.`,
    };
  }

  return { ok: true };
}
