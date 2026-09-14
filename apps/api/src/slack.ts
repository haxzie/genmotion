import { eq, db, schema } from "@genmotion/db";
import { PLANS, type PlanId } from "@genmotion/shared";
import { env } from "./env";
import type { WebhookEnvelope } from "./billing/webhook-handler";

/**
 * Slack ops feeds, over incoming webhooks — the single place the API posts to
 * Slack.
 *
 * Two channels, two webhooks: `signups` gets every new account, `events` gets
 * the money and team moves (checkout, subscription lifecycle, invites). Each
 * is inert until its URL is set, so local and test runs post nothing.
 *
 * Fire-and-forget by design: a post never blocks a request and never fails
 * one. A Slack outage must not be able to stop a signup or a webhook ack, and
 * the request is already answered by the time a post could fail — so failures
 * go to the log, not the caller.
 */

export type SlackFeed = "events" | "signups";

const WEBHOOKS: Record<SlackFeed, string | undefined> = {
  events: env.SLACK_EVENTS_WEBHOOK_URL,
  signups: env.SLACK_SIGNUPS_WEBHOOK_URL,
};

export const slackEnabled = Boolean(
  env.SLACK_EVENTS_WEBHOOK_URL || env.SLACK_SIGNUPS_WEBHOOK_URL,
);

/**
 * Post one mrkdwn line to a feed. Not awaited by callers on purpose — see the
 * module comment — which is also why it cannot throw.
 */
export function postToSlack(feed: SlackFeed, text: string): void {
  const url = WEBHOOKS[feed];
  if (!url) return;
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(5_000),
  })
    .then(async (res) => {
      if (!res.ok) {
        console.error(
          `[slack] ${feed} webhook answered ${res.status}: ${(await res.text()).slice(0, 200)}`,
        );
      }
    })
    .catch((err) => {
      console.error(`[slack] ${feed} post failed:`, err instanceof Error ? err.message : err);
    });
}

/**
 * Slack reads `<…>` as links/mentions and `&` as an entity, so anything a user
 * typed — a name, an org — is escaped before it is interpolated into a message.
 */
export function escapeSlack(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** `*Name* (email)` — how a person is named in every message. */
export function person(u: { name?: string | null; email: string }): string {
  const name = u.name?.trim();
  const email = escapeSlack(u.email);
  return name ? `*${escapeSlack(name)}* (${email})` : `*${email}*`;
}

function quoted(name: string): string {
  return `"${escapeSlack(name)}"`;
}

async function orgLabel(organizationId: string): Promise<string> {
  const [org] = await db
    .select({ name: schema.organization.name })
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId));
  return org ? quoted(org.name) : `org ${organizationId}`;
}

function seatsLabel(seats: number): string {
  return `${seats} seat${seats === 1 ? "" : "s"}`;
}

// ── Signups ─────────────────────────────────────────────────────────

/**
 * How the account was created, read off the auth route that created it:
 * OAuth lands on `/callback/:id` with the provider as the param, magic link
 * on its own verify route.
 */
export function signupMethod(ctx: { path?: string; params?: Record<string, string> } | null): string {
  if (!ctx?.path) return "unknown";
  if (ctx.path.includes("/callback/")) {
    const provider = ctx.params?.id;
    if (provider === "google") return "Google";
    if (provider === "github") return "GitHub";
    return provider ?? "OAuth";
  }
  if (ctx.path.includes("magic-link")) return "magic link";
  return ctx.path;
}

export function notifySignup(
  user: { name?: string | null; email: string },
  method: string,
): void {
  postToSlack("signups", `🎉 New signup: ${person(user)} via ${escapeSlack(method)}`);
}

/** The onboarding form is where a name and role first appear. */
export function notifyOnboarded(user: {
  name?: string | null;
  email: string;
  jobRole?: string | null;
}): void {
  const role = user.jobRole?.trim();
  postToSlack(
    "signups",
    `📝 ${person(user)} finished onboarding${role ? ` · role: ${escapeSlack(role)}` : ""}`,
  );
}

// ── Billing & team ──────────────────────────────────────────────────

export async function notifyCheckoutStarted(opts: {
  user: { name?: string | null; email: string };
  organizationId: string;
  plan: PlanId;
  seats: number;
}): Promise<void> {
  const org = await orgLabel(opts.organizationId);
  postToSlack(
    "events",
    `🛒 ${person(opts.user)} started checkout for ${PLANS[opts.plan].name} (${seatsLabel(opts.seats)}) · ${org}`,
  );
}

/**
 * One line per subscription lifecycle event the webhook applied.
 * `subscription.updated` is deliberately absent: it is a snapshot the provider
 * sends alongside most of the others, so posting it would say everything twice.
 */
const SUBSCRIPTION_LINES: Record<string, string> = {
  "subscription.active": "✅ Subscription started",
  "subscription.renewed": "🔁 Subscription renewed",
  "subscription.plan_changed": "🔀 Subscription changed",
  "subscription.cancelled": "❌ Subscription cancelled",
  "subscription.on_hold": "⚠️ Subscription on hold (payment problem)",
  "subscription.paused": "⏸️ Subscription paused",
  "subscription.failed": "💥 Subscription payment failed",
  "subscription.expired": "🪦 Subscription expired",
};

export async function notifySubscriptionEvent(
  event: WebhookEnvelope,
  organizationId: string,
): Promise<void> {
  const line = SUBSCRIPTION_LINES[event.type];
  if (!line) return;

  const [org, row] = await Promise.all([
    orgLabel(organizationId),
    db
      .select({
        plan: schema.organizationSubscriptions.plan,
        seats: schema.organizationSubscriptions.seats,
        currentPeriodEnd: schema.organizationSubscriptions.currentPeriodEnd,
      })
      .from(schema.organizationSubscriptions)
      .where(eq(schema.organizationSubscriptions.organizationId, organizationId))
      .then(([r]) => r),
  ]);

  const parts = [`${line} · ${org}`];
  // The row is what the webhook just wrote, so it already reflects this event.
  if (row && row.plan !== "free") {
    parts.push(`${PLANS[row.plan].name}, ${seatsLabel(row.seats)}`);
  }
  const email = event.data?.customer?.email;
  if (email) parts.push(escapeSlack(email));
  if (event.type === "subscription.cancelled" && row?.currentPeriodEnd) {
    parts.push(`ends ${row.currentPeriodEnd.toISOString().slice(0, 10)}`);
  }
  postToSlack("events", parts.join(" · "));
}

export function notifyInviteSent(opts: {
  inviter: { name?: string | null; email: string };
  email: string;
  role: string;
  organization: { name: string };
}): void {
  postToSlack(
    "events",
    `✉️ ${person(opts.inviter)} invited ${escapeSlack(opts.email)} to ${quoted(opts.organization.name)} as ${escapeSlack(opts.role)}`,
  );
}

export function notifyInviteAccepted(opts: {
  user: { name?: string | null; email: string };
  organization: { name: string };
}): void {
  postToSlack(
    "events",
    `🤝 ${person(opts.user)} joined ${quoted(opts.organization.name)}`,
  );
}

export function notifyMemberRemoved(opts: {
  user: { name?: string | null; email: string };
  organization: { name: string };
}): void {
  postToSlack(
    "events",
    `👋 ${person(opts.user)} was removed from ${quoted(opts.organization.name)}`,
  );
}
