import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, desc, eq, gte, isNotNull, sql, db, schema } from "@genmotion/db";
import { CHAT_MODEL_ID } from "@genmotion/ai";
import { PLANS } from "@genmotion/shared";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { trialState } from "../limits";
import { pluginUsage, pluginUsageByMember } from "../plugin-usage";
import {
  countSeats,
  getEntitlements,
  teamPolicy,
  getSubscriptionRow,
  type Entitlements,
} from "../entitlements";
import { changePlan, dodoClient, dodoEnabled, productForPlan } from "../dodo";
import { env } from "../env";
import { notifyCheckoutStarted } from "../slack";

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
  // The three plugin meters, from the same rows that gate a call. One
  // GROUP BY — cheap enough for a poll.
  const [usage, team, role] = await Promise.all([
    pluginUsage(organizationId, ent.plan),
    teamPolicy(organizationId),
    memberRole(organizationId, c.get("user").id),
  ]);
  return c.json({
    plan: planPayload(ent),
    seats: { used: seatsUsed, max: ent.seats },
    // Who is asking: billing and invitations are for an owner or admin, and
    // the pages say so rather than fail on the click.
    role,
    usage,
    // The team policy, decided here: whether an invite may go, what to say,
    // and which plan to pitch. The apps render it and branch on nothing.
    team,
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

/**
 * GET /plugin-usage — this month's meters for the org, and who spent them.
 * For the web dashboard; the desktop's Settings reads the totals off /limits.
 */
billingRoutes.get("/plugin-usage", async (c) => {
  const organizationId = c.get("organizationId");
  const ent = await getEntitlements(organizationId);
  const [totals, members] = await Promise.all([
    pluginUsage(organizationId, ent.plan),
    pluginUsageByMember(organizationId),
  ]);
  return c.json({ ...totals, members });
});

/**
 * POST /cancel — stop the subscription at the end of the paid period; POST
 * /resume — take that back before it lands. Both through Dodo, which then
 * tells us by webhook; the row here is updated eagerly so the page that
 * asked sees the answer without waiting for it.
 */
async function setCancelling(c: Context<AuthEnv>, cancel: boolean): Promise<Response> {
  const user = c.get("user");
  const organizationId = c.get("organizationId");
  if (!dodoEnabled) return c.json({ error: "Billing isn't configured." }, 503);
  if (!(await isBillingAdmin(organizationId, user.id))) {
    return c.json({ error: "Only an owner or admin can manage billing." }, 403);
  }
  const row = await getSubscriptionRow(organizationId);
  if (row?.status !== "active") {
    return c.json({ error: "There is no active subscription to change." }, 409);
  }
  if (!row.dodoSubscriptionId) {
    return c.json({ error: "This subscription isn't managed by the billing provider, so it can't be changed here." }, 409);
  }
  if (row.cancelAtPeriodEnd === cancel) return c.json({ ok: true, cancelAtPeriodEnd: cancel });
  try {
    await dodoClient().subscriptions.update(row.dodoSubscriptionId, {
      cancel_at_next_billing_date: cancel,
      ...(cancel ? { cancel_reason: "cancelled_by_customer" } : {}),
    });
  } catch (err) {
    console.error("[billing] cancel/resume failed:", err);
    return c.json({ error: cancel ? "Couldn't schedule the cancellation." : "Couldn't resume the subscription." }, 502);
  }
  await db
    .update(schema.organizationSubscriptions)
    .set({ cancelAtPeriodEnd: cancel, updatedAt: new Date() })
    .where(eq(schema.organizationSubscriptions.organizationId, organizationId));
  return c.json({ ok: true, cancelAtPeriodEnd: cancel });
}

billingRoutes.post("/cancel", (c) => setCancelling(c, true));
billingRoutes.post("/resume", (c) => setCancelling(c, false));

const checkoutSchema = z.object({
  plan: z.enum(["pro", "max"]),
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
/** The caller's role in the org — `member` when the row is missing. */
async function memberRole(organizationId: string, userId: string): Promise<string> {
  const [row] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, organizationId),
        eq(schema.member.userId, userId),
      ),
    );
  return row?.role ?? "member";
}

async function isBillingAdmin(
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const role = await memberRole(organizationId, userId);
  return role === "owner" || role === "admin";
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
  const { plan } = c.req.valid("json");

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
  // A live subscription changes plan in place rather than buying a second
  // one; a stuck or lapsed one goes through checkoutConflict as before.
  if (row && row.plan !== "free" && row.status === "active" && row.dodoSubscriptionId && row.plan !== plan) {
    const target = PLANS[plan];
    const headcountNow = await countSeats(organizationId);
    if (headcountNow > target.includedSeats) {
      return c.json(
        { error: `${target.name} covers ${target.includedSeats} ${target.includedSeats === 1 ? "seat" : "seats"} and your organization has ${headcountNow} people. Remove people first.` },
        409,
      );
    }
    const direction = target.priceUsd > PLANS[row.plan].priceUsd ? "up" : "down";
    try {
      await changePlan(row.dodoSubscriptionId, plan, direction);
    } catch (err) {
      console.error("[billing] plan change failed:", err);
      return c.json({ error: "Couldn't change the plan. Please try again." }, 502);
    }
    // Up takes effect now; down at renewal, when the webhook lands.
    if (direction === "up") {
      await db
        .update(schema.organizationSubscriptions)
        .set({ plan, seats: target.includedSeats, dodoProductId: productId, updatedAt: new Date() })
        .where(eq(schema.organizationSubscriptions.organizationId, organizationId));
    }
    return c.json({ changed: true, plan, effective: direction === "up" ? "now" : "renewal" });
  }

  // A plan with no subscription behind it at the provider — granted by
  // hand, or a link that was lost — has nothing to change in place and
  // nothing a second checkout would double-bill. Only the same plan again
  // is refused; a different one goes through as a fresh purchase, and the
  // webhook then writes the provider's ids onto the row.
  const conflict =
    row && row.plan !== "free" && (row.dodoSubscriptionId || row.plan === plan)
      ? checkoutConflict(row.status, PLANS[row.plan].name)
      : null;
  if (conflict) return c.json(conflict, 409);

  // A plan is the whole of its seats: a team bigger than the plan it is
  // buying would be over its seats the moment it paid. Max is the answer
  // for a Pro-sized team that grew; past Max is a conversation.
  const headcount = await countSeats(organizationId);
  if (headcount > PLANS[plan].includedSeats) {
    return c.json(
      {
        error: `${PLANS[plan].name} covers ${PLANS[plan].includedSeats} ${PLANS[plan].includedSeats === 1 ? "seat" : "seats"} and your organization has ${headcount} people (members and pending invitations). ${plan === "pro" ? `Choose ${PLANS.max.name}, or remove people first.` : "Contact us for more seats."}`,
      },
      409,
    );
  }

  let session: { session_id: string; checkout_url?: string | null };
  try {
    session = await dodoClient().checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email, name: user.name || user.email },
      return_url: `${env.WEB_URL}/settings/billing?checkout=success&plan=${plan}`,
      // Keys ≤40 chars and string values ≤500 — well inside the provider's
      // metadata limits. organizationId is the link back to us.
      metadata: {
        organizationId,
        plan,
        seats: String(PLANS[plan].includedSeats),
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

  // The session exists and is recorded; nothing about the feed may undo that.
  await notifyCheckoutStarted({ user, organizationId, plan, seats: PLANS[plan].includedSeats }).catch(
    (err) => console.error("[billing] slack notification failed:", err),
  );

  return c.json({ url: session.checkout_url, sessionId: session.session_id });
});

/**
 * GET /payments — the org's payment history at the provider, newest first,
 * and GET /payments/:id/invoice — the PDF for one of them. Both through us,
 * so the customer id never reaches the browser and the invoice is only
 * ever a payment of *this* org's customer. Owner or admin, like the portal.
 */
billingRoutes.get("/payments", async (c) => {
  const user = c.get("user");
  const organizationId = c.get("organizationId");
  if (!dodoEnabled) return c.json({ payments: [] });
  if (!(await isBillingAdmin(organizationId, user.id))) {
    return c.json({ error: "Only an owner or admin can see payments." }, 403);
  }
  const row = await getSubscriptionRow(organizationId);
  if (!row?.dodoCustomerId) return c.json({ payments: [] });

  try {
    const page = await dodoClient().payments.list({ customer_id: row.dodoCustomerId, page_size: 24 });
    const payments = page.getPaginatedItems().map((p) => ({
      id: p.payment_id,
      createdAt: p.created_at,
      // Minor units at the provider; whole currency here.
      amount: p.total_amount / 100,
      currency: p.currency,
      status: p.status ?? "unknown",
      subscriptionId: p.subscription_id ?? null,
    }));
    return c.json({ payments });
  } catch (err) {
    console.error("[billing] payments list failed:", err);
    return c.json({ error: "Couldn't load payments." }, 502);
  }
});

billingRoutes.get("/payments/:id/invoice", async (c) => {
  const user = c.get("user");
  const organizationId = c.get("organizationId");
  const paymentId = c.req.param("id");
  if (!dodoEnabled) return c.json({ error: "Billing isn't configured." }, 503);
  if (!(await isBillingAdmin(organizationId, user.id))) {
    return c.json({ error: "Only an owner or admin can download invoices." }, 403);
  }
  const row = await getSubscriptionRow(organizationId);
  if (!row?.dodoCustomerId) return c.json({ error: "No billing account." }, 404);

  try {
    // The payment has to be this customer's: the provider's invoice route
    // takes any id, so the check is ours.
    const payment = await dodoClient().payments.retrieve(paymentId);
    if (payment.customer?.customer_id !== row.dodoCustomerId) {
      return c.json({ error: "Not your payment." }, 404);
    }
    const pdf = await dodoClient().invoices.payments.retrieve(paymentId);
    const bytes = new Uint8Array(await pdf.arrayBuffer());
    return new Response(bytes, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="genmotion-invoice-${paymentId}.pdf"`,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[billing] invoice failed:", err);
    return c.json({ error: "Couldn't fetch the invoice." }, 502);
  }
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
  const [ent, seatsUsed, trial, team, role] = await Promise.all([
    getEntitlements(organizationId),
    countSeats(organizationId),
    trialState(organizationId),
    teamPolicy(organizationId),
    memberRole(organizationId, c.get("user").id),
  ]);

  return c.json({
    plan: planPayload(ent),
    seats: { used: seatsUsed, max: ent.seats },
    team,
    role,
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
