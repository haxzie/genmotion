import { eq, db, schema } from "@genmotion/db";
import { PLANS, type PlanId } from "@genmotion/shared";
import { env } from "./env";
import type { WebhookEnvelope } from "./billing/webhook-handler";

/**
 * Slack ops feeds, over incoming webhooks — the single place the API posts to
 * Slack.
 *
 * Two channels, two webhooks: `signups` gets every new account, `events` gets
 * the money and team moves (checkout, subscription lifecycle, invites) plus
 * the product moments worth watching live — a template remix, a new project,
 * a finished export. Each is inert until its URL is set, so local and test
 * runs post nothing.
 *
 * Every message is one line. These feeds are read by scrolling a channel, so
 * a second line (or a second message for the same person) costs more attention
 * than it adds — which is why a signup says it once and says it short.
 *
 * Fire-and-forget by design: a post never blocks a request and never fails
 * one. A Slack outage must not be able to stop a signup or a webhook ack, and
 * the request is already answered by the time a post could fail — so failures
 * go to the log, not the caller.
 */

export type SlackFeed = "events" | "signups" | "requests";

const WEBHOOKS: Record<SlackFeed, string | undefined> = {
  events: env.SLACK_EVENTS_WEBHOOK_URL,
  signups: env.SLACK_SIGNUPS_WEBHOOK_URL,
  requests: env.SLACK_REQUESTS_WEBHOOK_URL,
};

export function feedConfigured(feed: SlackFeed): boolean {
  return Boolean(WEBHOOKS[feed]);
}

/**
 * The awaited cousin of `postToSlack`, for the one feed where the sender is
 * a person waiting to hear that their message went: a request from the app
 * must not vanish into a fire-and-forget. Resolves false when it did not go.
 */
export async function sendToSlack(feed: SlackFeed, text: string): Promise<boolean> {
  const url = WEBHOOKS[feed];
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) console.error(`[slack] ${feed} webhook answered ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error(`[slack] ${feed} post failed:`, err instanceof Error ? err.message : err);
    return false;
  }
}

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

/**
 * A new account. The only message the signups feed posts: onboarding used to
 * get a second one, which said the same name again a minute later for no
 * decision anybody makes.
 */
export function notifySignup(
  user: { name?: string | null; email: string },
  method: string,
): void {
  postToSlack("signups", `🎉 New signup · ${person(user)} · ${escapeSlack(method)}`);
}

/** Old enough that the message should say when, not just that. */
const LATE_EVENT_MS = 5 * 60_000;

/**
 * ` · 2026-11-09 14:03 UTC`, or nothing at all.
 *
 * The desktop app buffers its events while offline or signed out and flushes
 * later, so one of its moments can reach Slack minutes after the fact. Saying
 * when keeps a backfilled batch from reading as a sudden rush.
 */
function whenLate(at?: Date): string {
  if (!at || Date.now() - at.getTime() <= LATE_EVENT_MS) return "";
  return ` · ${at.toISOString().slice(0, 16).replace("T", " ")} UTC`;
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

/**
 * Someone turned a template into a project of their own.
 *
 * Reported by the desktop app rather than observed here: the bundle fetch
 * (`GET /api/templates/:id/files`) is public, anonymous and cached, so it
 * cannot say who — or whether a remix actually landed on disk. The app posts
 * `template_remixed` once the folder is written, which is the moment worth
 * hearing about.
 *
 * `at` is when it happened, not when it arrived — see `whenLate`.
 */
export function notifyTemplateRemixed(opts: {
  user: { name?: string | null; email: string };
  templateId: string;
  templateName?: string | null;
  at?: Date;
}): void {
  const title = escapeSlack(opts.templateName?.trim() || opts.templateId);
  const link = `<${env.WEB_URL}/templates/${encodeURIComponent(opts.templateId)}|${title}>`;
  postToSlack("events", `🎬 ${person(opts.user)} remixed ${link}${whenLate(opts.at)}`);
}

/** What a project's engine is called in the feed. */
const ENGINE_LABELS: Record<string, string> = {
  three: "Three.js",
  hyperframes: "HyperFrames",
  react: "React",
};

/**
 * Someone started a video.
 *
 * Reported by the desktop app, like a remix — a project is a folder on the
 * user's own disk, so the server never sees one otherwise.
 */
export function notifyProjectCreated(opts: {
  user: { name?: string | null; email: string };
  project?: string | null;
  engine?: string | null;
  at?: Date;
}): void {
  const engine = opts.engine ? ENGINE_LABELS[opts.engine] ?? opts.engine : null;
  const parts = [`✨ ${person(opts.user)} created ${projectLabel(opts.project)}`];
  if (engine) parts.push(escapeSlack(engine));
  postToSlack("events", parts.join(" · ") + whenLate(opts.at));
}

/**
 * A video came out the other end — the moment the whole app exists for, and
 * the one the desktop reports only when the render actually finished.
 */
export function notifyVideoExported(opts: {
  user: { name?: string | null; email: string };
  project?: string | null;
  format?: string | null;
  durationSeconds?: number | null;
  at?: Date;
}): void {
  const parts = [`🎥 ${person(opts.user)} exported ${projectLabel(opts.project, "a video")}`];
  if (opts.format) parts.push(escapeSlack(opts.format.toUpperCase()));
  if (opts.durationSeconds && opts.durationSeconds > 0) parts.push(length(opts.durationSeconds));
  postToSlack("events", parts.join(" · ") + whenLate(opts.at));
}

/**
 * How long a project's own name may be before the line stops being skimmable.
 * A name is whatever the user typed, so the cap is the message's, not theirs.
 */
const MAX_PROJECT_NAME = 60;

/**
 * `"Launch film"`, or a plain noun when the app did not say — an older build,
 * or a folder opened with no name at all.
 */
function projectLabel(name?: string | null, noun = "a new project"): string {
  const trimmed = name?.trim();
  if (!trimmed) return noun;
  return quoted(
    trimmed.length > MAX_PROJECT_NAME ? `${trimmed.slice(0, MAX_PROJECT_NAME - 1)}…` : trimmed,
  );
}

/** `8s` / `1:04` — short enough to sit in a line that is already busy. */
function length(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** What each website Remix option is called in the feed. */
const REMIX_OPTION_LABELS: Record<string, string> = {
  agent_prompt: "copied the agent prompt for",
  cli_command: "copied the CLI command for",
  desktop_app: "opened the app to remix",
  download: "went to download the app from",
};

/**
 * A Remix choice on the website's template page. Fired by the page, so it is
 * intent rather than a finished remix: the remix itself (desktop or CLI)
 * arrives separately, as `notifyTemplateRemixed` or in PostHog.
 */
export function notifyRemixIntent(opts: {
  user?: { name?: string | null; email: string } | null;
  templateId: string;
  templateName?: string | null;
  option: string;
  country?: string | null;
}): void {
  const title = escapeSlack(opts.templateName?.trim() || opts.templateId);
  const link = `<${env.WEB_URL}/templates/${encodeURIComponent(opts.templateId)}|${title}>`;
  const who = opts.user ? person(opts.user) : "A visitor" + (opts.country ? ` (${escapeSlack(opts.country)})` : "");
  postToSlack("events", `🧩 ${who} ${REMIX_OPTION_LABELS[opts.option] ?? "picked a remix option on"} ${link}`);
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
