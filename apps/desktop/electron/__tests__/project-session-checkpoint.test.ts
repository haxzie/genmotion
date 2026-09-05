import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { createProject } from "@genmotion/project";
import { ProjectSession } from "../project-session";

/**
 * Crash-recovery for chat: a checkpoint left on disk when a session opens
 * means the last turn never reached its own `onFinish` — the process died,
 * force-quit, or an update installed mid-turn. `ProjectSession.open()` is
 * supposed to fold that into the transcript rather than lose it silently.
 */

const dirs: string[] = [];
const sessions: ProjectSession[] = [];

afterEach(async () => {
  await Promise.all(sessions.splice(0).map((s) => s.dispose()));
  await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function tempProjectDir(): Promise<string> {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "gm-session-"));
  dirs.push(parent);
  const dir = path.join(parent, "project");
  await createProject({ dir, name: "Checkpoint Test" });
  return dir;
}

async function open(dir: string): Promise<ProjectSession> {
  const session = await ProjectSession.open(dir, "test-key");
  sessions.push(session);
  return session;
}

async function transcriptLines(dir: string): Promise<unknown[]> {
  const raw = await fs.readFile(path.join(dir, ".genmotion", "chat.jsonl"), "utf8").catch(() => "");
  return raw
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function checkpointPath(dir: string): string {
  return path.join(dir, ".genmotion", "chat.checkpoint.json");
}

describe("writeCheckpoint / clearCheckpoint", () => {
  it("overwrites in place rather than appending", async () => {
    const dir = await tempProjectDir();
    const session = await open(dir);

    await session.writeCheckpoint({ id: "m1", role: "assistant", parts: [{ type: "text", text: "a" }] });
    await session.writeCheckpoint({ id: "m1", role: "assistant", parts: [{ type: "text", text: "ab" }] });

    const raw = await fs.readFile(checkpointPath(dir), "utf8");
    expect(JSON.parse(raw)).toEqual({
      id: "m1",
      role: "assistant",
      parts: [{ type: "text", text: "ab" }],
    });
  });

  it("clears the file, not just its contents", async () => {
    const dir = await tempProjectDir();
    const session = await open(dir);

    await session.writeCheckpoint({ id: "m1", role: "assistant", parts: [] });
    await session.clearCheckpoint();

    await expect(fs.stat(checkpointPath(dir))).rejects.toThrow();
  });

  it("clearing when nothing was ever written is a no-op, not an error", async () => {
    const dir = await tempProjectDir();
    const session = await open(dir);
    await expect(session.clearCheckpoint()).resolves.toBeUndefined();
  });

  it("serializes overlapping writes instead of racing on the same tmp file", async () => {
    const dir = await tempProjectDir();
    const session = await open(dir);

    // A tool event bypasses the caller's own throttle, so in practice this is
    // exactly what two events landing close together looks like: neither
    // write awaited before the next starts.
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        session.writeCheckpoint({ id: "m1", role: "assistant", parts: [], seq: i }),
      ),
    );

    const raw = await fs.readFile(checkpointPath(dir), "utf8");
    // Whichever write actually landed last, the file has to be *one* complete,
    // parseable write — never a splice of two.
    expect(JSON.parse(raw)).toMatchObject({ id: "m1", role: "assistant" });
  });
});

describe("recovery on open", () => {
  it("folds an orphaned checkpoint into the transcript and clears it", async () => {
    const dir = await tempProjectDir();

    // Simulate the crash: a checkpoint lands, but the process dies before
    // onFinish ever runs to clear it.
    const first = await open(dir);
    const partial = {
      id: "orphaned-1",
      role: "assistant" as const,
      parts: [
        { type: "text", text: "Renaming the intro scene" },
        { type: "tool-write_file", toolCallId: "t1", state: "output-available", input: {}, output: {} },
      ],
      metadata: { interrupted: true },
    };
    await first.writeCheckpoint(partial);
    await first.dispose();

    // A fresh open — the next launch, or the next project switch — is where
    // recovery has to happen, since nothing in the dead process's memory
    // survived to do it any other way.
    await open(dir);

    const messages = await transcriptLines(dir);
    expect(messages).toEqual([partial]);
    await expect(fs.stat(checkpointPath(dir))).rejects.toThrow();
  });

  it("does nothing when the last turn actually finished", async () => {
    const dir = await tempProjectDir();
    const session = await open(dir);
    await session.appendTranscript({ id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] });
    await session.appendTranscript({ id: "a1", role: "assistant", parts: [{ type: "text", text: "hey" }] });
    await session.dispose();

    await open(dir);

    const messages = await transcriptLines(dir);
    expect(messages).toHaveLength(2);
  });

  it("discards a checkpoint it can't parse instead of failing every future open", async () => {
    const dir = await tempProjectDir();
    await fs.mkdir(path.join(dir, ".genmotion"), { recursive: true });
    await fs.writeFile(checkpointPath(dir), "{not json", "utf8");

    await expect(open(dir)).resolves.toBeInstanceOf(ProjectSession);
    await expect(fs.stat(checkpointPath(dir))).rejects.toThrow();
    expect(await transcriptLines(dir)).toEqual([]);
  });

  it("a recovered message doesn't get appended twice if it somehow already landed", async () => {
    const dir = await tempProjectDir();
    const first = await open(dir);
    const message = { id: "dup-1", role: "assistant" as const, parts: [{ type: "text", text: "done" }] };
    // Both the real write (onFinish reached it after all) and a stale
    // checkpoint (cleared a moment too late to matter) exist at once.
    await first.appendTranscript(message);
    await first.writeCheckpoint(message);
    await first.dispose();

    await open(dir);

    const messages = await transcriptLines(dir);
    expect(messages).toEqual([message]);
  });
});
