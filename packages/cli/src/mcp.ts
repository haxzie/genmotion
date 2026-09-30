import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Browser } from "playwright-core";
import { addScene, createProject, readManifest, renderGenmotionSkill } from "@genmotion/project";
import { createSceneBundler } from "@genmotion/project";
import { validateSceneFile, validateThreeSceneFile } from "@genmotion/project/validate";
import { checkProject, launchBrowser, parseDuration, renderProject, renderStills, type Codec } from "@genmotion/render";
import { projectOverview } from "./commands/project";
import { resolveProjectDir } from "./project-dir";
import { createFromTemplate, listTemplates } from "./templates";
import { THREE_AUTHORING_GUIDE, TERMINAL_SECTION, wireAgents } from "./agents";
import { parseSize } from "./commands/init";
import { CliError } from "./output";
import { VERSION } from "./version";

const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const ASSET_TYPES = /^(image|audio|video|font|model)\/|^application\/(octet-stream|json)$/;

/**
 * `genmotion mcp`: the CLI's verbs as MCP tools, over stdio.
 *
 * Remotion retired its MCP server because agents didn't call it — it was a docs
 * lookup, which an agent can always skip. These tools are the opposite: the
 * only way to see a frame, prove a scene renders, or produce the MP4, so the
 * task can't be finished without them. Results are small JSON, and
 * `capture_frames` returns the images themselves so the agent can look.
 */
export async function runMcpServer(options: { dir?: string }): Promise<void> {
  const server = new McpServer(
    { name: "genmotion", version: VERSION },
    {
      instructions:
        "Tools for making a GenMotion video in the current project folder. Loop: project_overview → add_scene / edit scene files → check_project → capture_frames (look at the images) → render_video when asked. Call get_guide('three') before writing your first scene.",
    },
  );

  // One warm browser for the session: launching Chromium per capture would
  // cost more than the capture.
  let browser: Promise<Browser> | null = null;
  const warmBrowser = () => {
    browser ??= launchBrowser().catch((err) => {
      browser = null;
      throw err;
    });
    return browser;
  };
  const project = (dir?: string) => resolveProjectDir(dir ?? options.dir);

  const tool = <Shape extends z.ZodRawShape>(
    name: string,
    description: string,
    shape: Shape,
    run: (args: z.infer<z.ZodObject<Shape>>) => Promise<CallToolResult | Record<string, unknown>>,
    annotations: { readOnlyHint?: boolean; destructiveHint?: boolean } = {},
  ) => {
    server.registerTool(name, { description, inputSchema: shape, annotations }, (async (args: z.infer<z.ZodObject<Shape>>) => {
      try {
        const result = await run(args);
        if ("content" in result && Array.isArray(result.content)) return result as CallToolResult;
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const fix = err instanceof CliError ? err.options.fix : (err as { fix?: string } | null)?.fix;
        return { isError: true, content: [{ type: "text", text: fix ? `${message}\nFix: ${fix}` : message }] };
      }
    }) as never);
  };

  const dirArg = { dir: z.string().optional().describe("Project folder. Defaults to the folder the server was started in (or the nearest one above with a project.json).") };

  tool(
    "project_overview",
    "The project's size, fps, engine, every scene with its file, start frame and duration, audio clips and asset files. Call this first.",
    dirArg,
    async ({ dir }) => ({ ...(await projectOverview(project(dir))) }),
    { readOnlyHint: true },
  );

  tool(
    "create_project",
    "Create a new video project folder (Three.js engine) with a starter scene and agent wiring. Only needed when there is no project yet.",
    {
      dir: z.string().describe("Folder to create (must be empty or not exist)."),
      template: z.string().optional().describe("Catalog template id (see list_templates) or a local project folder."),
      size: z.string().optional().describe("WIDTHxHEIGHT or landscape | portrait | square | 4k. Default landscape (1920x1080)."),
      fps: z.number().int().min(1).max(120).optional(),
    },
    async ({ dir, template, size, fps }) => {
      const [width, height] = parseSize(size ?? "landscape");
      const manifest = template
        ? await createFromTemplate(dir, template)
        : await createProject({ dir, engine: "three", width, height, fps: fps ?? 30, authoringGuide: THREE_AUTHORING_GUIDE });
      await wireAgents(path.resolve(dir), { engine: manifest.engine });
      return { dir: path.resolve(dir), name: manifest.name, engine: manifest.engine, scenes: manifest.scenes };
    },
  );

  tool(
    "add_scene",
    "Create a new scene file from a working stub AND register it in project.json (both are needed for a scene to be in the video). Then edit the file.",
    {
      ...dirArg,
      name: z.string().min(1).describe("Scene name, e.g. 'Hero reveal'. The file name is derived from it."),
      duration: z.string().default("4s").describe("Length: '4s', '120' (frames), '2500ms'."),
      after: z.string().optional().describe("Insert after this scene (file path or name). Appends by default."),
    },
    async ({ dir, name, duration, after }) => {
      const projectDir = project(dir);
      const manifest = await readManifest(projectDir);
      const added = await addScene({ projectDir, name, durationInFrames: parseDuration(duration, manifest.fps), after });
      return { file: added.file, name: added.name, durationInFrames: added.durationInFrames, index: added.index };
    },
  );

  tool(
    "validate_scene",
    "Compile one scene and check it against the determinism rules (no clocks, randomness, timers or hot-linked assets). Fast, no browser. Use check_project to also render it.",
    { ...dirArg, file: z.string().describe("Scene file, relative to the project, e.g. scenes/02-hero.ts") },
    async ({ dir, file }) => {
      const projectDir = project(dir);
      const manifest = await readManifest(projectDir);
      const bundler = createSceneBundler({ projectDir });
      try {
        const entry = manifest.scenes.find((s) => s.file === file);
        const result =
          manifest.engine === "three"
            ? await validateThreeSceneFile({ bundler, sceneFile: file })
            : await validateSceneFile({
                bundler,
                sceneFile: file,
                config: { fps: manifest.fps, width: manifest.width, height: manifest.height, durationInFrames: entry?.durationInFrames ?? 150 },
              });
        return {
          ok: result.error === null,
          error: result.error,
          warnings: result.warnings.map((w) => w.replace(/call capture_frames/, "call check_project or capture_frames")),
          inProjectJson: entry !== undefined,
        };
      } finally {
        await bundler.dispose();
      }
    },
    { readOnlyHint: true },
  );

  tool(
    "check_project",
    "Everything to run before calling the video done: manifest, compile + determinism for every scene, and a real headless render of each scene's first/middle/last frame (runtime errors, console errors, blank frames). Returns findings with a rule, file, frame and fix.",
    { ...dirArg, static: z.boolean().optional().describe("Skip the headless render (faster, less thorough).") },
    async ({ dir, static: staticOnly }) => {
      const result = await checkProject({ projectDir: project(dir), static: staticOnly, browser: staticOnly ? undefined : await warmBrowser() });
      return { ...result };
    },
    { readOnlyHint: true },
  );

  tool(
    "capture_frames",
    "Render frames and return them as images so you can see what the video looks like. Pass times as '1.5s', '45' (frame), '500ms' or '60%'. Default: the middle of every scene.",
    {
      ...dirArg,
      at: z.array(z.string()).max(12).optional().describe("Times to capture. Omit for one frame from the middle of each scene."),
      width: z.number().int().min(160).max(1920).default(1024).describe("Image width in pixels."),
    },
    async ({ dir, at, width }) => {
      const projectDir = project(dir);
      let times = at;
      if (!times?.length) {
        const overview = await projectOverview(projectDir);
        times = overview.scenes.map((s) => String(Math.round(s.startFrame + s.durationInFrames * 0.5)));
      }
      const stills = await renderStills({
        projectDir,
        at: times,
        format: "jpeg",
        maxWidth: width,
        write: false,
        browser: await warmBrowser(),
      });
      return {
        content: stills.flatMap((s) => [
          { type: "text" as const, text: `frame ${s.frame} (${s.time.toFixed(2)}s)${s.scene ? ` — scene "${s.scene}"` : ""}` },
          { type: "image" as const, data: s.image.toString("base64"), mimeType: "image/jpeg" },
        ]),
      };
    },
    { readOnlyHint: true },
  );

  tool(
    "render_video",
    "Render the video to a file (default exports/<name>.mp4). Slow — only when the user asks for the video or at the very end, after check_project passes.",
    {
      ...dirArg,
      codec: z.enum(["mp4", "webm", "gif", "mov", "png"]).default("mp4"),
      frames: z.string().optional().describe("Part of the video, inclusive: '0-89', '1s-3s', '120-'."),
      output: z.string().optional().describe("Output path, relative to the project."),
      scale: z.number().min(0.25).max(4).optional().describe("Size multiplier, e.g. 2 for 4K from 1080p."),
      quality: z.number().min(0).max(100).optional(),
    },
    async ({ dir, codec, frames, output, scale, quality }) => {
      const projectDir = project(dir);
      const result = await renderProject({
        projectDir,
        codec: codec as Codec,
        frames,
        output: output ? path.resolve(projectDir, output) : undefined,
        scale,
        quality,
        browser: await warmBrowser(),
      });
      return { ...result, output: path.relative(projectDir, result.output) || result.output };
    },
  );

  tool(
    "save_asset",
    "Download a remote image, audio, video, font or 3D model into the project's assets/ folder (max 25MB) and return the import path. Scenes must never hot-link remote URLs.",
    {
      ...dirArg,
      url: z.string().url(),
      filename: z.string().optional().describe("File name to save as; derived from the URL when omitted."),
    },
    async ({ dir, url, filename }) => {
      const projectDir = project(dir);
      const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "genmotion-cli" } });
      if (!res.ok) throw new Error(`${url} answered ${res.status}`);
      const type = (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0]!.trim();
      if (!ASSET_TYPES.test(type)) throw new Error(`${url} is ${type}, not an image, audio, video, font or model`);
      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared > MAX_ASSET_BYTES) throw new Error(`${url} is ${Math.round(declared / 1e6)}MB — the limit is 25MB`);
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.byteLength > MAX_ASSET_BYTES) throw new Error(`${url} is over the 25MB limit`);
      const fromUrl = path.basename(new URL(url).pathname) || "asset";
      const name = (filename ?? fromUrl).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+/, "") || "asset";
      const file = path.join(projectDir, "assets", name);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, bytes);
      return { path: `assets/${name}`, bytes: bytes.byteLength, contentType: type, importAs: `import url from "../assets/${name}";` };
    },
  );

  tool(
    "add_package",
    "npm install a browser-safe package into the project (lifecycle scripts disabled). three and @genmotion/three-engine are already provided — don't add them.",
    { ...dirArg, name: z.string().regex(/^(@[a-z0-9._-]+\/)?[a-z0-9._-]+(@[a-zA-Z0-9.^~<>=*|-]+)?$/, "npm package name, optionally @version") },
    async ({ dir, name }) => {
      const projectDir = project(dir);
      const npm = process.platform === "win32" ? "npm.cmd" : "npm";
      const output = await new Promise<string>((resolve, reject) => {
        const child = spawn(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund", name], { cwd: projectDir });
        let log = "";
        child.stdout.on("data", (d: Buffer) => (log += d.toString()));
        child.stderr.on("data", (d: Buffer) => (log += d.toString()));
        child.on("error", reject);
        child.on("close", (code) => (code === 0 ? resolve(log) : reject(new Error(`npm install ${name} failed:\n${log.slice(-2000)}`))));
      });
      return { installed: name, log: output.trim().slice(-600) };
    },
  );

  tool(
    "get_guide",
    "Reference docs, on demand. 'three' = how to write a Three.js scene (read before your first scene); 'workflow' = the make-a-video loop; 'cli' = terminal commands.",
    { topic: z.enum(["three", "workflow", "cli"]) },
    async ({ topic }) => ({
      content: [
        {
          type: "text",
          text: topic === "three" ? THREE_AUTHORING_GUIDE : topic === "workflow" ? renderGenmotionSkill() : TERMINAL_SECTION,
        },
      ],
    }),
    { readOnlyHint: true },
  );

  tool(
    "list_templates",
    "The starter template catalog (id, title, description). Pass an id to create_project's template to start from one.",
    {},
    async () => ({ templates: await listTemplates() }),
    { readOnlyHint: true },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  await new Promise<void>((resolve) => {
    transport.onclose = () => resolve();
    process.stdin.on("end", () => resolve());
  });
  if (browser) await (await (browser as Promise<Browser>).catch(() => null))?.close().catch(() => {});
}
