/**
 * Two scenes, each with its own <Video>, rendered through the real export path.
 *
 * Reported symptom: with more than one scene using <Video>, only the later
 * scene's video moves in the export. This walks the composition frame by frame
 * and reports each scene's distinct-frame count separately, so "scene A frozen,
 * scene B fine" shows up as a number rather than an impression.
 *
 *   pnpm tsx scripts/multi-scene-video-probe.mts [path/to/clip.mp4]
 */
import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { chromium, type Browser } from "playwright";
import { compileSceneToJs } from "@genmotion/compiler/node";
import { buildRenderHostBundle } from "../src/build-host";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;

const FPS = 30;
const WIDTH = 640;
const HEIGHT = 360;
/**
 * Frames per scene. Defaults to the real "Recording dock" length: 310 frames at
 * 30fps is 10.33s, over TWICE the 4.69s clip it plays, so the scene only works
 * at all if `loop` wraps the seek. A scene shorter than its source never
 * exercises that path — which is why the first version of this probe, at 45
 * frames a scene, reported OK on a composition that is visibly broken.
 */
const SCENE_FRAMES = Number(process.env.SCENE_FRAMES ?? 310);

const PAGE_SHELL = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #000; overflow: hidden; }
</style></head><body><div id="root"></div></body></html>`;

function makeClip(dir: string): string {
  const out = join(dir, "clip.mp4");
  const res = spawnSync(FFMPEG, [
    "-y", "-f", "lavfi",
    "-i", `testsrc=size=${WIDTH}x${HEIGHT}:rate=${FPS}:duration=6`,
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-g", "15", out,
  ]);
  if (res.status !== 0) throw new Error(`ffmpeg failed: ${res.stderr?.toString().slice(-400)}`);
  return out;
}

async function serveClip(file: string) {
  const size = statSync(file).size;
  const server = http.createServer((req, res) => {
    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, {
        "content-type": "video/mp4",
        "content-length": String(size),
        "accept-ranges": "bytes",
        "access-control-allow-origin": "*",
      });
      createReadStream(file).pipe(res);
      return;
    }
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = Number(m?.[1] ?? 0);
    const end = m?.[2] ? Number(m[2]) : size - 1;
    res.writeHead(206, {
      "content-type": "video/mp4",
      "content-range": `bytes ${start}-${end}/${size}`,
      "content-length": String(end - start + 1),
      "accept-ranges": "bytes",
      "access-control-allow-origin": "*",
    });
    createReadStream(file, { start, end }).pipe(res);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  return { url: `http://127.0.0.1:${port}/clip.mp4`, close: () => server.close() };
}

/** One scene holding a looping video, tinted so the two are told apart. */
const sceneCode = (src: string, tint: string, loop: boolean) => `
import { AbsoluteFill, Video } from "@genmotion/motion";

export default function Scene() {
  return (
    <AbsoluteFill style={{ backgroundColor: "${tint}" }}>
      <Video id="clip" src="${src}" volume={0}${loop ? " loop" : ""} />
    </AbsoluteFill>
  );
}
`;

async function capture(browser: Browser, src: string, loop: boolean): Promise<string[]> {
  const scenes = [];
  for (const [i, tint] of ["#101014", "#141018"].entries()) {
    const compiled = await compileSceneToJs(sceneCode(src, tint, loop));
    if (!compiled.ok) throw new Error("compile failed");
    scenes.push({
      id: `s${i + 1}`,
      name: `Scene ${i + 1}`,
      durationInFrames: SCENE_FRAMES,
      compiledCode: compiled.code,
    });
  }

  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setContent(PAGE_SHELL, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ content: await buildRenderHostBundle() });
  const init = await page.evaluate(
    (payload) => window.__gmInit(payload),
    { scenes, fps: FPS, width: WIDTH, height: HEIGHT },
  );
  if (init.error) throw new Error(init.error);

  const cdp = await context.newCDPSession(page);
  const hashes: string[] = [];
  const started = Date.now();
  for (let frame = 0; frame < SCENE_FRAMES * 2; frame++) {
    await page.evaluate((f) => window.__gm!.setFrame(f), frame);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    hashes.push(createHash("sha1").update(shot.data).digest("hex").slice(0, 12));
  }
  await context.close();
  // A per-frame seek that never resolves costs the readiness timeout, so wall
  // clock is itself a symptom worth printing.
  console.log(`  (${((Date.now() - started) / 1000).toFixed(1)}s for ${hashes.length} frames)`);
  if (errors.length) console.log("  page errors:", errors.slice(0, 3));
  return hashes;
}

function report(label: string, hashes: string[]) {
  console.log(`\n${label}`);
  for (const [i, name] of ["Scene 1 (first)", "Scene 2 (second)"].entries()) {
    const slice = hashes.slice(i * SCENE_FRAMES, (i + 1) * SCENE_FRAMES);
    const unique = new Set(slice).size;
    const verdict = unique === slice.length ? "OK" : unique === 1 ? "FROZEN" : "PARTIAL";
    console.log(`  ${name.padEnd(17)}: ${String(unique).padStart(2)}/${slice.length} distinct  ${verdict}`);
  }
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "gm-multiscene-"));
  const clip = process.argv[2] ?? makeClip(dir);
  console.log(`clip: ${clip}`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--force-color-profile=srgb", "--font-render-hinting=none"],
  });
  const server = await serveClip(clip);
  try {
    report("Two scenes, both <Video loop> on the SAME src", await capture(browser, server.url, true));
    report("Same, without `loop`", await capture(browser, server.url, false));
  } finally {
    server.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
