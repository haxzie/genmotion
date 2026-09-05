import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { Webhook } from "standardwebhooks";
import { env } from "../src/env";

/**
 * Replay a recorded Dodo delivery against a running API, signed with the
 * webhook key in .env — so a webhook scenario can be reproduced locally
 * without a tunnel or a real purchase.
 *
 *   pnpm --filter @genmotion/api replay-webhook \
 *     src/__tests__/fixtures/dodo/subscription.active.json --org org_xxx
 *
 * `--org` rewrites `metadata.organizationId`; `--sub` the subscription id;
 * `--product`/`--addon` default to the ids in .env so the fixture maps onto
 * this environment's catalog. Every run gets a fresh webhook-id, so the same
 * fixture can be replayed twice to watch the dedupe path.
 */

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    org: { type: "string" },
    sub: { type: "string" },
    product: { type: "string" },
    addon: { type: "string" },
    url: { type: "string", default: `http://localhost:${env.PORT}/api/webhooks/dodo` },
    /** Replay with this webhook-id instead of a fresh one (to test dedupe). */
    id: { type: "string" },
  },
});

const file = positionals[0];
if (!file) throw new Error("usage: replay-webhook <fixture.json> [--org id] [--sub id]");
if (!env.DODOPAYMENT_WEBHOOK_KEY) throw new Error("DODOPAYMENT_WEBHOOK_KEY is not set");

const event = JSON.parse(readFileSync(file, "utf8")) as {
  timestamp: string;
  data?: Record<string, unknown> & {
    metadata?: Record<string, unknown>;
    addons?: { addon_id: string; quantity: number }[] | null;
  };
};
event.timestamp = new Date().toISOString();
if (event.data) {
  if (args.org) event.data.metadata = { ...(event.data.metadata ?? {}), organizationId: args.org };
  if (args.sub) event.data.subscription_id = args.sub;
  if (args.product ?? env.DODOPAYMENT_PRO_PRODUCT_ID) {
    event.data.product_id = args.product ?? env.DODOPAYMENT_PRO_PRODUCT_ID;
  }
  const addon = args.addon ?? env.DODOPAYMENT_SEAT_ADDON_ID;
  if (addon && Array.isArray(event.data.addons)) {
    event.data.addons = event.data.addons.map((a) => ({ ...a, addon_id: addon }));
  }
}

const body = JSON.stringify(event);
const webhookId = args.id ?? `whid_${randomUUID()}`;
const now = new Date();
const signature = new Webhook(env.DODOPAYMENT_WEBHOOK_KEY).sign(webhookId, now, body);

const res = await fetch(args.url, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "webhook-id": webhookId,
    "webhook-timestamp": String(Math.floor(now.getTime() / 1000)),
    "webhook-signature": signature,
  },
  body,
});
console.log(`${res.status} ${await res.text()}  (webhook-id ${webhookId})`);
