import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { db, schema } from "@genmotion/db";
import { PAYWALL_STATUS, type ChatPluginId, type IntegrationId } from "@genmotion/shared";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { getEntitlements } from "../entitlements";
import { pluginPaywall } from "../limits";
import { generateImage, PluginProviderError, type GeneratedMedia } from "../plugins/gemini-image";
import { generateVoiceover } from "../plugins/elevenlabs-voice";

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
  plugin: ChatPluginId,
  integration: IntegrationId,
  organizationId: string,
  userId: string,
  outcome: { ok: boolean; bytes: number; ms: number; error?: string },
): Promise<void> {
  await db
    .insert(schema.pluginCalls)
    .values({ organizationId, userId, plugin, integration, ...outcome })
    .catch(() => undefined);
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
  work: () => Promise<GeneratedMedia>,
): Promise<Response> {
  const organizationId = c.get("organizationId");
  const { paid } = await getEntitlements(organizationId);
  if (!paid) return c.json(pluginPaywall(), PAYWALL_STATUS);

  const userId = c.get("user").id;
  const started = Date.now();
  try {
    const media = await work();
    await log(plugin, integration, organizationId, userId, {
      ok: true,
      bytes: media.bytes.byteLength,
      ms: Date.now() - started,
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

pluginRoutes.post("/voiceover", zValidator("json", voiceoverSchema), (c) => {
  const { text, voice } = c.req.valid("json");
  return handle(c, "voiceover", "elevenlabs", () => generateVoiceover(text, voice));
});

pluginRoutes.post("/image", zValidator("json", imageSchema), (c) => {
  const { prompt } = c.req.valid("json");
  return handle(c, "image", "gemini", () => generateImage(prompt));
});
