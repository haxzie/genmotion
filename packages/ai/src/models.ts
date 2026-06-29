import { moonshotai } from "@ai-sdk/moonshotai";

/**
 * Default text model for every agent (editor, scene-writer, naming).
 * Moonshot Kimi 2.6 via the official @ai-sdk/moonshotai provider, which reads
 * MOONSHOT_API_KEY. Override the model id with CHAT_MODEL if needed.
 */
export const CHAT_MODEL_ID = process.env.CHAT_MODEL ?? "kimi-k2.6";

export const chatModel = () => moonshotai(CHAT_MODEL_ID);
