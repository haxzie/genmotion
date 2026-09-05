import path from "node:path";
import { describe, expect, it } from "vitest";
import { bundledBinary, bundledBinDir } from "../bundled-bin";
import { agentEnv } from "../agent/detect";

/**
 * The chat agent's shell only finds this app's own ffmpeg because `agentEnv()`
 * puts `bundledBinDir()` on PATH (see `agent/detect.ts`). If either half of
 * that drifts, ffmpeg silently stops resolving for a spawned harness with no
 * error anywhere — worth a direct check.
 */

describe("bundledBinary", () => {
  it("resolves the dev build's dist/bin, not the packaged asar path", () => {
    // Electron isn't running here, so __dirname inside bundled-bin.ts is this
    // test file's own directory (electron/__tests__/) rather than dist/main/ —
    // the packaged-app case is covered by build verification, not this test.
    const resolved = bundledBinary("ffmpeg");
    expect(resolved).toBe(path.resolve(__dirname, "../../bin/ffmpeg"));
  });

  it("bundledBinDir is that path's directory", () => {
    expect(bundledBinDir()).toBe(path.dirname(bundledBinary("ffmpeg")));
  });
});

describe("agentEnv", () => {
  it("puts the bundled bin directory ahead of everything else on PATH", () => {
    const entries = agentEnv().PATH?.split(":") ?? [];
    expect(entries[0]).toBe(bundledBinDir());
  });

  it("still carries the rest of the process's PATH", () => {
    const entries = new Set(agentEnv().PATH?.split(":"));
    for (const original of (process.env.PATH ?? "").split(":")) {
      if (original) expect(entries.has(original)).toBe(true);
    }
  });
});
