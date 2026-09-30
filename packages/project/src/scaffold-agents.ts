import { MANIFEST_FILE, SCENES_DIR } from "./paths";

/**
 * The files that let any coding agent opened in a project folder make a video
 * with no setup. Written by the `genmotion` CLI (`init`, `skills add`), never
 * by `createProject` itself: the desktop app runs its own agent with its own
 * in-process tools, and a skill pointing at the CLI would only mislead it.
 * Claude Code reads `CLAUDE.md`, `.mcp.json` and
 * `.claude/skills/`; Codex reads `AGENTS.md` and `.agents/skills/`; Cursor
 * reads `.cursor/mcp.json`. Every one of them lands on the same `genmotion`
 * CLI, run from the project's own `node_modules` once installed and fetched
 * by npx before that.
 */
export const MCP_SERVER_NAME = "genmotion";

export function renderMcpJson(): string {
  const config = {
    mcpServers: {
      [MCP_SERVER_NAME]: { command: "npx", args: ["-y", "genmotion", "mcp"] },
    },
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

/** Claude Code imports the one instructions file rather than keeping a copy that drifts. */
export function renderClaudeMd(): string {
  return "@AGENTS.md\n";
}

/** Where the skill lands for each agent that reads skills from the project. */
export const SKILL_PATHS = [".claude/skills/genmotion/SKILL.md", ".agents/skills/genmotion/SKILL.md"] as const;

/**
 * The workflow, as a skill: short on purpose. The rules for writing a scene
 * live in AGENTS.md (always loaded); this is the loop around them, which is
 * what an agent otherwise improvises — and gets wrong by declaring a video done
 * without ever looking at it.
 */
export function renderGenmotionSkill(): string {
  return `---
name: genmotion
description: Make or edit a GenMotion video in this folder — write Three.js scenes, preview them, check them, and render an MP4. Use for any request to create, change, animate, retime, preview or export the video.
---

# Making a video with GenMotion

This folder is a GenMotion project: \`${MANIFEST_FILE}\` is the timeline, \`${SCENES_DIR}/\`
holds one scene per file, and AGENTS.md has the rules every scene must follow.
Read AGENTS.md before writing a scene.

## The loop

1. **Brief.** Pin down what the video is for, how long, and the aspect ratio
   (\`${MANIFEST_FILE}\` holds \`width\`/\`height\`/\`fps\`). Ask only what you can't infer.
2. **Plan scenes.** 3–8 scenes of 2–6 s each. One idea per scene.
3. **Write scenes.** \`npx genmotion scene add <name> --duration 4s\` creates the
   file *and* registers it in \`${MANIFEST_FILE}\`; then fill in the builder.
   Delete the starter scene (file and manifest entry) once you have your own.
4. **Check.** \`npx genmotion check --json\` — compiles every scene, enforces the
   determinism rules, and renders each scene's first/middle/last frame in a real
   headless browser. Fix every \`error\`; read every \`warning\`.
5. **Look.** \`npx genmotion still --at 1.5s --at 50% --json\` writes PNGs you can
   open. Look at them. A check that passes can still be an ugly frame.
6. **Render** only when asked, or at the end:
   \`npx genmotion render --json\` → \`exports/<name>.mp4\`.

With the \`genmotion\` MCP server connected, the same steps are tools:
\`project_overview\`, \`add_scene\`, \`validate_scene\`, \`check_project\`,
\`capture_frames\` (returns the images directly), \`render_video\`,
\`save_asset\`, \`add_package\`, \`get_guide\`.

## Don'ts

- Don't start a clock: no \`THREE.Clock\`, \`setAnimationLoop\`,
  \`requestAnimationFrame\`, \`Date.now\`, \`Math.random\`. Everything is a function
  of the \`time\`/\`frame\`/\`progress\` your update callback receives.
- Don't hot-link remote URLs. \`save_asset\` (or download into \`assets/\`) first.
- Don't call it done without a \`check\` that passes and a \`still\` you've looked at.
- For a live preview the user can scrub, suggest \`npm run dev\` — don't block on it
  yourself (\`npx genmotion dev --background\` returns immediately).
`;
}
