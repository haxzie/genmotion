import { Hono } from "hono";
import { dodoClient, dodoWebhooksEnabled } from "../../dodo";
import {
  handleWebhookEvent,
  type WebhookEnvelope,
} from "../../billing/webhook-handler";

/**
 * Payment provider webhooks. Mounted OUTSIDE requireAuth — the caller is the
 * provider, not a signed-in user — and authenticated by signature instead,
 * mirroring the render control-plane's token-authed routes.
 */
export const dodoWebhookRoutes = new Hono();

dodoWebhookRoutes.post("/", async (c) => {
  if (!dodoWebhooksEnabled) {
    // Refuse rather than trust an unverifiable payload. 503 on purpose: the
    // provider retries a 5xx for hours, so once the key is set the deliveries
    // that arrived meanwhile still land. Loud, because until then every
    // purchase looks like it never happened.
    console.error(
      "[billing] webhook delivery refused: DODOPAYMENT_WEBHOOK_KEY is not set",
    );
    return c.json({ error: "Webhooks are not configured." }, 503);
  }

  // The raw body, before anything parses it: the signature covers the exact
  // bytes that were sent, so a re-serialised object would not verify. Nothing
  // upstream may read the body first — no zValidator on this route.
  const raw = await c.req.text();
  const headers = {
    "webhook-id": c.req.header("webhook-id") ?? "",
    "webhook-signature": c.req.header("webhook-signature") ?? "",
    "webhook-timestamp": c.req.header("webhook-timestamp") ?? "",
  };

  let event: WebhookEnvelope;
  try {
    event = dodoClient().webhooks.unwrap(raw, { headers }) as WebhookEnvelope;
  } catch (err) {
    console.warn(
      "[billing] rejected webhook:",
      err instanceof Error ? err.message : err,
    );
    return c.json({ error: "Invalid signature" }, 401);
  }

  const webhookId = headers["webhook-id"];
  if (!webhookId) return c.json({ error: "Missing webhook-id" }, 400);

  try {
    const outcome = await handleWebhookEvent(webhookId, event);
    // Every outcome is a 2xx: processed, replayed, superseded and unhandled are
    // all final. Only an infrastructure failure below is worth a retry.
    if (outcome.status !== "processed") {
      console.log(
        `[billing] webhook ${event.type} ${webhookId}: ${outcome.status}${
          "detail" in outcome ? ` (${outcome.detail})` : ""
        }`,
      );
    }
    return c.json({ ok: true, ...outcome });
  } catch (err) {
    console.error("[billing] webhook processing failed:", err);
    return c.json({ error: "Processing failed" }, 500);
  }
});
