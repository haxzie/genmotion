import os from "node:os";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readManifest } from "@genmotion/project";
import { ensureFfmpeg, findChromium, installChromium, launchBrowser } from "@genmotion/render";
import { runMcpServer } from "../mcp";
import { wireAgents } from "../agents";
import { listTemplates } from "../templates";
import { resolveProjectDir } from "../project-dir";
import { CliError, bold, dim, green, red, yellow } from "../output";
import { str, type Command } from "../command";
import { VERSION } from "../version";

export const mcp: Command = {
  name: "mcp",
  summary: "Run the MCP server (stdio) that gives coding agents GenMotion's tools",
  help: `Usage: genmotion mcp [--dir <project>]

Speaks MCP over stdio. New projects already carry the config (.mcp.json,
.cursor/mcp.json). To add it by hand:

  Claude Code   claude mcp add genmotion -- npx -y genmotion mcp
  Codex         codex mcp add genmotion -- npx -y genmotion mcp
  Any client    { "command": "npx", "args": ["-y", "genmotion", "mcp"] }

Tools: project_overview, create_project, add_scene, validate_scene,
check_project, capture_frames, render_video, save_asset, add_package,
get_guide, list_templates.`,
  options: {},
  async run({ values }) {
    await runMcpServer({ dir: str(values.dir) });
  },
};

export const skills: Command = {
  name: "skills",
  summary: "Add or refresh agent wiring (AGENTS.md, CLAUDE.md, skills, .mcp.json)",
  help: `Usage: genmotion skills <add|update> [--json]

  add      Write any missing agent files into the project
  update   Rewrite them to this CLI version's copy`,
  options: {},
  async run({ values, positionals, out }) {
    const action = positionals[0] ?? "add";
    if (action !== "add" && action !== "update") throw new CliError(`Unknown action "${action}"`, { fix: "npx genmotion skills add" });
    const projectDir = resolveProjectDir(str(values.dir));
    const manifest = await readManifest(projectDir);
    const written = await wireAgents(projectDir, { engine: manifest.engine, overwrite: action === "update" });
    out.result({ written }, written.length ? written.map((f) => `${green("✓")} ${f}`).join("\n") : "Already up to date");
  },
};

export const templates: Command = {
  name: "templates",
  summary: "List starter templates",
  help: `Usage: genmotion templates [--json]

Start from one with: npx genmotion init my-video --template <id>`,
  options: {},
  async run({ out }) {
    const list = await listTemplates();
    out.result(
      { templates: list },
      list.map((t) => `${bold(t.id.padEnd(40))} ${dim(t.title)}`).join("\n") + `\n\n${dim("npx genmotion init my-video --template <id>")}`,
    );
  },
};

export const browser: Command = {
  name: "browser",
  summary: "Install or locate the headless Chromium used for rendering",
  help: `Usage: genmotion browser <install|path> [--json]

  install   Download Chromium's headless shell (~100MB, once per machine)
  path      Print which browser renders will use

GENMOTION_CHROMIUM=/path/to/chrome overrides the choice.`,
  options: {},
  async run({ positionals, out }) {
    const action = positionals[0] ?? "path";
    if (action === "path") {
      const found = findChromium();
      if (!found.path) throw new CliError("No Chromium found", { fix: "npx genmotion browser install" });
      out.result({ path: found.path }, found.path);
      return;
    }
    if (action !== "install") throw new CliError(`Unknown action "${action}"`, { fix: "npx genmotion browser install" });
    out.info("Downloading Chromium headless shell…");
    const installed = await installChromium().catch((err: Error) => {
      throw new CliError(err.message, { fix: "Set GENMOTION_CHROMIUM to an installed Chrome instead" });
    });
    if (!installed) throw new CliError("Chromium downloaded but can't be found", { fix: "npx genmotion doctor" });
    out.result({ path: installed }, `${green("✓")} ${installed}`);
  },
};

export const doctor: Command = {
  name: "doctor",
  summary: "Check this machine can preview and render",
  help: "Usage: genmotion doctor [--json]",
  options: {},
  async run({ out }) {
    const checks: { name: string; ok: boolean; detail: string; fix?: string }[] = [];
    const major = Number(process.versions.node.split(".")[0]);
    checks.push({ name: "node", ok: major >= 22, detail: process.versions.node, fix: major >= 22 ? undefined : "Install Node 22 or newer" });

    const ff = await ensureFfmpeg();
    const ffOk = (ff !== "ffmpeg" && existsSync(ff)) || spawnSync(ff, ["-version"]).status === 0;
    checks.push({ name: "ffmpeg", ok: ffOk, detail: ff, fix: ffOk ? undefined : "Reinstall genmotion, or set FFMPEG_PATH" });

    const chromium = findChromium();
    checks.push({
      name: "chromium",
      ok: chromium.path !== null,
      detail: chromium.path ?? "not found",
      fix: chromium.path ? undefined : "npx genmotion browser install",
    });

    if (chromium.path) {
      let webgl = "unavailable";
      try {
        const b = await launchBrowser();
        const page = await b.newPage();
        webgl = await page.evaluate(() => {
          const gl = document.createElement("canvas").getContext("webgl2");
          if (!gl) return "unavailable";
          const ext = gl.getExtension("WEBGL_debug_renderer_info");
          return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "webgl2";
        });
        await b.close();
      } catch (err) {
        webgl = `launch failed: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`;
      }
      checks.push({ name: "webgl", ok: webgl !== "unavailable" && !webgl.startsWith("launch failed"), detail: webgl });
    }
    checks.push({ name: "platform", ok: true, detail: `${os.platform()} ${os.arch()} · ${os.cpus().length} cores · genmotion ${VERSION}` });

    const ok = checks.every((c) => c.ok);
    out.result(
      { healthy: ok, checks },
      checks
        .map((c) => `${c.ok ? green("✓") : red("✗")} ${c.name.padEnd(9)} ${dim(c.detail)}${c.fix ? `\n  ${yellow("fix:")} ${c.fix}` : ""}`)
        .join("\n"),
    );
    return ok ? 0 : 1;
  },
};
