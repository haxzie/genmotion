import { Hono } from "hono";
import { resolveXPost, type XResolveFailureReason } from "@genmotion/shared";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";

/**
 * What a pasted X link resolves to: the post, and the video files X serves for
 * it. The desktop agent's `download_x_video` tool is the caller — someone says
 * "make a video around this post" and the clip has to get into `assets/`.
 *
 * Session-authed like the rest of the product. It would work unauthenticated —
 * everything it answers is already public to anyone who opens the post — but
 * `/api/templates` and `/api/releases` are the only anonymous routes we have,
 * and both are that way because the app reads them before it has a session.
 * This one is called by an agent that is already signed in, so there is nothing
 * to buy by widening the posture.
 *
 * It answers metadata only. The `video.twimg.com` URLs go back to the app and
 * the app fetches them from X directly, so no video passes through here. The
 * resolver itself is in `@genmotion/shared`, because the CLI offers the same
 * thing without a server in front of it; see the note at the top of it.
 */
export const xVideoRoutes = new Hono<AuthEnv>();

xVideoRoutes.use(requireAuth);

/**
 * Per hour, per organization.
 *
 * Generous for the thing it is for — an agent resolving the handful of posts a
 * video is built from — and far below what walking a timeline would need. A
 * resolve is one CDN read, so this is guarding against being made into
 * somebody's crawler rather than against cost. In memory, and so per instance:
 * a replica count is not a loophole worth a table, because the limit is a
 * courtesy to X rather than a quota we bill on.
 */
const ALLOWANCE = { limit: 120, windowMs: 60 * 60 * 1000 };

const spent = new Map<string, { count: number; resetAt: number }>();

function withinAllowance(key: string): boolean {
  const now = Date.now();
  const window = spent.get(key);
  if (!window || window.resetAt <= now) {
    // Sweep on write. The map only ever holds orgs that resolved a post in the
    // last hour, so there is nothing to schedule.
    for (const [k, v] of spent) if (v.resetAt <= now) spent.delete(k);
    spent.set(key, { count: 1, resetAt: now + ALLOWANCE.windowMs });
    return true;
  }
  if (window.count >= ALLOWANCE.limit) return false;
  window.count += 1;
  return true;
}

/** The longest input worth parsing. A URL this long is not one. */
const MAX_INPUT = 500;

/** What each failure says to the caller, and the status it says it with. */
const FAILURES: Record<XResolveFailureReason, { status: 400 | 404 | 502; error: string }> = {
  "bad-url": { status: 400, error: "That isn't a link to a post on X." },
  "not-found": {
    status: 404,
    // One message for deleted, protected, suspended and age-restricted, because
    // the upstream does not distinguish them and guessing which it was would be
    // inventing detail. It also avoids confirming that a protected account's
    // post exists, which a more specific message would.
    error: "That post can't be seen. It may be deleted, private or restricted.",
  },
  "no-video": { status: 404, error: "That post doesn't have a video in it." },
  upstream: { status: 502, error: "Couldn't reach X just now. Try again in a moment." },
};

xVideoRoutes.get("/", async (c) => {
  const input = c.req.query("url");
  if (!input || input.length > MAX_INPUT) {
    return c.json({ error: FAILURES["bad-url"].error }, 400);
  }

  if (!withinAllowance(c.get("organizationId"))) {
    return c.json({ error: "Too many X links in the last hour. Try again later." }, 429);
  }

  const result = await resolveXPost(input);
  if (!result.ok) {
    const failure = FAILURES[result.reason];
    return c.json({ error: failure.error }, failure.status);
  }

  return c.json(result.post);
});
