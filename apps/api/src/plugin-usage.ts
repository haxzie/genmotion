import { and, eq, gte, sql, db, schema } from "@genmotion/db";
import {
  pluginAllowance,
  type PluginMeter,
  type PluginUsage,
  type QuotaBody,
} from "@genmotion/shared";

/**
 * How much of its monthly allowance an org has used, per meter.
 *
 * Read from plugin_calls — the same rows the cost is logged on — so the
 * number the user sees and the number that gates the next call are one
 * number. Characters count only successful voiceovers (a refused call spent
 * nothing); sound effects and images count calls, since that is how they
 * are priced.
 */

/** The calendar month, UTC. The same clock /usage keeps. */
export function periodOf(now = new Date()): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export async function pluginUsage(organizationId: string, seats: number): Promise<PluginUsage> {
  const { start, end } = periodOf();
  const rows = await db
    .select({
      plugin: schema.pluginCalls.plugin,
      calls: sql<number>`count(*)::int`,
      units: sql<number>`coalesce(sum(${schema.pluginCalls.units}), 0)::int`,
    })
    .from(schema.pluginCalls)
    .where(
      and(
        eq(schema.pluginCalls.organizationId, organizationId),
        eq(schema.pluginCalls.ok, true),
        gte(schema.pluginCalls.createdAt, start),
      ),
    )
    .groupBy(schema.pluginCalls.plugin);
  const by = new Map(rows.map((r) => [r.plugin, r]));
  const limit = pluginAllowance(seats);
  return {
    period: { start: start.toISOString(), end: end.toISOString() },
    characters: { used: by.get("voiceover")?.units ?? 0, limit: limit.characters },
    sfx: { used: by.get("sfx")?.calls ?? 0, limit: limit.sfx },
    images: { used: by.get("image")?.calls ?? 0, limit: limit.images },
  };
}

const METER_LABEL: Record<PluginMeter, string> = {
  characters: "voiceover characters",
  sfx: "sound effects",
  images: "images",
};

/**
 * Whether one more call of `cost` units on `meter` fits. The 429 body when
 * it does not, `null` when it does. Checked before a provider byte is spent.
 */
export async function checkQuota(
  organizationId: string,
  seats: number,
  meter: PluginMeter,
  cost: number,
): Promise<QuotaBody | null> {
  const usage = await pluginUsage(organizationId, seats);
  const { used, limit } = usage[meter];
  if (used + cost <= limit) return null;
  const resetsAt = usage.period.end;
  const when = new Date(resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  return {
    error: `This month's ${METER_LABEL[meter]} are used up (${used.toLocaleString("en-US")} of ${limit.toLocaleString("en-US")}). The allowance resets on ${when}.`,
    quota: { meter, used, limit, resetsAt },
  };
}
