/**
 * The contract every agent harness is adapted to. Claude Code and Codex
 * produce very different streams; the editor only ever sees this one, so the
 * chat UI is written once.
 */
export type AgentEvent =
  | { type: "text-delta"; text: string }
  | { type: "reasoning-delta"; text: string }
  | { type: "tool-start"; id: string; name: string; input: unknown }
  | { type: "tool-end"; id: string; output: unknown; isError?: boolean }
  /** A one-line progress note, shown in place of the working indicator. */
  | { type: "status"; text: string }
  /** The project changed on disk; the editor should refetch. */
  | { type: "project-touched" }
  | { type: "usage"; usage: TokenUsage }
  /**
   * How full the harness's context window is.
   *
   * The desktop app sends the harness one message and lets it own the
   * conversation, so our transcript length says nothing about how close the
   * model is to compacting. This is the real number, read from the harness.
   */
  | { type: "context"; context: ContextUsage }
  | { type: "error"; message: string }
  | { type: "done"; sessionId: string | null };

export interface ContextUsage {
  usedTokens: number;
  maxTokens: number;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface TurnInput {
  projectDir: string;
  /** The user's message for this turn. */
  text: string;
  /** Continue a previous conversation with the harness, when it has one. */
  resumeSessionId: string | null;
  signal: AbortSignal;
}

export interface AgentBackend {
  readonly id: "claude-code" | "codex";
  readonly label: string;
  startTurn(input: TurnInput): AsyncIterable<AgentEvent>;
}

export interface AgentAvailability {
  id: AgentBackend["id"];
  label: string;
  installed: boolean;
  version: string | null;
  /** Why it can't be used, when it can't. */
  detail: string | null;
}
