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
    for (const file of [
      "AGENTS.md",
      "CLAUDE.md",
      ".mcp.json",
      ".cursor/mcp.json",
      ".claude/skills/genmotion/SKILL.md",
      ".agents/skills/genmotion/SKILL.md",
      ".claude/skills/genmotion-skills/SKILL.md",
      ".agents/skills/genmotion-skills/SKILL.md",
      "scenes/01-intro.ts",
    ]) {
      await expect(fs.stat(path.join(dir, file))).resolves.toBeTruthy();
    }
    const pkg = JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf8"));
    expect(pkg.scripts).toMatchObject({ dev: "genmotion dev", render: "genmotion render", check: "genmotion check" });
    expect(pkg.devDependencies["@genmotion/cli"]).toBeDefined();
    const agents = await fs.readFile(path.join(dir, "AGENTS.md"), "utf8");
    expect(agents).toContain("## Working from the terminal");
    expect(agents).toContain("# What a scene is"); // the authoring guide is embedded
    const mcp = JSON.parse(await fs.readFile(path.join(dir, ".mcp.json"), "utf8"));
    expect(mcp.mcpServers.genmotion.args).toEqual(["-y", "@genmotion/cli", "mcp"]);
  });

  it("a remix pins the project to this CLI's line, like init does", async () => {
    const template = fileURLToPath(new URL("../../../templates/catalog/x-numbers-launch-video", import.meta.url));
    const { code } = gm(["init", "remix", "--template", template, "--yes"]);
    expect(code).toBe(0);
    const pkg = JSON.parse(await fs.readFile(path.join(tmp, "remix", "package.json"), "utf8"));
    const ours = JSON.parse(await fs.readFile(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"));
    // An older pin installs an older studio: 0.2.x has no audio.
    expect(pkg.devDependencies["@genmotion/cli"]).toBe(`^${ours.version.split(".").slice(0, 2).join(".")}.0`);
  }, 60_000);

  it("refuses a folder that already has files in it", () => {
    const { code, json } = gm(["init", "video", "--yes"]);
    expect(code).toBe(1);
    expect(json.ok).toBe(false);
    expect(json.error.fix).toContain("@genmotion/cli init");
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

  it("audio add/set/list/remove edit the timeline in project.json", async () => {
    const dir = path.join(tmp, "video");
    await fs.mkdir(path.join(dir, "assets"), { recursive: true });
    await fs.writeFile(path.join(dir, "assets", "music.mp3"), "");
    const added = gm(["audio", "add", "assets/music.mp3", "--at", "1s", "--duration", "3s", "--fade-out", "0.5s", "--name", "Music"], dir);
    expect(added.json).toMatchObject({ ok: true, clip: { file: "assets/music.mp3", track: 0, startFrame: 24, durationInFrames: 72, fadeOutFrames: 12, name: "Music" } });
    const set = gm(["audio", "set", "Music", "--volume", "0.5", "--mute"], dir);
    expect(set.json).toMatchObject({ ok: true, clip: { volume: 0.5, muted: true, startFrame: 24 } });
    expect(gm(["audio", "set", "Music", "--volume", "9"], dir).json.ok).toBe(false);
    const list = gm(["audio", "list"], dir);
    expect(list.json.audio).toHaveLength(1);
    expect(gm(["info"], dir).json.audio[0]).toMatchObject({ name: "Music", track: 0, fadeOutFrames: 12, muted: true });
    expect(gm(["audio", "remove", "Music"], dir).json).toMatchObject({ ok: true, removed: { name: "Music" } });
    expect(gm(["audio", "remove", "Music"], dir).json.ok).toBe(false);
  }, 60_000);

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

  it("skills search routes a request to the skill that owns it", () => {
    const dir = path.join(tmp, "video");
    const cases: [string, string][] = [
      ["launch video for my new app", "launch-playbook"],
      ["explain how our sync engine works", "explainer"],
      ["logo animation for our brand", "brand-sting"],
      ["we hit 10k github stars", "announce-milestone"],
      ["a birthday video for my friend", "freeform-video"],
    ];
    for (const [query, owner] of cases) {
      const { json } = gm(["skills", "search", query], dir);
      // The owner is the first result that can own a video.
      const first = json.results.find((r: { kind: string }) => r.kind === "workflow" || r.kind === "style");
      expect(first?.id, query).toBe(owner);
      expect(first.route.deliverable).toBeTruthy();
      expect(gm(["skills", "search", query, "--kind", first.kind], dir).json.results[0].id, `${query} --kind`).toBe(owner);
    }
  }, 60_000);

  it("skills search says what this surface can't do, and what to do instead", () => {
    const { json } = gm(["skills", "search", "launch video for my new app"], path.join(tmp, "video"));
    const launch = json.results.find((r: { id: string }) => r.id === "launch-playbook");
    const voice = launch.requires.find((r: { id: string }) => r.id === "voiceover");
    expect(voice).toMatchObject({ available: false });
    expect(voice.instead).toBeTruthy();
    // Three.js craft is listed for a three project; HyperFrames' own skills are not.
    const skillIds = launch.requires.filter((r: { kind: string }) => r.kind === "skill").map((r: { id: string }) => r.id);
    expect(skillIds).toContain("three-look");
    expect(skillIds.some((id: string) => id.startsWith("hyperframes-"))).toBe(false);
  });

  it("skills show prints a skill and its reference files", () => {
    const { json } = gm(["skills", "show", "ugc-hooks"], path.join(tmp, "video"));
    expect(json.text).toContain("name: ugc-hooks");
    expect(json.references).toContain("references/hook-library.md");
    const ref = gm(["skills", "show", "ugc-hooks", "references/hook-library.md"], path.join(tmp, "video")).json;
    expect(ref.file).toBe("references/hook-library.md");
    expect(gm(["skills", "show", "ugc-hooks", "../../etc/passwd"], path.join(tmp, "video")).json.ok).toBe(false);
  }, 60_000);

  it("skills add installs a skill with what it requires for this engine", async () => {
    const dir = path.join(tmp, "video");
    const { json } = gm(["skills", "add", "brand-sting"], dir);
    expect(json.installed).toEqual(expect.arrayContaining(["brand-sting", "three-look", "three-camera", "three-assets"]));
    for (const root of [".claude/skills", ".agents/skills"]) {
      await expect(fs.stat(path.join(dir, root, "brand-sting", "SKILL.md"))).resolves.toBeTruthy();
      await expect(fs.stat(path.join(dir, root, "hyperframes-keyframes"))).rejects.toThrow();
    }
    expect(await fs.readFile(path.join(dir, ".gitignore"), "utf8")).toContain("!.agents/skills/");
  });

  it("explains being outside a project", () => {
    const { code, json } = gm(["info"], os.tmpdir());
    expect(code).toBe(1);
    expect(json.error.fix).toContain("@genmotion/cli init");
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
        expect.arrayContaining([
          "project_overview",
          "add_scene",
          "validate_scene",
          "check_project",
          "capture_frames",
          "render_video",
          "save_asset",
          "add_audio",
          "update_audio",
          "remove_audio",
          "get_guide",
          "search_skills",
          "get_skill",
        ]),
      );
      const overview = await client.callTool({ name: "project_overview", arguments: {} });
      const body = JSON.parse((overview.content as { text: string }[])[0]!.text);
      expect(body.engine).toBe("three");
      const invalid = await client.callTool({ name: "add_scene", arguments: { name: "x", after: "no-such-scene" } });
      expect(invalid.isError).toBe(true);

      const search = await client.callTool({ name: "search_skills", arguments: { query: "changelog video for our new search feature" } });
      const found = JSON.parse((search.content as { text: string }[])[0]!.text);
      expect(found.engine).toBe("three");
      expect(found.results[0].id).toBe("announce-feature");

      const skill = await client.callTool({ name: "get_skill", arguments: { id: "genmotion-skills" } });
      expect((skill.content as { text: string }[])[0]!.text).toContain("VIDEO.md");
      const missing = await client.callTool({ name: "get_skill", arguments: { id: "no-such-skill" } });
      expect(missing.isError).toBe(true);
    } finally {
      await client.close();
    }
  });
});
