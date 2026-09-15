import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { db, schema } from "@genmotion/db";
import { PAYWALL_STATUS, QUOTA_STATUS, type PluginMeter, type ChatPluginId, type IntegrationId } from "@genmotion/shared";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { getEntitlements } from "../entitlements";
import { pluginPaywall } from "../limits";
import { generateImage, PluginProviderError, type GeneratedMedia, type Usage } from "../plugins/gemini-image";
import { generateVoiceover, listVoices, voicePreview } from "../plugins/elevenlabs-voice";
import { generateSfx, SFX_MAX_SECONDS, SFX_MAX_TEXT, SFX_MIN_SECONDS } from "../plugins/elevenlabs-sfx";
import { checkQuota } from "../plugin-usage";

/**
 * Chat plugins — the media the agent cannot make on its own.
 *
 * The desktop app runs on the user's own machine with their own coding agent,
 * so nothing else in the product costs us anything per use. These two do: we
 * hold the ElevenLabs and Gemini keys, and the caller's session is the only
 * authorisation. That is why the gate is `paid` rather than `checkPaywall` — an
 * org inside its free week is refused, because provider credit spent on an
 * account that never converts is money we do not get back.
 *
 * The response is the media itself, not JSON and not a URL. On desktop a
 * project is a folder on the user's disk, so the caller writes the bytes into
 * its `assets/` directory; putting them in our object storage first would mean
 * uploading a file so the user could immediately download it again.
 */
export const pluginRoutes = new Hono<AuthEnv>();

pluginRoutes.use(requireAuth);

const voiceoverSchema = z.object({
  text: z.string().min(3).max(5000),
  /** An ElevenLabs voice id. Omitted means the server default. */
  voice: z.string().min(1).max(64).optional(),
});

const sfxSchema = z.object({
  text: z.string().min(3).max(SFX_MAX_TEXT),
  durationSeconds: z.number().min(SFX_MIN_SECONDS).max(SFX_MAX_SECONDS).optional(),
  promptInfluence: z.number().min(0).max(1).optional(),
  loop: z.boolean().optional(),
});

const imageSchema = z.object({
  prompt: z.string().min(3).max(2000),
});

/**
 * One row per call, written on both the success and the failure path.
 *
 * A failure that still spent provider time is exactly the cost that would
 * otherwise be invisible. Nothing reads this to gate — it is here so the real
 * price of a Pro seat can be measured before anyone invents a quota.
 *
 * Bookkeeping must never fail a call the org has already been charged for by
 * the provider, hence the swallowed error.
 */
async function log(
  plugin: ChatPluginId | "voices",
  integration: IntegrationId,
  organizationId: string,
  userId: string,
  outcome: { ok: boolean; bytes: number; ms: number; error?: string; usage?: Usage },
): Promise<void> {
  const { usage, ...rest } = outcome;
  await db
    .insert(schema.pluginCalls)
    .values({
      organizationId,
      userId,
      plugin,
      integration,
      ...rest,
      units: usage?.units ?? 0,
      unit: usage?.unit ?? null,
      costUsdMicros: usage ? costUsdMicros(integration, usage) : 0,
    })
    .catch(() => undefined);
}

/**
 * What a call costs us, at list price, in millionths of a dollar.
 *
 * ElevenLabs sells characters by the plan; the Creator tier works out near
 * $0.30 per thousand once the allowance is spent, and that is the number a
 * per-org cap should be sized against. Gemini's image model is priced per
 * image. Estimates, not invoices — but they add up the same way across
 * providers, which is what makes a single limit possible.
 */
const PRICE_USD_MICROS: Record<IntegrationId, Record<Usage["unit"], number>> = {
  elevenlabs: { characters: 300, images: 0 },
  gemini: { characters: 0, images: 39_000 },
};

function costUsdMicros(integration: IntegrationId, usage: Usage): number {
  return Math.round(usage.units * (PRICE_USD_MICROS[integration]?.[usage.unit] ?? 0));
}

/** Bytes back, with the content type the caller writes the file under. */
function respond(result: GeneratedMedia): Response {
  return new Response(new Uint8Array(result.bytes), {
    status: 200,
    headers: {
      "content-type": result.mime,
      "content-length": String(result.bytes.byteLength),
      // Generated once and written straight to a file. There is nothing to
      // re-request: the same URL answers differently for every prompt.
      "cache-control": "no-store",
    },
  });
}

/**
 * Gate, generate, log, answer.
 *
 * The paywall is checked before a single provider byte is spent, and the status
 * a provider failure carries is preserved — a refused prompt is a 400 the agent
 * can correct on its next call, an outage is a 502 it cannot.
 */
async function handle(
  c: Context<AuthEnv>,
  plugin: ChatPluginId,
  integration: IntegrationId,
  /** Which monthly meter this call draws on, and by how much. */
  draw: { meter: PluginMeter; cost: number },
  work: () => Promise<GeneratedMedia>,
): Promise<Response> {
  const organizationId = c.get("organizationId");
  const { paid, plan } = await getEntitlements(organizationId);
  if (!paid) return c.json(pluginPaywall(), PAYWALL_STATUS);
  // Paying, but this month's allowance is spent. Also before any provider byte.
  const quota = await checkQuota(organizationId, plan, draw.meter, draw.cost);
  if (quota) return c.json(quota, QUOTA_STATUS);

  const userId = c.get("user").id;
  const started = Date.now();
  try {
    const media = await work();
    await log(plugin, integration, organizationId, userId, {
      ok: true,
      bytes: media.bytes.byteLength,
      ms: Date.now() - started,
      usage: media.usage,
    });
    return respond(media);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await log(plugin, integration, organizationId, userId, {
      ok: false,
      bytes: 0,
      ms: Date.now() - started,
      error: message.slice(0, 500),
    });
    const status = err instanceof PluginProviderError ? err.status : 502;
    return c.json({ error: message }, status as ContentfulStatusCode);
  }
}

/**
 * The voices a voiceover can use, for the chat's picker. Not paywalled: a
 * list of names costs nothing, and hearing what Pro would buy is the point.
 */
pluginRoutes.get("/voices", async (c) => {
  const started = Date.now();
  try {
    const { voices, fetched } = await listVoices();
    // Only a call that reached ElevenLabs is a call worth a row; a cache
    // hit is ours. Free of charge either way, and logged so "every call we
    // make" is literally true.
    if (fetched) {
      await log("voices", "elevenlabs", c.get("organizationId"), c.get("user").id, {
        ok: true,
        bytes: 0,
        ms: Date.now() - started,
        usage: { units: 0, unit: "characters" },
      });
    }
    c.header("Cache-Control", "private, max-age=600");
    return c.json({ voices });
  } catch (err) {
    const status = err instanceof PluginProviderError ? err.status : 502;
    return c.json({ error: err instanceof Error ? err.message : String(err) }, status as ContentfulStatusCode);
  }
});

pluginRoutes.get("/voices/:id/preview", async (c) => {
  try {
    const media = await voicePreview(c.req.param("id"));
    return new Response(new Uint8Array(media.bytes), {
      headers: { "content-type": media.mime, "cache-control": "private, max-age=86400" },
    });
  } catch (err) {
    const status = err instanceof PluginProviderError ? err.status : 502;
    return c.json({ error: err instanceof Error ? err.message : String(err) }, status as ContentfulStatusCode);
  }
});

pluginRoutes.post("/voiceover", zValidator("json", voiceoverSchema), (c) => {
  const { text, voice } = c.req.valid("json");
  return handle(c, "voiceover", "elevenlabs", { meter: "characters", cost: text.length }, () =>
    generateVoiceover(text, voice),
  );
});

pluginRoutes.post("/sfx", zValidator("json", sfxSchema), (c) => {
  const { text, ...options } = c.req.valid("json");
  return handle(c, "sfx", "elevenlabs", { meter: "sfx", cost: 1 }, () => generateSfx(text, options));
});

pluginRoutes.post("/image", zValidator("json", imageSchema), (c) => {
  const { prompt } = c.req.valid("json");
  return handle(c, "image", "gemini", { meter: "images", cost: 1 }, () => generateImage(prompt));
});
