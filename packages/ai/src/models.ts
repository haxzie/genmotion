import { moonshotai } from "@ai-sdk/moonshotai";

/**
 * Text models for the agents, via the official @ai-sdk/moonshotai provider
 * (reads MOONSHOT_API_KEY).
 *
 * Two tiers, split by whether the caller streams:
 *
 * - Chat and compaction stream their output, so the user sees tokens land
 *   progressively and a slower tier is largely invisible. They get the base
 *   model.
 * - The scene writer does not stream — it's a blocking `generateText` that
 *   runs several at a time and holds the chat stream open until every scene
 *   is back, so its latency is felt as a stall. It gets the high-speed tier,
 *   which is the same model at ~2x the price for faster output.
 *
 * Moonshot caches a stable prompt prefix implicitly, so no per-request cache
 * marker is needed — unlike Anthropic, which requires an explicit
 * `cache_control` breakpoint. Keep the stable system prompt first in the
 * message list (see routes/chat.ts) and the discount applies automatically.
 */
export const CHAT_MODEL_ID = process.env.CHAT_MODEL ?? "kimi-k2.6";

/** Scene writing: the latency-critical, non-streamed path. */
export const SCENE_MODEL_ID =
  process.env.SCENE_MODEL ?? "kimi-k2.7-code-highspeed";

export const chatModel = () => moonshotai(CHAT_MODEL_ID);

export const sceneModel = () => moonshotai(SCENE_MODEL_ID);

/**
 * Per-request options for the chat tier. Spread into every `chatModel()` call
 * (streamText/generateText take provider options per request, not on the model
 * factory).
 *
 * Thinking is off deliberately. k2.6 reasons before emitting any visible text,
 * which pushes time-to-first-token to ~9s — measured medians over three runs:
 * ~1.9s with thinking off, ~3.5s on k2.7-code, ~8.7s on k2.6 with a 256-token
 * budget. A small budget is worse than either, so there is no middle setting
 * that keeps reasoning at an acceptable latency.
 *
 * The cost of this is the "Thought process" UI: with no reasoning stream the
 * chat panel's ReasoningBlock never renders. Re-enable by setting
 * `thinking.type` to "enabled" here if that view matters more than latency.
 */
export const CHAT_PROVIDER_OPTIONS = {
  moonshotai: { thinking: { type: "disabled" as const } },
};
