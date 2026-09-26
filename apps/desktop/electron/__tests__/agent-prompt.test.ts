import { describe, expect, it } from "vitest";
import { DESIGN_STANDARDS, VIDEO_NOT_A_WEBSITE } from "@genmotion/ai/prompt";
import { buildCodexPreamble, buildSystemPrompt } from "../agent/prompt";

/**
 * Each engine's agent must be told about the engine it is actually writing
 * for. The failure this guards against is quiet and expensive: a Three.js
 * project handed the React guide produces scenes full of `<AbsoluteFill>` and
 * `<TextAnimation>` that cannot compile, and the agent has no way to know why
 * — it was told those components exist.
 */
describe("the desktop system prompt", () => {
  const react = buildSystemPrompt([], null, "react");
  const three = buildSystemPrompt([], null, "three");
  const hyperframes = buildSystemPrompt([], null, "hyperframes");

  it("gives a Three.js project the Three.js guide, not the React one", () => {
    expect(three).toContain("Three.js scenes in plain TypeScript");
    expect(three).toContain("export default function buildScene");
    // The React API surface, none of which exists in a three-engine scene.
    for (const absent of [
      "# @genmotion/motion API",
      "<AbsoluteFill",
      "<TextAnimation",
      "useCurrentFrame",
      "springPresets",
      "# GSAP (advanced choreography)",
    ]) {
      expect(three).not.toContain(absent);
    }
  });

  it("still gives a React project the React guide", () => {
    expect(react).toContain("# @genmotion/motion API");
    expect(react).toContain("<TextAnimation");
    expect(react).not.toContain("Three.js scenes in plain TypeScript");
  });

  it("shares the design direction between engines rather than restating it", () => {
    for (const prompt of [react, three]) {
      expect(prompt).toContain(VIDEO_NOT_A_WEBSITE);
      expect(prompt).toContain(DESIGN_STANDARDS);
    }
    // The shared blocks are about the film, so they may not name a framework.
    for (const block of [VIDEO_NOT_A_WEBSITE, DESIGN_STANDARDS]) {
      expect(block).not.toMatch(/<Img|<AbsoluteFill|THREE\.|JSX|Easing\.|springPresets/);
    }
  });

  it("tells a Three.js agent how the user points at things", () => {
    expect(three).toContain("object.name");
    expect(three).toContain("userData.pickable");
    expect(three).toContain("userData.pickBounds");
  });

  it("leaves the HyperFrames prompt alone", () => {
    expect(hyperframes).toContain("HyperFrames");
    expect(hyperframes).not.toContain("# @genmotion/motion API");
  });
});

describe("the Codex preamble", () => {
  it("says what validate_scene can and cannot prove, per engine", () => {
    const three = buildCodexPreamble([], null, "three");
    const react = buildCodexPreamble([], null, "react");
    expect(three).toContain("This is a **Three.js** project");
    expect(three).toContain("cannot render WebGL in this check");
    expect(three).toContain('"scenes/02-hero.ts"');
    expect(react).toContain("renders three frames");
    expect(react).toContain('"scenes/02-hero.tsx"');
    // `<Audio>` is a React component; a three-engine scene cannot render one.
    expect(three).not.toContain("<Audio>");
    expect(react).toContain("<Audio>");
  });
});
