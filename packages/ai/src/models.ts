import { anthropic } from "@ai-sdk/anthropic";

/**
 * Default text model for every agent (editor, scene-writer, naming).
 * Claude Sonnet 4.6 via the official @ai-sdk/anthropic provider, which reads
 * ANTHROPIC_API_KEY. Override the model id with CHAT_MODEL if needed.
 */
export const CHAT_MODEL_ID = process.env.CHAT_MODEL ?? "claude-sonnet-4-6";

export const chatModel = () => anthropic(CHAT_MODEL_ID);
