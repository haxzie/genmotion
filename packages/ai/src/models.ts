import { moonshotai } from "@ai-sdk/moonshotai";

/**
 * Default text model for every agent (editor, scene-writer, naming).
 * Moonshot Kimi 2.6 via the official @ai-sdk/moonshotai provider, which reads
 * MOONSHOT_API_KEY. Override the model id with CHAT_MODEL if needed.
 */
export const CHAT_MODEL_ID = process.env.CHAT_MODEL ?? "kimi-k2.6";

export const chatModel = () => moonshotai(CHAT_MODEL_ID);

/**
 * Cheap, fast model for conversation compaction summaries. Defaults to the
 * turbo Kimi variant (cheaper/faster than the full chat model, large context
 * for long transcripts). Override with COMPACT_MODEL.
 */
export const COMPACT_MODEL_ID = process.env.COMPACT_MODEL ?? "kimi-k2-turbo";

export const compactModel = () => moonshotai(COMPACT_MODEL_ID);
