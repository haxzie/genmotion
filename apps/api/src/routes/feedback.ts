import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { getEntitlements } from "../entitlements";
import { escapeSlack, feedConfigured, sendToSlack } from "../slack";

/**
 * Help, feedback, and "contact us": one form in both apps, one Slack channel.
 *
 * The message goes with who sent it and where they stand — plan, seats, the
 * screen they wrote from — so the reply can be about them rather than start
 * with "which account is this?". Awaited, unlike the product feeds: the
 * person is looking at a Send button and deserves to know it went.
 */
export const feedbackRoutes = new Hono<AuthEnv>();

feedbackRoutes.use(requireAuth);

const schema = z.object({
  message: z.string().trim().min(3).max(4000),
  /**
   * What the form was opened for: `help` from the sidebar, `seats` from a
   * "contact us for more seats" link, and so on. Free text, so a new surface
   * is not a schema change.
   */
  topic: z.string().trim().max(40).optional(),
  /** Which app, and its version — the desktop says so; the web says "web". */
  source: z.string().trim().max(80).optional(),
});

const TOPIC_LABEL: Record<string, string> = {
  help: "Help & feedback",
  seats: "More seats",
  billing: "Billing",
};

feedbackRoutes.post("/", zValidator("json", schema), async (c) => {
  if (!feedConfigured("requests")) {
    return c.json({ error: "Messages aren't set up on this server yet. Email us instead: hello@genmotion.dev" }, 503);
  }
  const user = c.get("user");
  const organizationId = c.get("organizationId");
  const { message, topic = "help", source = "unknown" } = c.req.valid("json");
  const ent = await getEntitlements(organizationId);

  const lines = [
    `📮 *${escapeSlack(TOPIC_LABEL[topic] ?? topic)}* from *${escapeSlack(user.name || user.email)}* (${escapeSlack(user.email)})`,
    `${escapeSlack(ent.planName)} · ${ent.seats} ${ent.seats === 1 ? "seat" : "seats"} · org \`${organizationId}\` · ${escapeSlack(source)}`,
    "",
    // Quoted, so a multi-line message reads as one block in the channel.
    ...escapeSlack(message).split("\n").map((l) => `> ${l}`),
  ];
  const sent = await sendToSlack("requests", lines.join("\n"));
  if (!sent) return c.json({ error: "Couldn't send your message just now. Please try again in a moment." }, 502);
  return c.json({ ok: true });
});
