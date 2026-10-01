import os from "node:os";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readManifest } from "@genmotion/project";
import { ensureFfmpeg, findChromium, installChromium, launchBrowser } from "@genmotion/render";
import { runMcpServer } from "../mcp";
import { wireAgents } from "../agents";
import { installSkills, installedSkills, listPack, readSkill, searchPack } from "../skills";
import { SKILL_KINDS, type SkillKind } from "@genmotion/shared";
import { listTemplates } from "../templates";
import { resolveProjectDir } from "../project-dir";
import { CliError, bold, dim, green, red, yellow } from "../output";
import { num, str, type Command } from "../command";
import { VERSION } from "../version";
import { desktopAppVersion, findDesktopApp, isLegacyLauncher } from "../desktop";

export const mcp: Command = {
  name: "mcp",
  summary: "Run the MCP server (stdio) that gives coding agents GenMotion's tools",
  help: `Usage: genmotion mcp [--dir <project>]

Speaks MCP over stdio. New projects already carry the config (.mcp.json,
.cursor/mcp.json). To add it by hand:

  Claude Code   claude mcp add genmotion -- npx -y @genmotion/cli mcp
  Codex         codex mcp add genmotion -- npx -y @genmotion/cli mcp
  Any client    { "command": "npx", "args": ["-y", "@genmotion/cli", "mcp"] }

Tools: search_skills, get_skill, project_overview, create_project,
add_scene, validate_scene, check_project, capture_frames, render_video,
save_asset, add_package, get_guide, list_templates.`,
  options: {},
  async run({ values }) {
    await runMcpServer({ dir: str(values.dir) });
  },
};

export const skills: Command = {
  name: "skills",
  summary: "Find, read and install video-type skills; wire agent files",
  help: `Usage: genmotion skills <list|search|show|add|update> [options]

GenMotion's skill pack: one skill per kind of video (launch, feature
announcement, milestone, explainer, logo sting, app store preview, walkthrough,
UGC ad formats, freeform) plus craft skills for the engine (camera, type,
transitions, assets, look).

  list                     Every skill, with its kind and what it delivers
  search "<request>"       Rank the pack against a request (--kind workflow|style|technique|reference)
  show <id> [file]         Print a skill's SKILL.md, or one of its reference files
  add [<id>...]            Install skills (and what they require) into this project
                           for Claude Code and Codex. With no ids, write the agent
                           files: CLAUDE.md, .mcp.json, the router and project skill
  update                   Rewrite the agent files and refresh installed skills

Options
  --kind <kind>    search/list: only this kind
  --limit <n>      search: how many (default 5)
  --json`,
  options: {
    kind: { type: "string" },
    limit: { type: "string" },
  },
  async run({ values, positionals, out }) {
    const [action = "add", ...args] = positionals;
    const kindText = str(values.kind);
    if (kindText && !(SKILL_KINDS as readonly string[]).includes(kindText)) {
      throw new CliError(`Unknown kind "${kindText}"`, { fix: `--kind ${SKILL_KINDS.join("|")}` });
    }
    const kind = kindText as SkillKind | undefined;
    const engine = await engineHere(str(values.dir));

    if (action === "list") {
      const list = listPack("shell", engine).filter((s) => !kind || s.kind === kind);
      out.result(
        { engine: engine ?? null, skills: list },
        list.map((s) => `${bold(s.id.padEnd(22))} ${dim(s.kind.padEnd(9))} ${s.route?.deliverable ?? s.summary}`).join("\n"),
      );
      return;
    }
    if (action === "search") {
      const query = args.join(" ").trim();
      if (!query) throw new CliError("What is the video?", { fix: 'npx @genmotion/cli skills search "launch video for my app"' });
      const results = searchPack({ query, kind, engine, limit: num(values.limit, "limit") ?? 5, surface: "shell" });
      out.result(
        { engine: engine ?? null, query, results },
        results
          .map((r) => {
            const missing = r.requires.filter((q) => !q.available && q.kind === "capability").map((q) => q.id);
            return `${bold(r.id)} ${dim(`${r.kind} · ${r.category}`)}\n  ${r.route?.deliverable ?? r.summary}${
              missing.length ? `\n  ${yellow("not here:")} ${missing.join(", ")}` : ""
            }`;
          })
          .join("\n") + `\n\n${dim("Read one: npx @genmotion/cli skills show <id>")}`,
      );
      return;
    }
    if (action === "show") {
      const [id, file] = args;
      if (!id) throw new CliError("Which skill?", { fix: "npx @genmotion/cli skills list" });
      const skill = await readSkill(id, file);
      out.result({ ...skill }, `${skill.text}${skill.references.length && !file ? `\n---\n${dim(`references: ${skill.references.join(", ")}`)}` : ""}`);
      return;
    }
    if (action !== "add" && action !== "update") {
      throw new CliError(`Unknown action "${action}"`, { fix: "npx @genmotion/cli skills --help" });
    }

    const projectDir = resolveProjectDir(str(values.dir));
    const manifest = await readManifest(projectDir);
    const written = await wireAgents(projectDir, { engine: manifest.engine, overwrite: action === "update" });
    const wanted = action === "update" ? await installedSkills(projectDir) : args;
    const installed = wanted.length ? await installSkills(projectDir, wanted, manifest.engine) : [];
    out.result(
      { written, installed },
      [...written.map((f) => `${green("✓")} ${f}`), ...installed.map((id) => `${green("✓")} skill ${bold(id)}`)].join("\n") ||
        "Already up to date",
    );
  },
};

/** The current project's engine, if there is a project here. */
async function engineHere(dir: string | undefined): Promise<string | undefined> {
  try {
    return (await readManifest(resolveProjectDir(dir))).engine;
  } catch {
    return undefined;
  }
}

export const templates: Command = {
  name: "templates",
  summary: "List starter templates",
  help: `Usage: genmotion templates [--json]

Start from one with: npx @genmotion/cli init my-video --template <id>`,
  options: {},
  async run({ out }) {
    const list = await listTemplates();
    out.result(
      { templates: list },
      list.map((t) => `${bold(t.id.padEnd(40))} ${dim(t.title)}`).join("\n") + `\n\n${dim("npx @genmotion/cli init my-video --template <id>")}`,
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
      if (!found.path) throw new CliError("No Chromium found", { fix: "npx @genmotion/cli browser install" });
      out.result({ path: found.path }, found.path);
      return;
    }
    if (action !== "install") throw new CliError(`Unknown action "${action}"`, { fix: "npx @genmotion/cli browser install" });
    out.info("Downloading Chromium headless shell…");
    const installed = await installChromium().catch((err: Error) => {
      throw new CliError(err.message, { fix: "Set GENMOTION_CHROMIUM to an installed Chrome instead" });
    });
    if (!installed) throw new CliError("Chromium downloaded but can't be found", { fix: "npx @genmotion/cli doctor" });
    out.result({ path: installed }, `${green("✓")} ${installed}`);
  },
};

export const doctor: Command = {
  name: "doctor",
  summary: "Check this machine can preview and render",
  help: "Usage: genmotion doctor [--json]",
  options: {},
  async run({ out }) {
    // `warn` is worth fixing but doesn't stop a render, so it doesn't fail doctor.
    const checks: { name: string; ok: boolean; warn?: boolean; detail: string; fix?: string }[] = [];
    const major = Number(process.versions.node.split(".")[0]);
    checks.push({ name: "node", ok: major >= 22, detail: process.versions.node, fix: major >= 22 ? undefined : "Install Node 22 or newer" });

    const ff = await ensureFfmpeg();
    const ffOk = (ff !== "ffmpeg" && existsSync(ff)) || spawnSync(ff, ["-version"]).status === 0;
    checks.push({ name: "ffmpeg", ok: ffOk, detail: ff, fix: ffOk ? undefined : "Reinstall @genmotion/cli, or set FFMPEG_PATH" });

    const chromium = findChromium();
    checks.push({
      name: "chromium",
      ok: chromium.path !== null,
      detail: chromium.path ?? "not found",
      fix: chromium.path ? undefined : "npx @genmotion/cli browser install",
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

    const appVersion = desktopAppVersion();
    checks.push({ name: "app", ok: true, detail: findDesktopApp() ? `GenMotion ${appVersion ?? "installed"}` : "not installed (optional)" });

    // Every `genmotion` on PATH, first one first: that one is what a shell
    // runs. A launcher script from an older app ahead of this package would
    // answer instead of it.
    if (process.platform !== "win32") {
      const found = spawnSync("which", ["-a", "genmotion"], { encoding: "utf8" });
      const onPath = [...new Set((found.stdout ?? "").split("\n").map((l) => l.trim()).filter(Boolean))];
      const legacy = onPath.filter(isLegacyLauncher);
      checks.push({
        name: "command",
        ok: true,
        warn: legacy.length > 0,
        detail: onPath.length
          ? onPath.map((p) => (isLegacyLauncher(p) ? `${p} (old app launcher)` : p)).join(", ")
          : "not on PATH (npx @genmotion/cli works without it)",
        fix: legacy.length ? "genmotion upgrade, or npm install -g @genmotion/cli" : undefined,
      });
    }

    const ok = checks.every((c) => c.ok);
    out.result(
      { healthy: ok, checks },
      checks
        .map((c) => `${!c.ok ? red("✗") : c.warn ? yellow("!") : green("✓")} ${c.name.padEnd(9)} ${dim(c.detail)}${c.fix ? `\n  ${yellow("fix:")} ${c.fix}` : ""}`)
        .join("\n"),
    );
    return ok ? 0 : 1;
  },
};

const INSTALL_URL = "https://genmotion.dev/install.sh";

/** The globally installed `genmotion` version, as npm reports it. */
function globalCliVersion(): string | null {
  const ls = spawnSync("npm", ["ls", "-g", "@genmotion/cli", "--depth=0", "--json"], { encoding: "utf8", shell: process.platform === "win32" });
  try {
    return (JSON.parse(ls.stdout) as { dependencies?: Record<string, { version?: string }> }).dependencies?.["@genmotion/cli"]?.version ?? null;
  } catch {
    return null;
  }
}

export const upgrade: Command = {
  name: "upgrade",
  summary: "Update the genmotion command, and the GenMotion app when it's installed",
  help: `Usage: genmotion upgrade [--json]

With the GenMotion app installed (macOS), runs the app's installer, which
updates the app and this command together. Otherwise runs
npm install -g @genmotion/cli@latest.

In a project, the project's own copy is in package.json:
  npm install @genmotion/cli@latest`,
  options: {},
  async run({ out }) {
    const app = process.platform === "darwin" ? findDesktopApp() : null;
    const before = { app: desktopAppVersion(app), cli: globalCliVersion() };
    // Under --json the child's output goes to stderr: stdout is the one JSON object.
    const stdio: ("inherit" | number)[] = ["inherit", out.json ? 2 : "inherit", "inherit"];

    const ran = app
      ? (out.info("Updating GenMotion and the genmotion command…"),
        spawnSync("/bin/sh", ["-c", `curl -fsSL ${INSTALL_URL} | sh`], { stdio }))
      : (out.info("Updating the genmotion command…"),
        spawnSync("npm", ["install", "-g", "@genmotion/cli@latest"], { stdio, shell: process.platform === "win32" }));
    if (ran.status !== 0) {
      throw new CliError(app ? "The GenMotion installer failed" : "npm install -g @genmotion/cli@latest failed", {
        fix: app ? `curl -fsSL ${INSTALL_URL} | sh` : "npm install -g @genmotion/cli@latest",
      });
    }

    const after = { app: desktopAppVersion(app), cli: globalCliVersion() };
    const line = (name: string, a: string | null, b: string | null) =>
      `${green("✓")} ${name.padEnd(9)} ${a && a !== b ? `${dim(a)} → ` : ""}${b ?? dim("not installed")}`;
    out.result(
      { app: app ? { before: before.app, after: after.app } : null, cli: { before: before.cli, after: after.cli } },
      [...(app ? [line("app", before.app, after.app)] : []), line("genmotion", before.cli, after.cli)].join("\n"),
    );
  },
};
