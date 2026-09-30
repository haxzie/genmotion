import path from "node:path";
import fs from "node:fs/promises";
import {
  SKILL_PATHS,
  renderClaudeMd,
  renderGenmotionSkill,
  renderMcpJson,
  type ProjectEngine,
} from "@genmotion/project";
import { THREE_AUTHORING_GUIDE } from "@genmotion/ai/three-guide";

export { THREE_AUTHORING_GUIDE };

/**
 * Appended to a CLI-created project's AGENTS.md. The scaffold's own text
 * names tools (`validate_scene`, `capture_frames`, `save_asset`,
 * `add_package`) that the desktop app provides in-process; this says where the
 * same tools come from when there is no app — the `genmotion` MCP server — and
 * gives the shell equivalent of each for agents without MCP.
 */
export const TERMINAL_SECTION = `
## Working from the terminal

Everything the GenMotion app does for this folder, the \`genmotion\` CLI does too.
Every command takes \`--json\` and prints exactly one JSON object.

| Step | Command | MCP tool (\`npx genmotion mcp\`, wired in \`.mcp.json\`) |
|---|---|---|
| What's in the project | \`npx genmotion info --json\` | \`project_overview\` |
| Add a scene (file + manifest entry) | \`npx genmotion scene add "Hero" --duration 4s\` | \`add_scene\` |
| Validate one scene | \`npx genmotion check --static --json\` | \`validate_scene\` |
| Compile + determinism + headless render of every scene | \`npx genmotion check --json\` | \`check_project\` |
| Look at frames | \`npx genmotion still --at 1s --at 50%\` | \`capture_frames\` |
| Copy a remote file into \`assets/\` | \`curl -L -o assets/x.png <url>\` | \`save_asset\` |
| Add an npm package | \`npm install --ignore-scripts <pkg>\` | \`add_package\` |
| Live preview for the user | \`npx genmotion dev --background\` | — |
| Final MP4 | \`npx genmotion render --json\` | \`render_video\` |

Don't call a video done until \`check\` passes and you have looked at stills
from every scene.
`;

export interface WireOptions {
  engine: ProjectEngine;
  /** Replace files that already exist (for `genmotion skills update`). */
  overwrite?: boolean;
}

/**
 * Writes the agent entry points into a project. Idempotent: an existing file
 * is left alone unless `overwrite` is set, and `.mcp.json` is merged rather
 * than replaced, so a user's other servers survive.
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
  for (const file of SKILL_PATHS) await put(file, renderGenmotionSkill());
  for (const file of [".mcp.json", ".cursor/mcp.json"]) {
    if (await mergeMcpConfig(path.join(projectDir, file))) written.push(file);
  }

  if (await unignoreSkill(projectDir)) written.push(".gitignore");

  const agentsFile = path.join(projectDir, "AGENTS.md");
  const agents = await fs.readFile(agentsFile, "utf8").catch(() => null);
  if (agents !== null && !agents.includes("## Working from the terminal") && options.engine !== "hyperframes") {
    await fs.writeFile(agentsFile, `${agents.trimEnd()}\n${TERMINAL_SECTION}`, "utf8");
    written.push("AGENTS.md");
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
    if (config.mcpServers?.genmotion) return false;
  }
  config.mcpServers = { ...config.mcpServers, ...wanted.mcpServers };
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return true;
}

/**
 * The scaffold's `.gitignore` excludes `.agents/`, where the desktop app
 * symlinks machine-specific skills for Codex. The skill written here is a real
 * file that belongs in the repo, so only its own folder is let back in.
 */
const UNIGNORE_SKILL = [".agents/*", "!.agents/skills/", ".agents/skills/*", "!.agents/skills/genmotion/"];

async function unignoreSkill(projectDir: string): Promise<boolean> {
  const file = path.join(projectDir, ".gitignore");
  const text = await fs.readFile(file, "utf8").catch(() => null);
  if (text === null) return false;
  const lines = text.split("\n");
  const at = lines.findIndex((line) => line.trim() === ".agents/" || line.trim() === ".agents");
  if (at === -1) return false;
  lines.splice(at, 1, ...UNIGNORE_SKILL);
  await fs.writeFile(file, lines.join("\n"), "utf8");
  return true;
}
