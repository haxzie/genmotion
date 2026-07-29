import { and, count, eq, gte, inArray, not, db, schema } from "@genmotion/db";
import {
  FREE_LIMITS,
  LIMITS_LIVE_AT,
  type LimitKind,
  type LimitSnapshot,
  type LimitExceededBody,
} from "@genmotion/shared";
import { getEntitlements, type Entitlements } from "./entitlements";

/**
 * Start of the current calendar month in UTC. Projects are a standing total,
 * but exports and AI turns are flows that refill monthly — the Free plan is
 * positioned as perpetual ("no time limit"), so a recurring allowance fits it
 * better than a one-off trial budget.
 */
export function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Quotas only count activity from LIMITS_LIVE_AT onward. Orgs that predate
 * enforcement keep what they already had instead of waking up over quota; once
 * the cutoff is in the past, the month start always wins and this is inert.
 */
function countsFrom(from: Date): Date {
  return from.getTime() > LIMITS_LIVE_AT.getTime() ? from : LIMITS_LIVE_AT;
}

/**
 * The instant from which per-month quotas (exports, AI turns) start counting.
 * Exported so tests can place rows either side of the boundary without
 * hard-coding a date that would rot as the cutoff recedes into the past.
 */
export function usageCountsFrom(now = new Date()): Date {
  return countsFrom(monthStart(now));
}

async function countProjects(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.organizationId, organizationId),
        // Projects are a standing total, so the cutoff is absolute: one created
        // before enforcement never occupies a slot.
        gte(schema.projects.createdAt, LIMITS_LIVE_AT),
      ),
    );
  return row?.n ?? 0;
}

async function countExports(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(schema.exportJobs)
    .innerJoin(schema.projects, eq(schema.exportJobs.projectId, schema.projects.id))
    .where(
      and(
        eq(schema.projects.organizationId, organizationId),
        gte(schema.exportJobs.createdAt, countsFrom(monthStart())),
        // A render that failed or was cancelled gave the user nothing, so it
        // must not burn quota — 2 of the first 22 exports on this deployment
        // failed, and charging for those would be indefensible.
        not(inArray(schema.exportJobs.status, ["failed", "cancelled"])),
      ),
    );
  return row?.n ?? 0;
}

async function countAiTurns(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(schema.chatMessages)
    .innerJoin(schema.projects, eq(schema.chatMessages.projectId, schema.projects.id))
    .where(
      and(
        eq(schema.projects.organizationId, organizationId),
        gte(schema.chatMessages.createdAt, countsFrom(monthStart())),
        // One turn = one message the user sent. Counting assistant messages
        // instead would charge for retries and tool chatter the user didn't ask
        // for; counting compactions would charge for our own housekeeping.
        eq(schema.chatMessages.role, "user"),
      ),
    );
  return row?.n ?? 0;
}

const COUNTERS: Record<LimitKind, (organizationId: string) => Promise<number>> = {
  projects: countProjects,
  exports: countExports,
  aiTurns: countAiTurns,
};

/**
 * Current usage for every quota — powers the billing page and the client hints.
 *
 * Usage is still counted on paid plans (people want to see "142 exports this
 * month"); only the cap differs. Accepts pre-resolved entitlements so callers
 * that already have them don't re-query.
 */
export async function limitSnapshot(
  organizationId: string,
  entitlements?: Entitlements,
): Promise<LimitSnapshot> {
  const ent = entitlements ?? (await getEntitlements(organizationId));
  const [projects, exports, aiTurns] = await Promise.all([
    countProjects(organizationId),
    countExports(organizationId),
    countAiTurns(organizationId),
  ]);
  const used = { projects, exports, aiTurns };
  return Object.fromEntries(
    (Object.keys(FREE_LIMITS) as LimitKind[]).map((kind) => {
      const max = ent.limits[kind];
      return [
        kind,
        max === null
          ? { used: used[kind], max: null, remaining: null, unlimited: true }
          : {
              used: used[kind],
              max,
              remaining: Math.max(0, max - used[kind]),
              unlimited: false,
            },
      ];
    }),
  ) as LimitSnapshot;
}

/**
 * Returns a 402 body when the org has no room left for one more action of this
 * kind, or null when it may proceed. Counts only the one quota being checked so
 * a chat turn doesn't pay for three COUNT queries.
 *
 * The paid short-circuit happens before the COUNT: an org on an unlimited plan
 * never pays for a query whose answer can't block it.
 */
export async function checkLimit(
  organizationId: string,
  kind: LimitKind,
): Promise<LimitExceededBody | null> {
  const ent = await getEntitlements(organizationId);
  const max = ent.limits[kind];
  if (max === null) return null;

  const used = await COUNTERS[kind](organizationId);
  if (used < max) return null;
  return {
    error: MESSAGES[kind],
    limit: { kind, used, max },
  };
}

const MESSAGES: Record<LimitKind, string> = {
  projects: `You've reached the Free plan limit of ${FREE_LIMITS.projects} projects.`,
  exports: `You've used all ${FREE_LIMITS.exports} exports included this month.`,
  aiTurns: `You've used all ${FREE_LIMITS.aiTurns} AI messages included this month.`,
};
