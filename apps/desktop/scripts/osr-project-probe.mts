/**
 * Run REAL project scenes through the desktop export path and report whether
 * each <Video> actually advances.
 *
 * The synthetic shapes in osr-video-probe all pass, so this stops guessing at
 * what a scene does and renders the scene itself — same bundler, same offscreen
 * window, same setFrame → capturePage loop the export uses.
 *
 * This is what caught the gm-asset range bug: over the probe's own http server
 * a reported-stuck scene played (mean change per frame 2.78), and over
 * `--gm-asset` — the app's real scheme — the same 310 frames gave 1.55, with
 * `currentTime` pinned at 0.000 and exactly one distinct decode. Pass
 * `--gm-asset` for anything about media, or the loader under test is not the
 * one that ships.
 *
 *   pnpm --dir apps/desktop exec tsx --tsconfig ../../tsconfig.tsx-runtime.json \
 *     scripts/osr-project-probe.mts <projectDir> <sceneIndex:from:frames> [more…]
 *
 * e.g. `… <dir> 2:220:60 3:60:60` renders 60 frames of scene 3 from its frame
 * 220 and 60 frames of scene 4 from its frame 60, the second as a control.
 */
import { createReadStream, statSync, existsSync, writeFileSync, mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import http from "node:http";
import { createSceneBundler, readManifest } from "@genmotion/project";

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE_SHELL = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #000; overflow: hidden; }
</style></head><body><div id="root"></div></body></html>`;

const MIME: Record<string, string> = {
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
  mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", ogg: "audio/ogg",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  gif: "image/gif", svg: "image/svg+xml", avif: "image/avif",
  woff: "font/woff", woff2: "font/woff2",
};

/**
 * Serve the project directory with byte ranges — the desktop app's gm-asset://
 * protocol does, and a <video> that cannot range-request cannot seek.
 */
async function serveProject(dir: string) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent((req.url ?? "/").replace(/^\//, "").split("?")[0]!);
    const file = normalize(join(dir, rel));
    if (!file.startsWith(dir) || !existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    const size = statSync(file).size;
    const type = MIME[file.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";
    const head = (extra: Record<string, string>) => ({
      "content-type": type,
      "accept-ranges": "bytes",
      "access-control-allow-origin": "*",
      ...extra,
    });
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
    if (!m) {
      res.writeHead(200, head({ "content-length": String(size) }));
      createReadStream(file).pipe(res);
      return;
    }
    const start = Number(m[1] ?? 0);
    const end = m[2] ? Number(m[2]) : size - 1;
    res.writeHead(206, head({
      "content-range": `bytes ${start}-${end}/${size}`,
      "content-length": String(end - start + 1),
    }));
    createReadStream(file, { start, end }).pipe(res);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  return { origin: `http://127.0.0.1:${port}/`, close: () => server.close() };
}

const projectDir = resolve(process.argv[2] ?? "");
const targets = process.argv.slice(3).filter((a) => !a.startsWith("--")).map((spec) => {
  const [index, from, frames] = spec.split(":");
  // "all" mounts every scene, so the probe walks the real global timeline —
  // a scene rendered on its own is a different composition, and this bug only
  // shows up in the whole one.
  return {
    index: index === "all" ? ("all" as const) : Number(index ?? 0),
    from: Number(from ?? 0),
    frames: Number(frames ?? 60),
  };
});
if (!projectDir || targets.length === 0) {
  console.error("usage: osr-project-probe.mts <projectDir> <sceneIndex:from:frames> […]");
  process.exit(2);
}

const manifest = await readManifest(projectDir);
const server = await serveProject(projectDir);
// --gm-asset reproduces the app's own scheme; without it assets come over the
// probe's http server, which is a different media loader inside Chromium.
const useGmAsset = process.argv.includes("--gm-asset");
const assetKey = "probe";
const bundler = createSceneBundler({
  projectDir,
  assetUrlPrefix: useGmAsset ? `gm-asset://${assetKey}/` : server.origin,
});

const variants = [];
// Whole-frame hash: these scenes animate everywhere, so the number that
// matters here is what the ELEMENT decoded, not the capture's distinctness.
// Default to the whole frame; --crop x,y,w,h narrows it to one element (the
// scene-03 camera preview, say) so the change-per-frame number is about the
// video and not about everything else moving around it.
const cropArg = process.argv.find((a) => a.startsWith("--crop="));
const crop = cropArg
  ? (([x, y, width, height]) => ({ x, y, width, height }))(
      cropArg.slice("--crop=".length).split(",").map(Number) as [number, number, number, number],
    )
  : { x: 0, y: 0, width: manifest.width, height: manifest.height };
// --no-decode-read: skip the per-frame canvas readback, which pulls the
// decoder along and can hide the stall.
const readDecoded = !process.argv.includes("--no-decode-read");
async function bundleScene(entry: { file: string; name?: string; durationInFrames: number }) {
  const built = await bundler.bundle(entry.file);
  if (!built.ok) throw new Error(`${entry.file}: ${built.error.message}`);
  return {
    id: entry.file,
    name: entry.name ?? entry.file,
    durationInFrames: entry.durationInFrames,
    compiledCode: built.code,
  };
}
for (const target of targets) {
  const window = `frames ${target.from}..${target.from + target.frames - 1}`;
  if (target.index === "all") {
    const scenes = [];
    for (const entry of manifest.scenes) scenes.push(await bundleScene(entry));
    variants.push({
      label: `whole composition (${scenes.length} scenes) — global ${window}`,
      scenes,
      from: target.from,
      frames: target.frames,
      offsetPx: 0,
      crop,
      readDecoded,
    });
    continue;
  }
  const entry = manifest.scenes[target.index];
  if (!entry) throw new Error(`no scene at index ${target.index}`);
  const scene = await bundleScene(entry);
  variants.push({
    label: `${entry.file} — ${window}`,
    code: scene.compiledCode,
    durationInFrames: entry.durationInFrames,
    from: target.from,
    frames: target.frames,
    offsetPx: 0,
    crop,
    readDecoded,
  });
}
await bundler.dispose();

const hostBundle = await readFile(join(HERE, "..", "dist", "main", "render-host.js"), "utf8");
const dir = mkdtempSync(join(tmpdir(), "gm-osr-project-"));
const payloadPath = join(dir, "payload.json");
writeFileSync(
  payloadPath,
  JSON.stringify({
    W: manifest.width,
    H: manifest.height,
    FPS: manifest.fps,
    FRAMES: 0, // per-variant
    hostBundle,
    shell: PAGE_SHELL,
    variants,
    assetRoot: useGmAsset ? projectDir : null,
  }),
);

const reportPath = join(dir, "report.txt");
writeFileSync(reportPath, "");
const electron = join(HERE, "..", "node_modules", ".bin", "electron");
const child = spawn(electron, [join(HERE, "osr-video-probe.electron.mjs"), payloadPath, reportPath], {
  stdio: "inherit",
  env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: "1" },
});
child.on("close", async (code, signal) => {
  server.close();
  process.stdout.write(await readFile(reportPath, "utf8"));
  if (code !== 0) process.stdout.write(`\nelectron exited: code=${code} signal=${signal}\n`);
  process.exit(code ?? 1);
});
