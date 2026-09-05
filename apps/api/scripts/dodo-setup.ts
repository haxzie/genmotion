import { parseArgs } from "node:util";
import { dodoClient } from "../src/dodo";
import { env } from "../src/env";

/**
 * Bring a Dodo Payments test-mode account into the shape the API expects, and
 * point its webhook at a local tunnel. Idempotent: run it again with a new
 * `--url` whenever the tunnel changes.
 *
 *   cloudflared tunnel --url http://localhost:4001     # prints https://….trycloudflare.com
 *   pnpm --filter @genmotion/api dodo:setup --url https://….trycloudflare.com
 *
 * What it does, in order:
 *   1. finds (or creates) the "GenMotion seat" add-on at the seat price;
 *   2. attaches it to the Pro product — a cart may only carry add-ons the
 *      product lists, so without this every multi-seat checkout is rejected;
 *   3. finds (or creates) the webhook endpoint described `genmotion-local`,
 *      sets its URL and the events the handler cares about;
 *   4. prints the three .env values to paste.
 *
 * It never touches products or endpoints it did not create by name, because
 * the test account is shared with other projects.
 */

const SEAT_ADDON_NAME = "GenMotion seat";
const ENDPOINT_DESCRIPTION = "genmotion-local";
const SEAT_PRICE_CENTS = 1900;

/** Everything the handler acts on, plus the two payment events it records. */
const EVENTS = [
  "subscription.active",
  "subscription.renewed",
  "subscription.on_hold",
  "subscription.paused",
  "subscription.cancelled",
  "subscription.failed",
  "subscription.expired",
  "subscription.plan_changed",
  "subscription.updated",
  "payment.succeeded",
  "payment.failed",
] as const;

const { values: args } = parseArgs({
  options: {
    url: { type: "string" },
    product: { type: "string" },
  },
});

async function main() {
  if (env.DODOPAYMENT_ENVIRONMENT !== "test_mode") {
    throw new Error("Refusing to run against live_mode; this script is for the test account.");
  }
  const client = dodoClient();

  // ── Product ────────────────────────────────────────────────────────────
  const products: { product_id: string; name: string; is_recurring: boolean }[] = [];
  for await (const p of client.products.list()) {
    products.push({ product_id: p.product_id, name: p.name ?? "", is_recurring: p.is_recurring });
  }
  const wanted = args.product ?? env.DODOPAYMENT_PRO_PRODUCT_ID;
  let product = products.find((p) => p.product_id === wanted);
  if (!product) {
    // The configured id may be stale (deleted, or a live-mode id). Fall back to
    // the product named for this app, but say so.
    product = products.find((p) => /genmotion pro/i.test(p.name) && p.is_recurring);
    if (!product) {
      throw new Error(
        `No product ${wanted ?? "(unset)"} and no recurring product named "Genmotion Pro". Products: ${products
          .map((p) => `${p.product_id} "${p.name}"`)
          .join(", ")}`,
      );
    }
    console.log(`product ${wanted ?? "(unset)"} not found; using ${product.product_id} "${product.name}"`);
  }
  const detail = await client.products.retrieve(product.product_id);
  const price = detail.price.type === "recurring_price" ? detail.price.price : null;
  console.log(`product  ${product.product_id} "${product.name}" ${price === null ? "(not recurring!)" : `$${(price / 100).toFixed(2)}/mo`}`);
  if (price !== SEAT_PRICE_CENTS) {
    console.warn(`  ⚠ price is not $${SEAT_PRICE_CENTS / 100} — every price string in the app says $${SEAT_PRICE_CENTS / 100}`);
  }

  // ── Seat add-on ────────────────────────────────────────────────────────
  let addonId: string | undefined;
  for await (const a of client.addons.list()) {
    if (a.name === SEAT_ADDON_NAME) addonId = a.id;
  }
  if (!addonId) {
    const created = await client.addons.create({
      name: SEAT_ADDON_NAME,
      price: SEAT_PRICE_CENTS,
      currency: "USD",
      tax_category: detail.tax_category,
      description: "One more person on a GenMotion Pro subscription.",
    });
    addonId = created.id;
    console.log(`addon    ${addonId} created`);
  } else {
    console.log(`addon    ${addonId} exists`);
  }

  const attached = (detail.addons ?? []).includes(addonId);
  if (!attached) {
    await client.products.update(product.product_id, {
      addons: [...(detail.addons ?? []), addonId],
    });
    console.log(`         attached to ${product.product_id}`);
  }

  // ── Webhook endpoint ───────────────────────────────────────────────────
  let webhookId: string | undefined;
  let currentUrl: string | undefined;
  for await (const w of client.webhooks.list()) {
    if (w.description === ENDPOINT_DESCRIPTION) {
      webhookId = w.id;
      currentUrl = w.url;
    }
  }
  const url = args.url ? `${args.url.replace(/\/$/, "")}/api/webhooks/dodo` : undefined;
  if (!webhookId) {
    if (!url) throw new Error("No endpoint registered yet; pass --url <public base url of the API>.");
    const created = await client.webhooks.create({
      url,
      description: ENDPOINT_DESCRIPTION,
      filter_types: [...EVENTS],
    });
    webhookId = created.id;
    console.log(`webhook  ${webhookId} created → ${url}`);
  } else {
    await client.webhooks.update(webhookId, {
      ...(url ? { url } : {}),
      filter_types: [...EVENTS],
      disabled: false,
    });
    console.log(`webhook  ${webhookId} → ${url ?? currentUrl}`);
  }
  const { secret } = await client.webhooks.retrieveSecret(webhookId);

  // ── Output ─────────────────────────────────────────────────────────────
  console.log("\nSet in .env:\n");
  console.log(`DODOPAYMENT_PRO_PRODUCT_ID=${product.product_id}`);
  console.log(`DODOPAYMENT_SEAT_ADDON_ID=${addonId}`);
  console.log(`DODOPAYMENT_WEBHOOK_KEY=${secret}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
