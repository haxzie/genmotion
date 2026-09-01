/**
 * Is a <Video> inside <Camera>/<Layer> captured differently from a bare one?
 *
 * Scene 03 of the reported project puts its video inside a Camera; scenes 04
 * and 06 do not, and 03 is the one that stalls. This renders both shapes over
 * the same clip and counts distinct frames for each.
 *
 * READ THE MOVING-CAMERA NUMBER WITH CARE. It repeats (68/120 measured), and
 * the first reading of that was that a <Video> under a moving <Camera> gets its
 * texture scaled instead of re-rasterised. `video-layer-probe` then measured
 * the same camera move with NO video in the scene at all: 114/120. The repeats
 * come in one run of 53 consecutive byte-identical FULL frames, while the
 * element decodes 120 distinct ones — so what repeats is the screenshot, not
 * the video, and it is the headless capture that goes stale when a <video> is
 * on the page. Separate bug from the reported one, which was the desktop
 * app serving media without byte ranges (see serveAssetFile in
 * apps/desktop/electron/main.ts) and is fixed.
 */
import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import http from "node:http";
import { chromium } from "playwright";
import { compileSceneToJs } from "@genmotion/compiler/node";
import { buildRenderHostBundle } from "../src/build-host";

const FPS = 30;
const W = 640;
const H = 360;
const FRAMES = Number(process.argv[3] ?? 120);

async function serve(file: string) {
  const size = statSync(file).size;
  const head = (extra: Record<string, string>) => ({
    "content-type": "video/mp4",
    "accept-ranges": "bytes",
    "access-control-allow-origin": "*",
    ...extra,
  });
  const server = http.createServer((req, res) => {
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
  return { url: `http://127.0.0.1:${port}/c.mp4`, close: () => server.close() };
}

const bare = (src: string) => `
import { AbsoluteFill, Video } from "@genmotion/motion";
export default function Scene() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#101014" }}>
      <Video id="clip" src="${src}" volume={0} loop />
    </AbsoluteFill>
  );
}
`;

// Mirrors scene 03: a moving camera with the video on a layer inside it.
const inCamera = (src: string) => `
import { Camera, Layer, Video, Easing } from "@genmotion/motion";
export default function Scene() {
  return (
    <Camera
      world={2}
      keyframes={[
        { at: 0, x: 0.5, y: 0.5, zoom: 1 },
        { at: ${FRAMES}, x: 0.62, y: 0.46, zoom: 1.6, ease: Easing.inOutCubic },
      ]}
    >
      <Layer>
        <Video id="clip" src="${src}" volume={0} loop
          style={{ position: "absolute", left: 0, top: 0, width: ${W}, height: ${H}, objectFit: "cover" }} />
      </Layer>
    </Camera>
  );
}
`;

async function run(label: string, code: string, browser: Awaited<ReturnType<typeof chromium.launch>>) {
  const compiled = await compileSceneToJs(code);
  if (!compiled.ok) throw new Error(`${label}: compile failed ${JSON.stringify(compiled.error)}`);
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setContent(`<body style="margin:0"><div id="root"></div></body>`, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ content: await buildRenderHostBundle() });
  const init = await page.evaluate((p) => window.__gmInit(p), {
    scenes: [{ id: "s", name: label, durationInFrames: FRAMES, compiledCode: compiled.code }],
    fps: FPS, width: W, height: H,
  });
  if (init.error) throw new Error(`${label}: ${init.error}`);

  const cdp = await context.newCDPSession(page);
  const hashes: string[] = [];
  let missed = 0;
  for (let f = 0; f < FRAMES; f++) {
    await page.evaluate((n) => window.__gm!.setFrame(n), f);
    const state = await page.evaluate(() => {
      const v = document.querySelector("video") as HTMLVideoElement | null;
      return v ? { t: v.currentTime, rs: v.readyState, d: v.duration } : null;
    });
    if (state) {
      const want = ((f + 0.5) / FPS) % (Number.isFinite(state.d) && state.d > 0 ? state.d : Infinity);
      if (Math.abs(state.t - want) > 0.02) missed++;
    }
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    hashes.push(createHash("sha1").update(shot.data).digest("hex").slice(0, 12));
  }
  await context.close();
  console.log(`\n${label}`);
  console.log(`  distinct captured frames : ${new Set(hashes).size}/${FRAMES}`);
  console.log(`  seeks that missed target : ${missed}/${FRAMES}`);
  if (errors.length) console.log(`  page errors: ${errors.slice(0, 2).join(" | ")}`);
}

// A camera that does not move: any frame-to-frame difference now comes from
// the video alone, so this separates "the camera's own motion" from "the video
// is painting". Without it, a zoom that changes sub-pixel between frames looks
// exactly like a stalled video.
const staticCamera = (src: string) => `
import { Camera, Layer, Video } from "@genmotion/motion";
export default function Scene() {
  return (
    <Camera
      world={2}
      keyframes={[
        { at: 0, x: 0.5, y: 0.5, zoom: 1.3 },
        { at: ${FRAMES}, x: 0.5, y: 0.5, zoom: 1.3 },
      ]}
    >
      <Layer>
        <Video id="clip" src="${src}" volume={0} loop
          style={{ position: "absolute", left: 0, top: 0, width: ${W}, height: ${H}, objectFit: "cover" }} />
      </Layer>
    </Camera>
  );
}
`;

const server = await serve(process.argv[2]!);
const browser = await chromium.launch({ headless: true });
try {
  await run("Bare <Video> (like scene 06)", bare(server.url), browser);
  await run("<Video> inside a MOVING <Camera> (like scene 03)", inCamera(server.url), browser);
  await run("<Video> inside a STATIC <Camera>", staticCamera(server.url), browser);
} finally {
  await browser.close();
  server.close();
}
