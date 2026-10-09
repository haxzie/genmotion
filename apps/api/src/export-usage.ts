import { db, schema } from "@genmotion/db";
import type { PlanId } from "@genmotion/shared";

/**
 * The export record.
 *
 * Not a meter: nothing is capped per month any more — the trial is a clock, and
 * once it stops the paywall in `limits.ts` refuses the export outright. What
 * `export_events` keeps is the history: who exported what, on which plan, and
 * where the render happened. It is how we learn what an export is worth, and
 * what a trial that converted actually did before it paid.
 *
 * Written wherever the render starts, before it starts: the desktop app writes
 * one through `POST /api/exports/claim` before its offscreen render, the hosted
 * queue writes one before it enqueues. Neither can be recorded from the render
 * itself, since the local one never touches us again after the claim.
 */
export async function recordExport(
  organizationId: string,
  userId: string,
  plan: PlanId,
  detail: { source: "desktop" | "cloud"; format?: string; totalFrames?: number },
): Promise<void> {
  await db.insert(schema.exportEvents).values({
    organizationId,
    userId,
    plan,
    source: detail.source,
    format: detail.format ?? null,
    totalFrames: detail.totalFrames ?? null,
  });
}
