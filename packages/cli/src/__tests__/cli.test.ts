import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { parseSize } from "../commands/init";

/**
 * The CLI as an agent drives it: a real process, `--json` on, one JSON object
 * back. Nothing here launches a browser, so it runs anywhere CI does; the
 * render path has its own coverage through `@genmotion/render`.
 */
const BIN = fileURLToPath(new URL("../../bin/genmotion.js", import.meta.url));
let tmp: string;

function gm(args: string[], cwd = tmp): { code: number; json: Record<string, any>; stderr: string } {
  const result = spawnSync(process.execPath, [BIN, ...args, "--json"], { cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", GENMOTION_FROM_SOURCE: "1" } });
  let json: Record<string, any> = {};
  try {
    json = JSON.parse(result.stdout);
  } catch {
    throw new Error(`stdout was not one JSON object:\n${result.stdout}\n${result.stderr}`);
  }
  return { code: result.status ?? 1, json, stderr: result.stderr };
}

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "genmotion-cli-"));
});

afterAll(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("parseSize", () => {
  it("knows the named sizes and WxH", () => {
    expect(parseSize("portrait")).toEqual([1080, 1920]);
    expect(parseSize("1280x720")).toEqual([1280, 720]);
    expect(parseSize("640×480")).toEqual([640, 480]);
    expect(() => parseSize("big")).toThrow(/Can't read size/);
  });
});

describe("genmotion --json", () => {
  it("init scaffolds a Three.js project wired for agents", async () => {
    const { code, json } = gm(["init", "video", "--yes", "--size", "square", "--fps", "24"]);
    expect(code).toBe(0);
    expect(json).toMatchObject({ ok: true, engine: "three", width: 1080, height: 1080, fps: 24 });
    const dir = path.join(tmp, "video");
    for (const file of ["AGENTS.md", "CLAUDE.md", ".mcp.json", ".cursor/mcp.json", ".claude/skills/genmotion/SKILL.md", ".agents/skills/genmotion/SKILL.md", "scenes/01-intro.ts"]) {
      await expect(fs.stat(path.join(dir, file))).resolves.toBeTruthy();
    }
    const pkg = JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf8"));
    expect(pkg.scripts).toMatchObject({ dev: "genmotion dev", render: "genmotion render", check: "genmotion check" });
    expect(pkg.devDependencies.genmotion).toBeDefined();
    const agents = await fs.readFile(path.join(dir, "AGENTS.md"), "utf8");
    expect(agents).toContain("## Working from the terminal");
    expect(agents).toContain("# What a scene is"); // the authoring guide is embedded
    const mcp = JSON.parse(await fs.readFile(path.join(dir, ".mcp.json"), "utf8"));
    expect(mcp.mcpServers.genmotion.args).toEqual(["-y", "genmotion", "mcp"]);
  });

  it("refuses a folder that already has files in it", () => {
    const { code, json } = gm(["init", "video", "--yes"]);
    expect(code).toBe(1);
    expect(json.ok).toBe(false);
    expect(json.error.fix).toContain("genmotion init");
  });

  it("scene add writes the file and registers it", async () => {
    const dir = path.join(tmp, "video");
    const { json } = gm(["scene", "add", "Hero", "reveal", "--duration", "2s"], dir);
    expect(json).toMatchObject({ ok: true, file: "scenes/02-hero-reveal.ts", durationInFrames: 48, index: 1 });
    const manifest = JSON.parse(await fs.readFile(path.join(dir, "project.json"), "utf8"));
    expect(manifest.scenes.map((s: { file: string }) => s.file)).toEqual(["scenes/01-intro.ts", "scenes/02-hero-reveal.ts"]);
  });

  it("info reports timing from the nearest project, even from a subfolder", () => {
    const { json } = gm(["info"], path.join(tmp, "video", "scenes"));
    expect(json.totalFrames).toBe(24 * 5 + 48);
    expect(json.scenes[1]).toMatchObject({ name: "Hero reveal", startFrame: 120, durationInFrames: 48, exists: true });
  });

  it("check --static passes a fresh project", () => {
    const { code, json } = gm(["check", "--static"], path.join(tmp, "video"));
    expect(code).toBe(0);
    expect(json.ok).toBe(true);
    expect(json.findings.filter((f: { level: string }) => f.level === "error")).toEqual([]);
  });

  it("check --static catches a clock", async () => {
    const dir = path.join(tmp, "video");
    const file = path.join(dir, "scenes", "02-hero-reveal.ts");
    const source = await fs.readFile(file, "utf8");
    await fs.writeFile(file, source.replace("time * 0.4", "Date.now()"));
    const { code, json } = gm(["check", "--static"], dir);
    await fs.writeFile(file, source);
    expect(code).toBe(1);
    expect(json.findings.find((f: { level: string }) => f.level === "error")).toMatchObject({
      rule: "determinism",
      file: "scenes/02-hero-reveal.ts",
    });
  });

  it("explains being outside a project", () => {
    const { code, json } = gm(["info"], os.tmpdir());
    expect(code).toBe(1);
    expect(json.error.fix).toContain("genmotion init");
  });
});

describe("genmotion mcp", () => {
  it("lists its tools and answers project_overview over stdio", async () => {
    const client = new Client({ name: "test", version: "0" });
    await client.connect(
      new StdioClientTransport({ command: process.execPath, args: [BIN, "mcp"], cwd: path.join(tmp, "video"), env: { ...process.env, GENMOTION_FROM_SOURCE: "1" } as Record<string, string> }),
    );
    try {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name)).toEqual(
        expect.arrayContaining(["project_overview", "add_scene", "validate_scene", "check_project", "capture_frames", "render_video", "save_asset", "get_guide"]),
      );
      const overview = await client.callTool({ name: "project_overview", arguments: {} });
      const body = JSON.parse((overview.content as { text: string }[])[0]!.text);
      expect(body.engine).toBe("three");
      const invalid = await client.callTool({ name: "add_scene", arguments: { name: "x", after: "no-such-scene" } });
      expect(invalid.isError).toBe(true);
    } finally {
      await client.close();
    }
  });
});
