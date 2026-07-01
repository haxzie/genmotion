import { moonshotai } from "@ai-sdk/moonshotai";

/**
 * Default text model for every agent (editor, scene-writer, naming).
 * Moonshot Kimi K2.7 (code, high-speed) via the official @ai-sdk/moonshotai
 * provider, which reads MOONSHOT_API_KEY. It's a fast, code-tuned, essentially
 * non-thinking model — chosen so the agent responds immediately instead of
 * spending 5–45s reasoning. Override the model id with CHAT_MODEL if needed.
 */
export const CHAT_MODEL_ID = process.env.CHAT_MODEL ?? "kimi-k2.7-code-highspeed";

export const chatModel = () => moonshotai(CHAT_MODEL_ID);
