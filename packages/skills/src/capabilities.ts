import type { SkillCapability, SkillRequirement } from "@genmotion/shared";

/**
 * What each capability a skill names actually is, on each surface an agent
 * reads the pack from.
 *
 * - `desktop` — the GenMotion app's in-process tools.
 * - `mcp` — an agent connected to `genmotion mcp`.
 * - `shell` — an agent with a terminal and the `genmotion` CLI, no MCP.
 *
 * `null` means the surface has no way to do it. Skills still name the
 * capability; the surface's instructions (generated from this table) tell the
 * agent what to do instead, and search marks the requirement as missing so
 * the gap is visible before the plan is made, not halfway through it.
 */
export type SkillSurface = "desktop" | "mcp" | "shell";

export interface CapabilitySpec {
  /** What it does, as the table's first column says it. */
  label: string;
  desktop: string | null;
  mcp: string | null;
  shell: string | null;
  /** What to do when the surface can't, shown in place of a tool. */
  fallback?: string;
}

export const CAPABILITIES: Record<SkillCapability, CapabilitySpec> = {
  validate: {
    label: "Check the scenes you just wrote",
    desktop: "`validate_scene` (React, Three) or `validate_composition` (HyperFrames)",
    mcp: "`check_project` (or `validate_scene` for one file)",
    shell: "`npx genmotion check --json`",
  },
  "capture-frames": {
    label: "Render frames and look at them",
    desktop: "`capture_frames`",
    mcp: "`capture_frames`",
    shell: "`npx genmotion still --at <time> --json`, then open the PNGs",
  },
  "project-overview": {
    label: "The project's scenes, timing, audio and assets",
    desktop: "`project_overview`",
    mcp: "`project_overview`",
    shell: "`npx genmotion info --json`",
  },
  "save-asset": {
    label: "Copy a remote image, video, font or audio file into `assets/`",
    desktop: "`save_asset`",
    mcp: "`save_asset`",
    shell: "download it into `assets/` with your own shell",
  },
  "generate-image": {
    label: "Generate artwork",
    desktop: "`generate_image`",
    mcp: null,
    shell: null,
    fallback: "ask the user for the image, or build the visual from geometry and type instead",
  },
  "image-generation": {
    label: "Generate artwork",
    desktop: "`generate_image`",
    mcp: null,
    shell: null,
    fallback: "ask the user for the image, or build the visual from geometry and type instead",
  },
  "pick-voice": {
    label: "Choose a narration voice",
    desktop: "`pick_voice`",
    mcp: null,
    shell: null,
    fallback: "ask the user which voice, or skip if there is no narration",
  },
  voiceover: {
    label: "Narration",
    desktop: "`generate_voiceover`",
    mcp: null,
    shell: null,
    fallback: "use an audio file the user provides (put it in `assets/` and add it to `project.json`'s `audio`), or carry the words as on-screen type",
  },
  sfx: {
    label: "Whooshes, clicks, ambience",
    desktop: "`generate_sfx`",
    mcp: null,
    shell: null,
    fallback: "use sound files the user provides, or leave the moment silent",
  },
  "search-skills": {
    label: "Rank the skill pack against a request",
    desktop: "`search_skills`",
    mcp: "`search_skills`, then `get_skill`",
    shell: "`npx genmotion skills search \"<request>\" --json`, then `npx genmotion skills show <id>`",
  },
  "recommend-integration": {
    label: "Offer the user a connector a skill wants",
    desktop: "`recommend_integration`",
    mcp: null,
    shell: null,
    fallback: "say in one sentence which service would help and carry on without it",
  },
  ffmpeg: {
    label: "Trims, transcodes, frame extraction",
    desktop: "`ffmpeg` on your shell's PATH",
    mcp: "`ffmpeg` in your shell, if you have one",
    shell: "`ffmpeg` if installed (`npx genmotion doctor` shows the bundled one)",
  },
  "web-research": {
    label: "Look things up on the web",
    desktop: "your own web tools",
    mcp: "your own web tools",
    shell: "your own web tools",
  },
};

/**
 * Desktop tool names the pack used before capabilities, mapped to the
 * capability they meant — so a user skill still written against tool names
 * resolves on every surface.
 */
export const TOOL_CAPABILITIES: Record<string, SkillCapability> = {
  validate_scene: "validate",
  validate_composition: "validate",
  capture_frames: "capture-frames",
  project_overview: "project-overview",
  save_asset: "save-asset",
  generate_image: "generate-image",
  pick_voice: "pick-voice",
  generate_voiceover: "voiceover",
  generate_sfx: "sfx",
  search_skills: "search-skills",
  recommend_integration: "recommend-integration",
};

/** Can this surface satisfy the requirement on its own (MCP connectors aside)? */
export function availableOn(req: SkillRequirement, surface: SkillSurface): boolean {
  if (req.kind === "skill") return true;
  if (req.kind === "mcp") return false;
  const capability = req.kind === "capability" ? req.id : TOOL_CAPABILITIES[req.id];
  if (!capability) return surface === "desktop";
  return CAPABILITIES[capability][surface] !== null;
}

/** What the agent should do about a capability its surface lacks. */
export function fallbackFor(capability: SkillCapability): string | undefined {
  return CAPABILITIES[capability].fallback;
}

const SURFACE_HEADINGS: Record<SkillSurface, string> = {
  desktop: "Use",
  mcp: "With the `genmotion` MCP server",
  shell: "From a shell",
};

/**
 * The capability table, as markdown — the one thing every surface's
 * instructions carry so the pack's neutral words land on real tools. Pass two
 * surfaces for an agent that may have either (a project folder opened by
 * Claude Code with MCP, or by Codex with only a shell). Capabilities a surface
 * lacks show what to do instead.
 */
export function capabilityTable(surfaces: SkillSurface | readonly SkillSurface[]): string {
  const list = typeof surfaces === "string" ? [surfaces] : [...surfaces];
  const rows = (Object.keys(CAPABILITIES) as SkillCapability[])
    .filter((id) => id !== "image-generation")
    .map((id) => {
      const spec = CAPABILITIES[id];
      const cells = list.map((surface) => spec[surface] ?? `not available — ${spec.fallback ?? "do without it"}`);
      return `| \`${id}\` | ${spec.label} | ${cells.join(" | ")} |`;
    });
  return [
    "Skills name what to do as backticked capability ids, never tool names. What each one is here:",
    "",
    `| Skill says | Meaning | ${list.map((s) => SURFACE_HEADINGS[s]).join(" | ")} |`,
    `| --- | --- | ${list.map(() => "---").join(" | ")} |`,
    ...rows,
  ].join("\n");
}
