import { isTrialActive, trialDaysLeft, type PaywallBody } from "@genmotion/shared";
import { eq, db, schema } from "@genmotion/db";
import { getEntitlements } from "./entitlements";

/**
 * The paywall.
 *
 * There is nothing metered any more. The desktop app runs the render on the
 * user's own machine with their own agent, so there is no resource of ours
 * being consumed — counting projects, exports or messages would be counting
 * for its own sake. What remains is time: an organization gets a free week,
 * and after that it pays per person.
 */

/** When the org was created — the instant the trial clock started. */
async function organizationCreatedAt(organizationId: string): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: schema.organization.createdAt })
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId));
  return row?.createdAt ?? null;
}

export interface TrialState {
  active: boolean;
  endsAt: Date | null;
  daysLeft: number;
}

export async function trialState(organizationId: string): Promise<TrialState> {
  const createdAt = await organizationCreatedAt(organizationId);
  // An org we cannot date is treated as out of trial rather than in one:
  // failing closed costs someone a wrongly-shown upgrade prompt, while failing
  // open gives away the product to anything that loses a row.
  if (!createdAt) return { active: false, endsAt: null, daysLeft: 0 };
  return {
    active: isTrialActive(createdAt),
    endsAt: new Date(createdAt.getTime() + 7 * 86_400_000),
    daysLeft: trialDaysLeft(createdAt),
  };
}

/**
 * Whether the org may do paid-tier work right now.
 *
 * Returns the 402 body when it may not, so a route can hand it straight back.
 * `null` means go ahead.
 */
export async function checkPaywall(
  organizationId: string,
): Promise<PaywallBody | null> {
  const entitlements = await getEntitlements(organizationId);
  if (entitlements.paid) return null;

  const trial = await trialState(organizationId);
  if (trial.active) return null;

  return {
    error: "Your free trial has ended.",
    paywall: {
      reason: "trial",
      message:
        "Your 7-day trial has ended. Upgrade to Pro to keep exporting — $19 a month.",
    },
  };
}

/**
 * Whether one more person can be invited without buying a seat.
 *
 * Seats are bought by inviting: the invite hook resizes the subscription. This
 * exists for the surfaces that want to say what the next invite will cost
 * before it is sent.
 */
export function seatPaywall(used: number, included: number): PaywallBody {
  return {
    error: "That would exceed the seats on your plan.",
    paywall: {
      reason: "seats",
      message: `Your plan covers ${included} ${included === 1 ? "seat" : "seats"}. Inviting another adds $19 a month.`,
      seats: { used, included },
    },
  };
}

/**
 * Why a chat plugin is refused.
 *
 * Deliberately not `checkPaywall`: that passes an org whose free week is still
 * running, and plugins are the one feature where an unconverted trial costs us
 * real provider credit. Everything else the trial includes is work the user's
 * own machine does. See the note in @genmotion/shared's plans.ts.
 */
export function pluginPaywall(): PaywallBody {
  return {
    error: "Chat plugins are a Pro feature.",
    paywall: {
      reason: "plugin",
      message:
        "Voiceover and image generation are included with Pro. Upgrade to use them — $19 a month.",
    },
  };
}
