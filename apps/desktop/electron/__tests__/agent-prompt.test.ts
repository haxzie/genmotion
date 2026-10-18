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

  /**
   * Spending the user's money is the one thing no engine may differ on: the
   * generators and the connected integrations are the app's, and an agent
   * that was never told to ask simply bills them.
   */
  it("makes every engine confirm a paid call before making it", () => {
    for (const prompt of [react, three, hyperframes]) {
      expect(prompt).toContain("# Paid work: confirm the spend before you make it");
      expect(prompt).toContain("wait for a yes");
      expect(prompt).toContain("Never invent a figure");
    }
    // The old "tell them afterwards" wording, which this replaced.
    for (const prompt of [react, three, hyperframes]) {
      expect(prompt).not.toContain("are a paid feature");
    }
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

  it("carries the spend rule too, in its one-bullet form", () => {
    for (const engine of ["react", "three", "hyperframes"] as const) {
      const preamble = buildCodexPreamble([], null, engine);
      expect(preamble).toContain("Anything that generates media costs the user money");
      expect(preamble).toContain("end the turn there to wait for a yes");
    }
  });
});

/**
 * The attached brand.
 *
 * Two failures worth pinning. One: a brand that is attached but not mentioned,
 * which leaves the agent researching an identity the user already stated and
 * finding a different blue. Two: a brand block that appears when no brand is
 * attached, which would tell every project it has colours it does not have.
 */
describe("the brand block", () => {
  const brand = {
    manifest: {
      id: "acme",
      name: "Acme",
      site: "https://acme.com",
      colors: [
        { hex: "#1d2bf0", role: "primary" as const, name: "Volt", source: "user" as const },
        { hex: "#0a0a0b", role: "ink" as const, source: "user" as const },
      ],
      fonts: [
        {
          role: "display" as const,
          family: "Söhne",
          files: [{ file: "fonts/Sohne-variable.woff2", style: "normal" as const, variable: true }],
          source: "user" as const,
        },
      ],
      logos: [{ file: "logos/mark.svg", variant: "mark" as const, on: "any" as const, source: "user" as const }],
      voice: "Plain and confident.",
      thirdParty: false,
      createdAt: 0,
      updatedAt: 0,
    },
    dir: "/Users/someone/.genmotion/brands/acme",
    logos: ["assets/brand/mark.svg"],
  };

  it("is absent with no brand attached", () => {
    // Matched on the block's own sentence rather than its heading: the
    // `brand-assets` capability row in the skills table is worded almost
    // identically on purpose, and it is in every prompt whether a brand is
    // attached or not.
    for (const engine of ["react", "three", "hyperframes"] as const) {
      expect(buildSystemPrompt([], null, engine, [])).not.toContain("do not research it");
      expect(buildCodexPreamble([], null, engine, [])).not.toContain("do not research it");
    }
  });

  it("states the identity, and that it is not to be researched", () => {
    for (const engine of ["react", "three", "hyperframes"] as const) {
      const prompt = buildSystemPrompt([], null, engine, [], brand);
      expect(prompt).toContain("The brand this video is for: Acme");
      expect(prompt).toContain("#1d2bf0");
      expect(prompt).toContain("Söhne");
      // The files matter more than the name: a family name alone is what
      // produces a video set in Helvetica.
      expect(prompt).toContain("1 real file in the brand folder");
      expect(prompt).toContain("do not research it");
      expect(prompt).toContain("Plain and confident.");
      // The real file, in the project, and the standing ban on substituting one.
      expect(prompt).toContain("assets/brand/mark.svg");
      expect(prompt).toContain("Never redraw, trace or generate a mark");
      // The folder is readable, and the way out of it is the tool.
      expect(prompt).toContain(brand.dir);
      expect(prompt).toContain("use_brand_asset");
    }
  });

  it("reaches Codex too, which has no system prompt of its own", () => {
    for (const engine of ["react", "three", "hyperframes"] as const) {
      const preamble = buildCodexPreamble([], null, engine, [], brand);
      expect(preamble).toContain("The brand this video is for: Acme");
      expect(preamble).toContain("#1d2bf0");
    }
  });

  it("says what to do when the brand has no logo, rather than going quiet", () => {
    const prompt = buildSystemPrompt([], null, "react", [], {
      ...brand,
      manifest: { ...brand.manifest, logos: [] },
      logos: [],
    });
    expect(prompt).toContain("no logo file");
    expect(prompt).toContain("wordmark");
  });

  /**
   * A remixed template brings a real `components/brand.ts` — geometry, SVG
   * paths, helpers — which the sync deliberately refuses to overwrite. The
   * agent has to be told that, or the file looks simply wrong to it.
   */
  it("explains a brand module it was not allowed to write", () => {
    const prompt = buildSystemPrompt([], null, "react", [], { ...brand, moduleSkipped: true });
    expect(prompt).toContain("already had a `components/brand.ts` of its own");
    expect(prompt).not.toContain("already holds these values as tokens");
  });

  it("holds a third-party brand to reference use", () => {
    const prompt = buildSystemPrompt([], null, "react", [], {
      ...brand,
      manifest: { ...brand.manifest, thirdParty: true },
    });
    expect(prompt).toContain("belongs to someone else");
    expect(prompt).toContain("never write copy that claims to be from them");
  });
});
