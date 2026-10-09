import {
  isTrialActive,
  planPrice,
  SEAT_PRICE_USD,
  trialDaysLeft,
  trialEndedPaywall,
  trialEndsAt,
  type PaywallBody,
  type TrialState,
} from "@genmotion/shared";
import { eq, db, schema } from "@genmotion/db";
import { getEntitlements, type Entitlements } from "./entitlements";
import { recordExport } from "./export-usage";

/**
 * The paywall.
 *
 * Nothing the user's own machine does is metered: projects, scenes and agent
 * conversations are unlimited on every plan, because the work happens locally
 * with the user's own agent and there is no resource of ours being consumed.
 *
 * What bounds Free is time. An organization gets a free week of the whole
 * studio, and when it runs out the one thing that stops is the export — the
 * moment of value, and what the week was a trial of. Chat plugins are the
 * exception in the other direction: they spend provider credit we actually
 * pay for, so they need a paid plan rather than merely an unexpired one. See
 * `pluginPaywall()` below.
 */

/** When the org was created — the instant the trial clock started. */
async function organizationCreatedAt(organizationId: string): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: schema.organization.createdAt })
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId));
  return row?.createdAt ?? null;
}

/** The trial as it stands for an org, for the apps to show and the gate to use. */
export async function trialState(organizationId: string): Promise<TrialState> {
  const createdAt = await organizationCreatedAt(organizationId);
  // An org we cannot date is treated as out of trial rather than in one:
  // failing closed costs someone a wrongly-shown upgrade prompt, while failing
  // open gives away the product to anything that loses a row.
  if (!createdAt) return { active: false, endsAt: null, daysLeft: 0 };
  return {
    active: isTrialActive(createdAt),
    endsAt: trialEndsAt(createdAt).toISOString(),
    daysLeft: trialDaysLeft(createdAt),
  };
}

/**
 * Whether the org may do paid-tier work right now.
 *
 * Returns the 402 body when it may not, so a route can hand it straight back;
 * `null` means go ahead.
 */
export async function checkPaywall(
  organizationId: string,
  entitlements?: Entitlements,
): Promise<PaywallBody | null> {
  const ent = entitlements ?? (await getEntitlements(organizationId));
  if (ent.paid) return null;

  const trial = await trialState(organizationId);
  if (trial.active) return null;

  return trialEndedPaywall(trial.endsAt ? new Date(trial.endsAt) : null);
}

/**
 * Let an export start, or refuse it — and record the ones that start.
 *
 * The 402 body when the trial has run out and nothing is paid for, so a route
 * can hand it straight back; `null` when the export may go, with the record
 * row already written. Recorded before the render rather than after it, so a
 * render that fails or is cancelled still appears in the history: what we want
 * to know is what people tried to make.
 */
export async function claimExport(
  organizationId: string,
  userId: string,
  detail: { source: "desktop" | "cloud"; format?: string; totalFrames?: number },
): Promise<PaywallBody | null> {
  const entitlements = await getEntitlements(organizationId);
  const paywall = await checkPaywall(organizationId, entitlements);
  if (paywall) return paywall;

  await recordExport(organizationId, userId, entitlements.plan, detail);
  return null;
}

/**
 * Whether one more person can be invited without buying a seat.
 *
 * Seats are bought by inviting: the invite hook resizes the subscription (see
 * billing/seats.ts). This exists for the surfaces that want to say what the
 * next invite will cost before it is sent.
 */
export function seatPaywall(used: number, included: number): PaywallBody {
  return {
    error: "That would exceed the seats on your plan.",
    paywall: {
      reason: "seats",
      message: `Your plan covers ${included} ${included === 1 ? "seat" : "seats"}. Inviting another adds $${SEAT_PRICE_USD} a month.`,
      seats: { used, included },
    },
  };
}

/**
 * Why a chat plugin is refused.
 *
 * Gated on `paid` alone, and deliberately not on `checkPaywall`: that passes
 * an org whose free week is still running, and plugins are the one feature
 * where an unconverted trial costs us real provider credit. Everything else
 * the trial includes is work the user's own machine does, which is why this is
 * the only outright feature gate. See the note in @genmotion/shared's plans.ts.
 */
export function pluginPaywall(): PaywallBody {
  return {
    error: "Chat plugins are a Pro feature.",
    paywall: {
      reason: "plugin",
      message: `Voiceover, sound effects and image generation are included with Pro. Upgrade to use them — ${planPrice("pro")} a month.`,
    },
  };
}
