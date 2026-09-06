import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { createProject } from "@genmotion/project";
import { ProjectSession } from "../project-session";
import { runTurnAsUiStream } from "../agent/ui-stream";
import type { AgentBackend, AgentEvent } from "../agent/types";

/**
 * A turn that dies mid-flight — the laptop drops off wifi, the harness can't
 * reach the API — must cost that turn and nothing else. In particular it must
 * not cost the *harness session*: the agent's own memory of the conversation
 * lives there, and losing it silently turns a ten-second outage into a thread
 * that has forgotten everything.
 */

const dirs: string[] = [];
const sessions: ProjectSession[] = [];

afterEach(async () => {
  await Promise.all(sessions.splice(0).map((s) => s.dispose()));
  await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function open(): Promise<ProjectSession> {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "gm-turn-"));
  dirs.push(parent);
  const dir = path.join(parent, "project");
  await createProject({ dir, name: "Interrupted Turn" });
  const session = await ProjectSession.open(dir, "test-key");
  sessions.push(session);
  return session;
}

/** Claude Code's ordering: the failure first, then the `done` carrying the id. */
const DROPPED: AgentEvent[] = [
  { type: "text-delta", text: "Writing the scene." },
  { type: "tool-start", id: "c1", name: "write_scene", input: { file: "a.tsx" } },
  { type: "tool-end", id: "c1", output: "ok" },
  { type: "text-delta", text: "Now I'll " },
  { type: "error", message: "fetch failed: getaddrinfo ENOTFOUND api.anthropic.com" },
  { type: "done", sessionId: "sess-abc" },
];

function backendOf(events: AgentEvent[]): AgentBackend {
  return {
    id: "claude-code",
    label: "Claude Code",
    async *startTurn() {
      for (const event of events) yield event;
    },
  };
}

async function runTurn(events: AgentEvent[]) {
  let result: { message: UIMessage | null; sessionId: string | null } | null = null;
  const response = runTurnAsUiStream({
    backend: backendOf(events),
    projectDir: "/tmp/unused",
    text: "hi",
    resumeSessionId: null,
    signal: new AbortController().signal,
    onFinish: ({ message, sessionId }) => {
      result = { message, sessionId };
    },
  });
  const body = await response.text();
  return { body, result: result as unknown as { message: UIMessage | null; sessionId: string | null } };
}

describe("a turn interrupted by a failing harness", () => {
  it("still reports the session id the harness sent after the error", async () => {
    const { result } = await runTurn(DROPPED);
    expect(result.sessionId).toBe("sess-abc");
  });

  it("still surfaces the failure to the chat", async () => {
    const { body } = await runTurn(DROPPED);
    expect(body).toContain("ENOTFOUND api.anthropic.com");
  });

  it("keeps everything that streamed before the failure", async () => {
    const { result } = await runTurn(DROPPED);
    const types = (result.message?.parts ?? []).map((part) => part.type);
    expect(types).toEqual(["text", "tool-write_scene", "text"]);
  });
});

describe("writeAgentSession", () => {
  it("keeps a live session id when a turn reports none", async () => {
    const session = await open();
    await session.writeAgentSession("sess-abc", "claude-code", { usedTokens: 10, maxTokens: 100 });
    await session.writeAgentSession(null, "claude-code");
    expect(await session.readAgentSession("claude-code")).toBe("sess-abc");
  });

  it("does not carry an id across a harness switch", async () => {
    const session = await open();
    await session.writeAgentSession("sess-abc", "claude-code");
    await session.writeAgentSession(null, "codex");
    expect(await session.readAgentSession("codex")).toBeNull();
    expect(await session.readAgentSession("claude-code")).toBeNull();
  });
});
