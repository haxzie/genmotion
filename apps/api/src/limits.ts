import { planPrice, SEAT_PRICE_USD, type PaywallBody } from "@genmotion/shared";
import { getEntitlements } from "./entitlements";
import { claimExport, exportUsage, type ExportClaim } from "./export-usage";

/**
 * The paywall.
 *
 * Nothing the user's own machine does is metered: projects, scenes and agent
 * conversations are unlimited on every plan, because the work happens locally
 * with the user's own agent and there is no resource of ours being consumed.
 *
 * Free does not expire. What bounds it is the export meter — the moment of
 * value, and the one thing worth reserving for a paid plan — and the chat
 * plugins, which spend provider credit we actually pay for. See
 * `export-usage.ts` for the first and `pluginPaywall()` below for the second.
 */

/**
 * Take an export off the org's allowance, or refuse.
 *
 * The 402 body when the month is spent, so a route can hand it straight back;
 * the claim, carrying the meter as it now stands, when it is not. Paid plans
 * always claim successfully — the row is still written, because the count is
 * how we learn what an export is worth.
 */
export async function claimExportSlot(
  organizationId: string,
  userId: string,
  detail: { source: "desktop" | "cloud"; format?: string; totalFrames?: number },
): Promise<ExportClaim | PaywallBody> {
  const entitlements = await getEntitlements(organizationId);
  return claimExport(organizationId, userId, entitlements.plan, detail);
}

/** This month's export meter for an org, without claiming anything. */
export async function exportState(organizationId: string) {
  const entitlements = await getEntitlements(organizationId);
  return exportUsage(organizationId, entitlements.plan);
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
 * Gated on `paid` alone, and deliberately not on the export meter: a Free org
 * with exports to spare still may not spend our provider credit. Everything
 * else Free includes is work the user's own machine does, which is why this is
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
