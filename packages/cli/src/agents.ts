import path from "node:path";
import fs from "node:fs/promises";
import type { ProjectEngine } from "@genmotion/project";
import { THREE_AUTHORING_GUIDE } from "@genmotion/ai/three-guide";
import { capabilityTable, type SkillSurface } from "@genmotion/skills";
import { ROUTER_SKILL, SKILL_ROOTS, installSkills } from "./skills";

export { THREE_AUTHORING_GUIDE };

/**
 * The files that let any coding agent opened in a project folder make a video
 * with no setup. Claude Code reads `CLAUDE.md`, `.mcp.json` and
 * `.claude/skills/`; Codex reads `AGENTS.md` and `.agents/skills/`; Cursor
 * reads `.cursor/mcp.json`. All of it lands on the same `genmotion` CLI.
 *
 * Written by the CLI only (`init`, `skills add`), never by `createProject`:
 * the desktop app runs its own agent with its own in-process tools, and a
 * skill pointing at the CLI would only mislead it.
 */
export const MCP_SERVER_NAME = "genmotion";

/** The project's own skill — the loop around the pack — by folder name. */
export const PROJECT_SKILL = "genmotion";

export function renderMcpJson(): string {
  const config = { mcpServers: { [MCP_SERVER_NAME]: { command: "npx", args: ["-y", "genmotion", "mcp"] } } };
  return `${JSON.stringify(config, null, 2)}\n`;
}

/** Claude Code imports the one instructions file rather than keeping a copy that drifts. */
export function renderClaudeMd(): string {
  return "@AGENTS.md\n";
}

/**
 * The skill that wraps the pack for agents outside the app: how to pick a
 * video-type skill, the build loop, and the capability table for this
 * surface.
 *
 * `standalone` is the Claude Code plugin's copy, which may run with no
 * project yet and only the MCP server; a project's copy may be read by an
 * agent with MCP (Claude Code, Cursor) or with only a shell (Codex), so it
 * carries both columns.
 */
export function renderProjectSkill(options: { name?: string; surfaces?: SkillSurface[]; standalone?: boolean } = {}): string {
  const name = options.name ?? PROJECT_SKILL;
  const surfaces = options.surfaces ?? ["mcp", "shell"];
  const mcp = surfaces.includes("mcp");
  const shell = surfaces.includes("shell");
  const both = mcp && shell;
  const say = (tool: string, command: string) =>
    both ? `${tool} (or \`${command}\`)` : mcp ? tool : `\`${command}\``;

  const findProject = options.standalone
    ? `## 0. Find or create the project

- A folder with a \`project.json\` is a GenMotion project: work there and read its \`AGENTS.md\` (the scene rules) first.
- No project yet: create one with \`create_project\` (or \`npx genmotion init <folder> --yes\`; \`--size portrait\` for 9:16). A catalog template is \`list_templates\`, then \`create_project\` with \`template\`.

`
    : "";

  return `---
name: ${name}
description: Make or edit a video with GenMotion — launch videos, feature announcements, explainers, logo stings, app store previews, product walkthroughs, social ads, or anything custom — and render it to MP4. Use for any request to create, change, animate, preview or export a video.
---

# Making a video with GenMotion

${options.standalone ? "GenMotion videos are folders of scenes (Three.js by default) listed in `project.json`." : "This folder is a GenMotion project: `project.json` is the timeline, `scenes/` holds one scene per file, and `AGENTS.md` has the rules every scene must follow."} Every frame is a pure function of time, so the preview and the rendered MP4 are the same pictures.

${findProject}## 1. Pick the skill that owns this video

GenMotion ships a skill pack: one skill per kind of video, plus craft skills (camera, type, transitions, look) for the engine.

1. If \`VIDEO.md\` exists, it already names the skill. Load that one and carry on.
2. Otherwise read the router, \`${ROUTER_SKILL}\`${options.standalone ? "" : " (installed beside this skill)"}, for the rules, then search: ${say("`search_skills` with the user's own words", 'npx genmotion skills search "<request>" --json')}.
3. Pick **one** owner (a \`workflow\` or \`style\` result), ask only its missing \`askFirst\` questions, and write \`VIDEO.md\` as the router describes.
4. Read the owner and the requirements search lists for this engine: ${say("`get_skill`", "npx genmotion skills show <id>")}.${shell ? " `npx genmotion skills add <id>` also copies a skill and its requirements into this folder so later sessions have it." : ""}

## 2. Build

- ${say("`add_scene`", 'npx genmotion scene add "Hero" --duration 4s')} creates a scene file **and** registers it in \`project.json\`. Then write the builder. Delete the starter scene once you have your own.
- Remote images, fonts, recordings: ${say("`save_asset`", "download into assets/")} first, then import from \`assets/\`.

## 3. Verify, every time, before you say it's done

1. ${say("`check_project`", "npx genmotion check --json")}: compile, determinism rules, and a real headless render of each scene's first, middle and last frame. Fix every \`error\`, read every \`warning\`.
2. ${say("`capture_frames`", "npx genmotion still --at 1s --at 50% --json")}: **look at the frames**. A check that passes can still be an ugly frame.
3. The owner skill's own checklist.

## 4. Deliver

- A live preview for the user: \`npx genmotion dev --background\` prints the URL.
- The MP4, when asked or at the end: ${say("`render_video`", "npx genmotion render --json")} writes \`exports/<name>.mp4\`. Report the path and length.

## Capabilities

${capabilityTable(surfaces)}

## Don'ts

- No clocks: no \`THREE.Clock\`, \`setAnimationLoop\`, \`requestAnimationFrame\`, wall-clock time or unseeded randomness. Everything comes from the \`time\`/\`frame\`/\`progress\` your update callback receives.
- No hot-linked remote URLs in scene code.
- Never two owner skills at once.
`;
}

/**
 * Appended to a CLI-created project's AGENTS.md: the commands, their MCP
 * twins, and how skills are picked — the parts of the desktop app's own
 * prompt an agent outside it would otherwise never see.
 */
export const TERMINAL_SECTION = `
## Working from the terminal

Everything the GenMotion app does for this folder, the \`genmotion\` CLI does too.
Every command takes \`--json\` and prints exactly one JSON object.

| Step | Command | MCP tool (\`npx genmotion mcp\`, wired in \`.mcp.json\`) |
|---|---|---|
| Pick the skill for this kind of video | \`npx genmotion skills search "<request>" --json\` | \`search_skills\` |
| Read a skill | \`npx genmotion skills show <id>\` | \`get_skill\` |
| What's in the project | \`npx genmotion info --json\` | \`project_overview\` |
| Add a scene (file + manifest entry) | \`npx genmotion scene add "Hero" --duration 4s\` | \`add_scene\` |
| Validate scenes without rendering | \`npx genmotion check --static --json\` | \`validate_scene\` |
| Compile + determinism + headless render of every scene | \`npx genmotion check --json\` | \`check_project\` |
| Look at frames | \`npx genmotion still --at 1s --at 50%\` | \`capture_frames\` |
| Add an npm package | \`npm install --ignore-scripts <pkg>\` | \`add_package\` |
| Live preview for the user | \`npx genmotion dev --background\` | — |
| Final MP4 | \`npx genmotion render --json\` | \`render_video\` |

For a new video, start with the \`${PROJECT_SKILL}\` skill (\`.claude/skills/${PROJECT_SKILL}/\`): it picks the
video-type skill, and \`VIDEO.md\` records the choice. Don't call a video done
until \`check\` passes and you have looked at stills from every scene.
`;

export interface WireOptions {
  engine: ProjectEngine;
  /** Replace files that already exist (for `genmotion skills update`). */
  overwrite?: boolean;
}

/**
 * Writes the agent entry points into a project. Idempotent: an existing file
 * is left alone unless `overwrite` is set, and `.mcp.json` is merged rather
 * than replaced, so a user's other servers survive. The pack's router is
 * installed every time — it is what the project skill sends agents to.
 */
export async function wireAgents(projectDir: string, options: WireOptions): Promise<string[]> {
  const written: string[] = [];
  const put = async (relative: string, contents: string) => {
    const file = path.join(projectDir, relative);
    const existing = await fs.readFile(file, "utf8").catch(() => null);
    if (existing !== null && (!options.overwrite || existing === contents)) return;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, contents, "utf8");
    written.push(relative);
  };

  await put("CLAUDE.md", renderClaudeMd());
  for (const root of SKILL_ROOTS) await put(`${root}/${PROJECT_SKILL}/SKILL.md`, renderProjectSkill());
  const routerInstalled = await fs.stat(path.join(projectDir, SKILL_ROOTS[0], ROUTER_SKILL)).then(() => true, () => false);
  if (!routerInstalled || options.overwrite) {
    await installSkills(projectDir, [ROUTER_SKILL], options.engine);
    written.push(...SKILL_ROOTS.map((root) => `${root}/${ROUTER_SKILL}/`));
  }
  for (const file of [".mcp.json", ".cursor/mcp.json"]) {
    if (await mergeMcpConfig(path.join(projectDir, file))) written.push(file);
  }

  if (await unignoreSkills(projectDir)) written.push(".gitignore");

  const agentsFile = path.join(projectDir, "AGENTS.md");
  const agents = await fs.readFile(agentsFile, "utf8").catch(() => null);
  if (agents !== null && options.engine !== "hyperframes") {
    const at = agents.indexOf("\n## Working from the terminal");
    const base = at === -1 ? agents.trimEnd() : agents.slice(0, at).trimEnd();
    const next = `${base}\n${TERMINAL_SECTION}`;
    if (at === -1 || (options.overwrite && next !== agents)) {
      await fs.writeFile(agentsFile, next, "utf8");
      written.push("AGENTS.md");
    }
  }
  return written;
}

async function mergeMcpConfig(file: string): Promise<boolean> {
  const wanted = JSON.parse(renderMcpJson()) as { mcpServers: Record<string, unknown> };
  const raw = await fs.readFile(file, "utf8").catch(() => null);
  let config: { mcpServers?: Record<string, unknown> } = {};
  if (raw !== null) {
    try {
      config = JSON.parse(raw) as typeof config;
    } catch {
      // A config we can't parse is the user's to fix; don't clobber it.
      return false;
    }
    if (config.mcpServers?.[MCP_SERVER_NAME]) return false;
  }
  config.mcpServers = { ...config.mcpServers, ...wanted.mcpServers };
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return true;
}

/**
 * The scaffold's `.gitignore` excludes `.agents/`, where the desktop app
 * symlinks machine-specific skills for Codex. Skills the CLI installs are real
 * files that belong in the repo, so `.agents/skills/` is let back in.
 */
const UNIGNORE_SKILLS = [".agents/*", "!.agents/skills/"];

async function unignoreSkills(projectDir: string): Promise<boolean> {
  const file = path.join(projectDir, ".gitignore");
  const text = await fs.readFile(file, "utf8").catch(() => null);
  if (text === null) return false;
  const lines = text.split("\n");
  const at = lines.findIndex((line) => line.trim() === ".agents/" || line.trim() === ".agents");
  if (at === -1) return false;
  lines.splice(at, 1, ...UNIGNORE_SKILLS);
  await fs.writeFile(file, lines.join("\n"), "utf8");
  return true;
}
