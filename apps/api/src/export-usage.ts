import { and, count, eq, gte, db, schema } from "@genmotion/db";
import {
  exportAllowance,
  exportLimitPaywall,
  type ExportUsage,
  type PaywallBody,
  type PlanId,
} from "@genmotion/shared";
import { periodOf } from "./plugin-usage";

/**
 * The export meter.
 *
 * Free is the only plan with a ceiling, and the ceiling is per calendar month
 * on the same UTC clock the plugin meters keep — one period boundary for the
 * whole account, so the billing page never has to explain two.
 *
 * Counted from `export_events`, which is written wherever the render happens:
 * the desktop app claims a slot before it starts an offscreen render, the
 * hosted queue claims one before it enqueues. Neither can be counted from the
 * render itself, since the local one never touches us again after the claim.
 */

/** This month's exports for an org, and what its plan allows. */
export async function exportUsage(
  organizationId: string,
  plan: PlanId,
): Promise<ExportUsage> {
  const { start, end } = periodOf();
  const [row] = await db
    .select({ used: count() })
    .from(schema.exportEvents)
    .where(
      and(
        eq(schema.exportEvents.organizationId, organizationId),
        gte(schema.exportEvents.createdAt, start),
      ),
    );
  const used = row?.used ?? 0;
  const limit = exportAllowance(plan);
  return {
    period: { start: start.toISOString(), end: end.toISOString() },
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
  };
}

export interface ExportClaim {
  /** The meter as it stands *after* this claim, for the client to show. */
  usage: ExportUsage;
}

/**
 * Take one export off the month's allowance, or refuse.
 *
 * Returns the 402 body when the allowance is spent, so a route can hand it
 * straight back, and the claim when it is not.
 *
 * The count and the insert are one transaction at SERIALIZABLE, because two
 * exports started at the same moment would otherwise both read four-of-five
 * and both be allowed. A serialization failure surfaces as a thrown error
 * rather than a silent overrun; the caller retries or the export fails, and
 * either is better than giving the allowance away under concurrency.
 *
 * Claimed before the render rather than after it, so a render that fails or is
 * cancelled still spends the slot. That is the less friendly of the two
 * choices and the deliberate one: refunding on failure would make the meter
 * trivially farmable by an export that is always cancelled at 99%.
 */
export async function claimExport(
  organizationId: string,
  userId: string,
  plan: PlanId,
  detail: { source: "desktop" | "cloud"; format?: string; totalFrames?: number },
): Promise<ExportClaim | PaywallBody> {
  const { start, end } = periodOf();
  const limit = exportAllowance(plan);

  // Unlimited plans skip the transaction entirely: there is nothing to
  // serialize against when no read can refuse the write.
  if (limit === null) {
    await db.insert(schema.exportEvents).values({
      organizationId,
      userId,
      plan,
      source: detail.source,
      format: detail.format ?? null,
      totalFrames: detail.totalFrames ?? null,
    });
    return { usage: await exportUsage(organizationId, plan) };
  }

  const used = await db.transaction(
    async (tx) => {
      const [row] = await tx
        .select({ used: count() })
        .from(schema.exportEvents)
        .where(
          and(
            eq(schema.exportEvents.organizationId, organizationId),
            gte(schema.exportEvents.createdAt, start),
          ),
        );
      const before = row?.used ?? 0;
      if (before >= limit) return null;
      await tx.insert(schema.exportEvents).values({
        organizationId,
        userId,
        plan,
        source: detail.source,
        format: detail.format ?? null,
        totalFrames: detail.totalFrames ?? null,
      });
      return before + 1;
    },
    { isolationLevel: "serializable" },
  );

  if (used === null) {
    return exportLimitPaywall({ used: limit, limit, resetsAt: end.toISOString() });
  }

  return {
    usage: {
      period: { start: start.toISOString(), end: end.toISOString() },
      used,
      limit,
      remaining: Math.max(0, limit - used),
    },
  };
}
