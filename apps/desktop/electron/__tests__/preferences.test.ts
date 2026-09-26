import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What a new project is written for.
 *
 * Worth pinning: the default engine decides what every first-run project is,
 * and it is one word in one object — the kind of value that changes by
 * accident and is only noticed when somebody's new project turns out to be
 * the wrong kind of project. The second test is the other half of that: a
 * machine whose user has already chosen keeps their choice, so changing the
 * default is never retroactive.
 */

const userData = await fs.mkdtemp(path.join(os.tmpdir(), "gm-prefs-test-"));

vi.mock("electron", () => ({
  app: { getPath: () => userData, getVersion: () => "0.0.0-test" },
}));

const { projectDefaults, setProjectDefaults, DEFAULT_PROJECT } = await import("../preferences");

const settingsFile = path.join(userData, "settings.json");

beforeEach(async () => {
  await fs.rm(settingsFile, { force: true });
});

describe("project defaults", () => {
  it("starts a machine that has never chosen on the Three.js engine, at 1080p30", async () => {
    expect(DEFAULT_PROJECT.engine).toBe("three");
    expect(await projectDefaults()).toEqual({
      width: 1920,
      height: 1080,
      fps: 30,
      engine: "three",
    });
  });

  it("keeps an engine the user has already picked", async () => {
    await setProjectDefaults({ engine: "react" });
    expect((await projectDefaults()).engine).toBe("react");
  });

  it("falls back to the default when the stored engine is from a build that had another name for it", async () => {
    await fs.writeFile(
      settingsFile,
      JSON.stringify({ defaults: { width: 1080, height: 1080, fps: 60, engine: "webgl" } }),
      "utf8",
    );
    // The unreadable field alone is replaced; the rest of the choice stands.
    expect(await projectDefaults()).toEqual({
      width: 1080,
      height: 1080,
      fps: 60,
      engine: "three",
    });
  });
});
