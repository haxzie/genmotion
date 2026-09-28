import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The picker's one promise: every model name it shows is a name a harness
 * said.
 *
 * Worth pinning, because the way this breaks is silent. A row reading "Opus"
 * where the CLI would have said "Opus 5.5" looks like a working picker, so it
 * gets reported as "the app is missing the new model" months later, if at all.
 * These tests say the two halves out loud: what a harness reports is passed
 * through exactly, and what it doesn't report is never filled in for it.
 */

const userData = await fs.mkdtemp(path.join(os.tmpdir(), "gm-models-test-"));

vi.mock("electron", () => ({
  app: { getPath: () => userData, getVersion: () => "0.0.0-test" },
}));

vi.mock("../agent/detect", () => ({
  agentEnv: () => ({}),
  resolveExecutable: async () => "/usr/local/bin/claude",
}));

/** What the fake Claude Code answers with, swapped per test. */
let claudeAnswer: () => Promise<{ value: string; displayName: string; description: string }[]>;

vi.mock("../agent/load-sdk", () => ({
  loadAgentSdk: async () => ({
    query: () => ({
      supportedModels: () => claudeAnswer(),
      return: async () => undefined,
    }),
  }),
}));

const cacheFile = path.join(userData, "models-cache.json");

beforeEach(async () => {
  await fs.rm(cacheFile, { force: true });
  vi.resetModules();
});

/** A fresh module, so the in-memory cache of a previous test can't leak in. */
async function freshListModels() {
  vi.resetModules();
  const mod = await import("../agent/models");
  return mod.listModels;
}

describe("the model list", () => {
  it("shows the harness's own names, and reads the generation out of its description", async () => {
    claudeAnswer = async () => [
      {
        value: "default",
        displayName: "Default (recommended)",
        description: "Use the default model (currently Opus 5.5 (1M context)) · $4/$20 per Mtok",
      },
      {
        value: "claude-fable-5-1",
        displayName: "Fable",
        description: "Fable 5.1 · Most capable for your hardest tasks",
      },
      { value: "opus", displayName: "Opus 5.5", description: "Most capable for ambitious work" },
    ];

    const list = await (await freshListModels())();
    const claude = list.models.filter((m) => m.harness === "claude-code");

    expect(claude.map((m) => m.label)).toEqual(["Default (recommended)", "Fable", "Opus 5.5"]);
    // The sentence around the name is not the name: the row says which model
    // the default currently is, not how the CLI phrased it.
    expect(claude[0]?.version).toBe("Opus 5.5 (1M context)");
    expect(claude[1]?.version).toBe("Fable 5.1");
    // Nothing to add when the label already carries the generation.
    expect(claude[2]?.version).toBeNull();
    expect(list.unread).not.toContain("claude-code");
  });

  it("invents no model when the harness can't be asked", async () => {
    claudeAnswer = async () => {
      throw new Error("claude is not on PATH");
    };

    const list = await (await freshListModels())();
    const claude = list.models.filter((m) => m.harness === "claude-code");

    // One row, naming nothing: "let the CLI choose". Never "Opus"/"Sonnet".
    expect(claude).toHaveLength(1);
    expect(claude[0]?.id).toBe("");
    expect(claude[0]?.label).toBe("Default");
    // And the picker is told, so it can say so instead of looking complete.
    expect(list.unread).toContain("claude-code");
  });

  it("keeps the last real answer rather than replacing it with a placeholder", async () => {
    claudeAnswer = async () => [
      { value: "opus", displayName: "Opus 5.5", description: "Most capable for ambitious work" },
    ];
    const first = await (await freshListModels())();
    expect(first.models.some((m) => m.label === "Opus 5.5")).toBe(true);

    // A later probe fails — a CLI mid-update, a hung subprocess. Yesterday's
    // real name beats today's invented one, and the staleness is admitted.
    claudeAnswer = async () => {
      throw new Error("timed out");
    };
    const second = await (await freshListModels())(true);

    expect(second.models.some((m) => m.label === "Opus 5.5")).toBe(true);
    expect(second.unread).toContain("claude-code");
  });
});
