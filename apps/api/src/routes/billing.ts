import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, desc, eq, gte, isNotNull, sql, db, schema } from "@genmotion/db";
import { CHAT_MODEL_ID } from "@genmotion/ai";
import { PLANS, TEAM_SEATS } from "@genmotion/shared";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { trialState } from "../limits";
import {
  countSeats,
  getEntitlements,
  getSubscriptionRow,
  type Entitlements,
} from "../entitlements";
import { dodoClient, dodoEnabled, productForPlan, seatAddons } from "../dodo";
import { env } from "../env";

export const billingRoutes = new Hono<AuthEnv>();

billingRoutes.use(requireAuth);

/**
 * List price in USD per million tokens, per model. Cache reads and writes are
 * billed at their own rates (roughly 0.1x and 1.25x of input), which is why
 * they're tracked separately — with a stable system prefix most input tokens
 * are cache reads, so folding them into the input rate would overstate the
 * bill by an order of magnitude.
 *
 * Rates are provider list prices and are NOT fetched from the provider, so
 * they drift if pricing changes. Everything derived from them is presented as
 * an estimate.
 *
 * Moonshot bills no separate cache-write rate — writing the prefix costs the
 * ordinary cache-miss input price — so cacheWrite mirrors input for the Kimi
 * models rather than carrying Anthropic's 1.25x premium.
 */
const RATES_PER_MTOK: Record<
  string,
  { input: number; output: number; cacheRead: number; cacheWrite: number }
> = {
  // Moonshot Kimi — the agent models.
  "kimi-k2.7-code": { input: 0.95, output: 4, cacheRead: 0.19, cacheWrite: 0.95 },
  "kimi-k2.7-code-highspeed": { input: 1.9, output: 8, cacheRead: 0.38, cacheWrite: 1.9 },
  "kimi-k2.6": { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0.95 },
  "kimi-k2.5": { input: 0.6, output: 3, cacheRead: 0.1, cacheWrite: 0.6 },
  // Anthropic — still used for the website-branding vision tool.
  "claude-sonnet-4-6": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

/** Fall back to the configured model's rate so an unpriced row isn't free. */
const FALLBACK_RATE =
  RATES_PER_MTOK[CHAT_MODEL_ID] ?? RATES_PER_MTOK["kimi-k2.7-code"]!;

/** The plan half of a billing response — shared by /limits and /usage. */
function planPayload(ent: Entitlements) {
  return {
    id: ent.plan,
    name: ent.planName,
    seats: ent.seats,
    canInvite: ent.canInvite,
  };
}

function subscriptionPayload(ent: Entitlements) {
  return {
    status: ent.status,
    currentPeriodEnd: ent.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: ent.cancelAtPeriodEnd,
    manageable: ent.manageable,
    paid: ent.paid,
  };
}

/**
 * GET /limits — plan, quotas, seat usage and subscription state.
 *
 * Deliberately cheap (a handful of COUNTs, no aggregation) because the client
 * polls it to warn before an action rather than after a rejection.
 */
billingRoutes.get("/limits", async (c) => {
  const organizationId = c.get("organizationId");
  const [ent, seatsUsed, trial] = await Promise.all([
    getEntitlements(organizationId),
    countSeats(organizationId),
    trialState(organizationId),
  ]);
  return c.json({
    plan: planPayload(ent),
    seats: { used: seatsUsed, max: ent.seats },
    trial: {
      active: trial.active,
      daysLeft: trial.daysLeft,
      endsAt: trial.endsAt?.toISOString() ?? null,
    },
    // Whether the app may export right now — the only gate left.
    entitled: ent.paid || trial.active,
    subscription: subscriptionPayload(ent),
  });
});

const checkoutSchema = z.object({
  plan: z.literal("pro"),
  /**
   * Seats to buy, when the caller knows it wants more than the headcount —
   * the upgrade modal opened for an invite passes the count that invite
   * needs. Never fewer than the people already in the org.
   */
  seats: z.number().int().min(1).max(TEAM_SEATS).optional(),
});

/**
 * Whether a new checkout makes sense given the subscription the org already
 * has. A second live subscription would double-bill, so the states that can
 * still be fixed at the provider are pointed at the portal instead; the states
 * Dodo cannot revive (cancelled, expired, failed) get a fresh checkout.
 */
function checkoutConflict(
  status: string,
  planName: string,
): { error: string; action: "none" | "portal" } | null {
  if (status === "active") {
    return { error: `You're already on the ${planName} plan.`, action: "none" };
  }
  if (status === "on_hold" || status === "pending" || status === "paused") {
    return {
      error:
        "Your subscription has a payment problem or is paused. Update it in the billing portal instead of starting a new one.",
      action: "portal",
    };
  }
  return null;
}

/** Only an owner or admin may commit the organization to a charge. */
async function isBillingAdmin(
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, organizationId),
        eq(schema.member.userId, userId),
      ),
    );
  return row?.role === "owner" || row?.role === "admin";
}

/**
 * POST /checkout — start a hosted checkout for a paid plan.
 *
 * The organization id travels in the session metadata; the webhook reads it
 * back to decide which org the resulting subscription belongs to.
 */
billingRoutes.post("/checkout", zValidator("json", checkoutSchema), async (c) => {
  const user = c.get("user");
  const organizationId = c.get("organizationId");
  const { plan, seats } = c.req.valid("json");

  const productId = productForPlan(plan);
  if (!dodoEnabled || !productId) {
    return c.json({ error: "Billing isn't configured." }, 503);
  }
  if (!(await isBillingAdmin(organizationId, user.id))) {
    return c.json(
      { error: "Only an owner or admin can change the plan." },
      403,
    );
  }

  const row = await getSubscriptionRow(organizationId);
  const conflict = row?.plan !== "free" && row
    ? checkoutConflict(row.status, PLANS[row.plan].name)
    : null;
  if (conflict) return c.json(conflict, 409);

  // Pro carries one seat; everyone already in the org (members and open
  // invitations) needs one too, or the org is over its seats the moment it
  // pays and cannot invite. A lapsed team resubscribing lands here.
  const totalSeats = Math.max(await countSeats(organizationId), seats ?? 1);
  const addons = seatAddons(totalSeats);

  let session: { session_id: string; checkout_url?: string | null };
  try {
    session = await dodoClient().checkoutSessions.create({
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
          ...(addons.length > 0 ? { addons } : {}),
        },
      ],
      customer: { email: user.email, name: user.name || user.email },
      return_url: `${env.WEB_URL}/settings/billing?checkout=success&plan=${plan}`,
      // Keys ≤40 chars and string values ≤500 — well inside the provider's
      // metadata limits. organizationId is the link back to us.
      metadata: {
        organizationId,
        plan,
        seats: String(totalSeats),
        userId: user.id,
        source: "genmotion-app",
      },
    });
  } catch (err) {
    console.error("[billing] checkout session failed:", err);
    return c.json({ error: "Couldn't start checkout. Please try again." }, 502);
  }

  if (!session.checkout_url) {
    console.error("[billing] checkout session had no url:", session.session_id);
    return c.json({ error: "Couldn't start checkout. Please try again." }, 502);
  }

  await db.insert(schema.billingCheckoutSessions).values({
    id: session.session_id,
    organizationId,
    userId: user.id,
    plan,
    productId,
    checkoutUrl: session.checkout_url,
  });

  return c.json({ url: session.checkout_url, sessionId: session.session_id });
});

/**
 * POST /portal — a link to the provider's billing portal, where the customer
 * updates payment details or cancels.
 */
billingRoutes.post("/portal", async (c) => {
  const user = c.get("user");
  const organizationId = c.get("organizationId");

  if (!dodoEnabled) return c.json({ error: "Billing isn't configured." }, 503);
  if (!(await isBillingAdmin(organizationId, user.id))) {
    return c.json({ error: "Only an owner or admin can manage billing." }, 403);
  }

  const row = await getSubscriptionRow(organizationId);
  if (!row?.dodoCustomerId) {
    return c.json({ error: "This organization has no billing account yet." }, 409);
  }

  try {
    const portal = await dodoClient().customers.customerPortal.create(
      row.dodoCustomerId,
    );
    return c.json({ url: portal.link });
  } catch (err) {
    console.error("[billing] portal link failed:", err);
    return c.json({ error: "Couldn't open the billing portal." }, 502);
  }
});

/** Postgres returns sum()/count() as strings — coerce, treating null as 0. */
function num(value: string | number | null): number {
  return value == null ? 0 : Number(value);
}

type UsageTotals = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  messages: number;
};

const EMPTY: UsageTotals = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  totalTokens: 0,
  messages: 0,
};

function addTotals(a: UsageTotals, b: UsageTotals): UsageTotals {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    messages: a.messages + b.messages,
  };
}

/**
 * Cost for one model's usage. `inputTokens` from the AI SDK is the FULL input
 * count — it already includes cache reads and writes — so the full-price
 * portion is what's left after subtracting them. Pricing the raw input total
 * alongside the cache columns would bill the same tokens twice.
 */
function estimateCostUsd(totals: UsageTotals, model: string | null): number {
  const rate = (model && RATES_PER_MTOK[model]) || FALLBACK_RATE;
  const uncachedInput = Math.max(
    0,
    totals.inputTokens - totals.cacheReadTokens - totals.cacheWriteTokens,
  );
  return (
    (uncachedInput * rate.input +
      totals.outputTokens * rate.output +
      totals.cacheReadTokens * rate.cacheRead +
      totals.cacheWriteTokens * rate.cacheWrite) /
    1_000_000
  );
}

/** Start of the current calendar month in UTC — the usage period we report. */
function periodStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

const TOKEN_SUMS = {
  inputTokens: sql<string | null>`sum(${schema.chatMessages.inputTokens})`,
  outputTokens: sql<string | null>`sum(${schema.chatMessages.outputTokens})`,
  cacheReadTokens: sql<string | null>`sum(${schema.chatMessages.cacheReadTokens})`,
  cacheWriteTokens: sql<string | null>`sum(${schema.chatMessages.cacheWriteTokens})`,
  totalTokens: sql<string | null>`sum(${schema.chatMessages.totalTokens})`,
  messages: sql<string>`count(*)`,
};

/**
 * GET /usage — token spend for the caller's org this calendar month.
 *
 * Only assistant messages carry usage, and only those written since usage
 * tracking shipped; older turns have null columns and are excluded rather than
 * counted as zero, so the totals describe tracked turns, not all history.
 */
billingRoutes.get("/usage", async (c) => {
  const organizationId = c.get("organizationId");
  const now = new Date();
  const start = periodStart(now);

  // chat_messages has no org column — scope through the owning project.
  const scope = and(
    eq(schema.projects.organizationId, organizationId),
    gte(schema.chatMessages.createdAt, start),
    isNotNull(schema.chatMessages.totalTokens),
  );

  const [byModelRows, byProjectRows] = await Promise.all([
    db
      .select({ model: schema.chatMessages.model, ...TOKEN_SUMS })
      .from(schema.chatMessages)
      .innerJoin(
        schema.projects,
        eq(schema.chatMessages.projectId, schema.projects.id),
      )
      .where(scope)
      .groupBy(schema.chatMessages.model),
    db
      .select({
        projectId: schema.projects.id,
        name: schema.projects.name,
        model: schema.chatMessages.model,
        ...TOKEN_SUMS,
      })
      .from(schema.chatMessages)
      .innerJoin(
        schema.projects,
        eq(schema.chatMessages.projectId, schema.projects.id),
      )
      .where(scope)
      // Grouped by model too so each project's cost uses the right rate when a
      // project spans a model switch; rows are merged per project below.
      .groupBy(schema.projects.id, schema.projects.name, schema.chatMessages.model)
      .orderBy(desc(sql`sum(${schema.chatMessages.totalTokens})`)),
  ]);

  const toTotals = (r: Record<string, string | number | null>): UsageTotals => ({
    inputTokens: num(r.inputTokens ?? null),
    outputTokens: num(r.outputTokens ?? null),
    cacheReadTokens: num(r.cacheReadTokens ?? null),
    cacheWriteTokens: num(r.cacheWriteTokens ?? null),
    totalTokens: num(r.totalTokens ?? null),
    messages: num(r.messages ?? null),
  });

  const byModel = byModelRows.map((r) => {
    const totals = toTotals(r);
    return {
      model: r.model ?? "unknown",
      ...totals,
      estimatedCostUsd: estimateCostUsd(totals, r.model),
    };
  });

  const projects = new Map<
    string,
    { projectId: string; name: string; estimatedCostUsd: number } & UsageTotals
  >();
  for (const r of byProjectRows) {
    const totals = toTotals(r);
    const existing = projects.get(r.projectId);
    const merged = existing ? addTotals(existing, totals) : totals;
    projects.set(r.projectId, {
      projectId: r.projectId,
      name: r.name,
      ...merged,
      estimatedCostUsd:
        (existing?.estimatedCostUsd ?? 0) + estimateCostUsd(totals, r.model),
    });
  }

  const totals = byModel.reduce<UsageTotals>(addTotals, EMPTY);

  // Same resolver as /limits, so the two endpoints can never disagree about
  // which plan an org is on.
  const [ent, seatsUsed, trial] = await Promise.all([
    getEntitlements(organizationId),
    countSeats(organizationId),
    trialState(organizationId),
  ]);

  return c.json({
    plan: planPayload(ent),
    // Seats are what the bill scales with now, so the usage page needs them.
    seats: { used: seatsUsed, max: ent.seats },
    // The billing page is where an org learns its trial is over, so it needs
    // the same trial block /limits carries.
    trial: {
      active: trial.active,
      daysLeft: trial.daysLeft,
      endsAt: trial.endsAt?.toISOString() ?? null,
    },
    entitled: ent.paid || trial.active,
    subscription: subscriptionPayload(ent),
    period: { start: start.toISOString(), end: now.toISOString() },
    totals: {
      ...totals,
      estimatedCostUsd: byModel.reduce((sum, m) => sum + m.estimatedCostUsd, 0),
    },
    byModel,
    byProject: [...projects.values()]
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 10),
  });
});
