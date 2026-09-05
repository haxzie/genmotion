import { eq, db, schema } from "@genmotion/db";
import { SEAT_PRICE_USD } from "@genmotion/shared";
import { changeSeats, dodoEnabled } from "../dodo";
import { countSeats, getSubscriptionRow } from "../entitlements";

/**
 * Seats are bought by inviting and released by removing people. Nothing else
 * in the product touches the subscription's size.
 *
 * The one rule: the subscription covers the org's headcount. Every caller asks
 * for the count to be brought in line with what is actually there rather than
 * incrementing or decrementing, so the operation is idempotent and drift —
 * an expired invitation, a member who left, a charge that went through just
 * before an insert failed — heals on the next seat event instead of
 * accumulating.
 */

export type SyncSeatsOutcome =
  | { ok: true; seats: number; changed: boolean }
  | {
      ok: false;
      /**
       * `NOT_RESIZABLE`: there is no live subscription to resize — the org is
       * on trial, its subscription is on hold or ending, or billing is off.
       * `PROVIDER_ERROR`: there is one, but the provider refused the change.
       */
      code: "NOT_RESIZABLE" | "PROVIDER_ERROR";
      message: string;
    };

/** Why the subscription cannot be resized, in words the inviter can act on. */
function notResizable(status: string | undefined, ending = false): string {
  // Dodo refuses plan changes on a subscription scheduled to cancel (observed
  // in test mode: the change-plan call errors), so say what to do instead.
  if (ending) {
    return "Your subscription is set to cancel at the end of the period, so seats can't be added. Revoke the cancellation from the billing portal to add people.";
  }
  switch (status) {
    case "on_hold":
    case "failed":
      return "There's a payment problem on your subscription. Update your payment method in the billing portal before adding people.";
    case "cancelled":
    case "expired":
      return "Your subscription is ending, so seats can't be added. Resubscribe from the billing page to add your team.";
    case "paused":
      return "Your subscription is paused. Resume it from the billing portal before adding people.";
    default:
      return "Every seat on your plan is taken. Remove a member or cancel a pending invitation to free one up.";
  }
}

/**
 * Make the subscription cover `max(headcount, minimum)` seats.
 *
 * Growing is charged now, prorated; shrinking takes effect at the next renewal
 * (see `changeSeats` for why).
 *
 * On success the local row is updated straight away, WITHOUT touching
 * `lastEventAt`: the provider's own `subscription.plan_changed`/`updated`
 * delivery is still expected and must still apply. Writing the count here
 * closes the window in which an invitee accepting before that delivery lands
 * would be refused for the seat that was just bought for them.
 */
export async function syncSeats(
  organizationId: string,
  opts: { minimum?: number; reason: string },
): Promise<SyncSeatsOutcome> {
  const row = await getSubscriptionRow(organizationId);
  const resizable =
    dodoEnabled &&
    row?.dodoSubscriptionId &&
    row.status === "active" &&
    !row.cancelAtPeriodEnd;
  if (!row || !resizable || !row.dodoSubscriptionId) {
    return {
      ok: false,
      code: "NOT_RESIZABLE",
      message: notResizable(row?.status, row?.status === "active" && row.cancelAtPeriodEnd),
    };
  }

  const target = Math.max(1, await countSeats(organizationId), opts.minimum ?? 0);
  if (target === row.seats) return { ok: true, seats: target, changed: false };

  try {
    await changeSeats(
      row.dodoSubscriptionId,
      target,
      target > row.seats ? "grow" : "shrink",
    );
  } catch (err) {
    console.error(
      `[billing] seat change failed (${opts.reason}, org ${organizationId}, ${row.seats} → ${target}):`,
      err instanceof Error ? err.message : err,
    );
    return {
      ok: false,
      code: "PROVIDER_ERROR",
      message: `Couldn't add a seat ($${SEAT_PRICE_USD} a month) to your subscription. Please try again, or check your payment method in the billing portal.`,
    };
  }

  await db
    .update(schema.organizationSubscriptions)
    .set({ seats: target, updatedAt: new Date() })
    .where(eq(schema.organizationSubscriptions.organizationId, organizationId));

  console.log(
    `[billing] seats ${row.seats} → ${target} (${opts.reason}, org ${organizationId})`,
  );
  return { ok: true, seats: target, changed: true };
}

/**
 * Shrink after someone leaves. Best-effort by design: the member is already
 * gone, and a provider hiccup must not turn a completed removal into an error
 * the admin has to deal with. A seat left over is corrected by the next seat
 * event, which recomputes from headcount.
 */
export async function releaseSeats(
  organizationId: string,
  reason: string,
): Promise<void> {
  try {
    await syncSeats(organizationId, { reason });
  } catch (err) {
    console.error(`[billing] seat release failed (${reason}):`, err);
  }
}
