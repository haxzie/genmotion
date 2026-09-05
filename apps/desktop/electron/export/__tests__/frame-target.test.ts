import { describe, expect, it } from "vitest";
import type { ProjectManifest } from "@genmotion/project";
import { resolveFrameTarget } from "../frame-target";

/**
 * `capture_frames` takes its moment as prose a model wrote — a scene name it
 * may have misremembered, a timecode in whichever unit came to mind. Everything
 * that turns that into a frame number lives here, so it can be pinned down
 * without an offscreen window.
 */

/** Two scenes: 0–89 is the intro, 90–209 is the hero. 30fps. */
const manifest: ProjectManifest = {
  name: "Test",
  fps: 30,
  width: 1920,
  height: 1080,
  scenes: [
    { file: "scenes/01-intro.tsx", durationInFrames: 90 },
    { file: "scenes/02-hero.tsx", durationInFrames: 120 },
  ],
  audio: [],
};

function ok(args: { scene?: string; at?: string }) {
  const result = resolveFrameTarget(manifest, args);
  if (!result.ok) throw new Error(`expected a target, got: ${result.error}`);
  return result.target;
}

describe("resolveFrameTarget", () => {
  it("defaults to 60% into the named scene", () => {
    const target = ok({ scene: "scenes/02-hero.tsx" });
    expect(target.localFrame).toBe(72);
    expect(target.frame).toBe(90 + 72);
    expect(target.scene.file).toBe("scenes/02-hero.tsx");
  });

  it("defaults to 60% into the whole video when no scene is named", () => {
    const target = ok({});
    expect(target.frame).toBe(126);
    // Which lands in the second scene — the caller asked by timeline, so the
    // answer has to say where that is.
    expect(target.scene.file).toBe("scenes/02-hero.tsx");
    expect(target.localFrame).toBe(36);
  });

  it("reads seconds against the scene it was given", () => {
    expect(ok({ scene: "scenes/02-hero.tsx", at: "1.5s" }).frame).toBe(90 + 45);
    expect(ok({ scene: "scenes/02-hero.tsx", at: "2 S" }).localFrame).toBe(60);
  });

  it("reads seconds against the timeline when no scene is given", () => {
    expect(ok({ at: "1.5s" }).frame).toBe(45);
    expect(ok({ at: "1.5s" }).scene.file).toBe("scenes/01-intro.tsx");
  });

  it("reads a bare number as a frame index", () => {
    expect(ok({ scene: "scenes/02-hero.tsx", at: "10" }).frame).toBe(100);
    expect(ok({ at: "10" }).frame).toBe(10);
  });

  it("tolerates a leading ./ on the scene path", () => {
    expect(ok({ scene: "./scenes/02-hero.tsx", at: "0" }).frame).toBe(90);
  });

  it("clamps past the end of a scene to its last frame", () => {
    expect(ok({ scene: "scenes/01-intro.tsx", at: "999" }).frame).toBe(89);
    expect(ok({ at: "60s" }).frame).toBe(209);
  });

  it("clamps to the first frame rather than running off the front", () => {
    expect(ok({ scene: "scenes/02-hero.tsx", at: "0s" }).frame).toBe(90);
  });

  it("names the scenes that do exist when one doesn't", () => {
    const result = resolveFrameTarget(manifest, { scene: "scenes/99-nope.tsx" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("scenes/01-intro.tsx");
    expect(result.error).toContain("scenes/02-hero.tsx");
  });

  it("says which forms `at` takes when it can't read one", () => {
    const result = resolveFrameTarget(manifest, { at: "halfway" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("1.5s");
    expect(result.error).toContain("45");
  });

  it("refuses an empty timeline", () => {
    const result = resolveFrameTarget({ ...manifest, scenes: [] }, {});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("no scenes");
  });
});
