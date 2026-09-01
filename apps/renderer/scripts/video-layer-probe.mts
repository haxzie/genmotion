/**
 * WHICH ancestor property freezes a <Video> in an export?
 *
 * `camera-video-probe` established that a <Video> under a MOVING <Camera>
 * repeats captured frames while every seek lands correctly. Scene 03 of the
 * reported project has a STATIC camera and still freezes, so the camera itself
 * was never the trigger — something between the camera and the video is.
 *
 * Each variant adds one property to the same tree and counts distinct captures.
 * The box translates by whole pixels and the capture clips at that same offset,
 * so a stale texture reads as a byte-identical crop rather than "looks close".
 *
 *   pnpm --dir apps/renderer exec tsx --tsconfig ../../tsconfig.tsx-runtime.json \
 *     scripts/video-layer-probe.mts <clip.mp4> [frames]
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
const FRAMES = Number(process.argv[3] ?? 90);
/** The box steps 0..7px and back; the capture clip follows it. */
const STEP = 8;

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
  return { url: `http://127.0.0.1:${port}/clip.mp4`, close: () => server.close() };
}

/**
 * One tree, five dressings. `box` is what wraps the video, `outer` what wraps
 * that — the two places scene 03 differs from scenes 04 and 06, which play.
 */
const scene = (src: string, box: string, outer: string, camera: boolean) => {
  const inner = `
      <div style={{ position: "absolute", left: 0, top: 0, width: ${W}, height: ${H}, overflow: "hidden", ${box} }}>
        <Video src="${src}" volume={0} loop
          style={{ position: "absolute", left: 0, top: 0, width: ${W}, height: ${H}, objectFit: "cover" }} />
      </div>`;
  const wrapped = outer
    ? `<div style={{ position: "absolute", inset: 0, ${outer} }}>${inner}</div>`
    : inner;
  return `
import { AbsoluteFill, Camera, Layer, Video, useCurrentFrame } from "@genmotion/motion";
export default function Scene() {
  const frame = useCurrentFrame();
  return (
    ${camera
      ? `<Camera world={1} keyframes={[{ at: 0, x: 0.5, y: 0.5, zoom: 1 }]}><Layer>${wrapped}</Layer></Camera>`
      : `<AbsoluteFill style={{ backgroundColor: "#101014" }}>${wrapped}</AbsoluteFill>`}
  );
}
`;
};

const SHIFT = `transform: \`translateX(\${frame % ${STEP}}px)\``;
const SHIFT_SCALE = `transform: \`translateX(\${frame % ${STEP}}px) scale(\${1 + 0.008 * Math.sin(frame / 40)})\``;

/**
 * A moving camera with NO video in it at all. `camera-video-probe` reported 68
 * distinct captures out of 120 for a <Video> under a moving <Camera> and read
 * that as the video stalling; if this control repeats too, the number was
 * never about the video.
 */
const movingCameraStill = `
import { Camera, Layer, Img, useCurrentFrame } from "@genmotion/motion";
export default function Scene() {
  return (
    <Camera
      world={2}
      keyframes={[
        { at: 0, x: 0.5, y: 0.5, zoom: 1 },
        { at: ${FRAMES}, x: 0.62, y: 0.46, zoom: 1.6 },
      ]}
    >
      <Layer>
        <div style={{ position: "absolute", left: 0, top: 0, width: ${W * 2}, height: ${H * 2},
          background: "repeating-linear-gradient(45deg, #123 0 17px, #9cf 17px 34px)" }} />
      </Layer>
    </Camera>
  );
}
`;

const movingCameraVideo = (src: string) => `
import { Camera, Layer, Video } from "@genmotion/motion";
export default function Scene() {
  return (
    <Camera
      world={2}
      keyframes={[
        { at: 0, x: 0.5, y: 0.5, zoom: 1 },
        { at: ${FRAMES}, x: 0.62, y: 0.46, zoom: 1.6 },
      ]}
    >
      <Layer>
        <Video src="${src}" volume={0} loop
          style={{ position: "absolute", left: 0, top: 0, width: ${W}, height: ${H}, objectFit: "cover" }} />
      </Layer>
    </Camera>
  );
}
`;

const VARIANTS: Array<{ label: string; box: string; outer: string; camera: boolean; whole?: string }> = [
  { label: "static box (control)", box: "", outer: "", camera: false },
  { label: "box translated every frame", box: SHIFT, outer: "", camera: false },
  { label: "box translated + scaled every frame", box: SHIFT_SCALE, outer: "", camera: false },
  { label: "translated box under a filter: blur(0px) ancestor", box: SHIFT, outer: `filter: "blur(0px)"`, camera: false },
  {
    label: "scene 03: static <Camera> + blur(0) ancestor + translated/scaled box",
    box: SHIFT_SCALE,
    outer: `filter: "blur(0px)", opacity: 1, transform: "scale(1)"`,
    camera: true,
  },
  { label: "MOVING <Camera>, no video at all (control)", box: "", outer: "", camera: false, whole: movingCameraStill },
  { label: "MOVING <Camera> with a <Video>", box: "", outer: "", camera: false, whole: "video" },
];

async function run(
  variant: (typeof VARIANTS)[number],
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  src: string,
) {
  const code =
    variant.whole === "video"
      ? movingCameraVideo(src)
      : variant.whole ?? scene(src, variant.box, variant.outer, variant.camera);
  const compiled = await compileSceneToJs(code);
  if (!compiled.ok) throw new Error(`${variant.label}: ${JSON.stringify(compiled.error)}`);
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setContent(`<body style="margin:0"><div id="root"></div></body>`, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ content: await buildRenderHostBundle() });
  const init = await page.evaluate((p) => window.__gmInit(p), {
    scenes: [{ id: "s", name: variant.label, durationInFrames: FRAMES, compiledCode: compiled.code }],
    fps: FPS,
    width: W,
    height: H,
  });
  if (init.error) throw new Error(`${variant.label}: ${init.error}`);

  const cdp = await context.newCDPSession(page);
  const captured: string[] = [];
  const decoded: string[] = [];
  let missed = 0;
  for (let f = 0; f < FRAMES; f++) {
    await page.evaluate((n) => window.__gm!.setFrame(n), f);
    // What the element holds, independent of what gets painted.
    const state = await page.evaluate(() => {
      const v = document.querySelector("video") as HTMLVideoElement | null;
      if (!v) return null;
      const c = document.createElement("canvas");
      c.width = 32;
      c.height = 18;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(v, 0, 0, 32, 18);
      const d = ctx.getImageData(0, 0, 32, 18).data;
      let s = "";
      for (let i = 0; i < d.length; i += 4) s += d[i].toString(16);
      return { t: v.currentTime, d: v.duration, px: s };
    });
    if (state) {
      decoded.push(createHash("sha1").update(state.px).digest("hex").slice(0, 10));
      const dur = Number.isFinite(state.d) && state.d > 0 ? state.d : Infinity;
      if (Math.abs(state.t - ((f + 0.5) / FPS) % dur) > 0.02) missed++;
    }
    // Clip follows the box, so an unchanged texture gives identical bytes.
    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      ...(variant.whole
        ? {}
        : {
            clip: { x: (variant.box ? f % STEP : 0) + 120, y: 60, width: 320, height: 200, scale: 1 },
          }),
    });
    captured.push(createHash("sha1").update(shot.data).digest("hex").slice(0, 10));
  }
  await context.close();

  let longest = 1;
  let run = 1;
  for (let i = 1; i < captured.length; i++) {
    run = captured[i] === captured[i - 1] ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  console.log(`\n${variant.label}`);
  console.log(`  decoded by the element   : ${new Set(decoded).size}/${FRAMES} distinct`);
  console.log(`  captured into the export : ${new Set(captured).size}/${FRAMES} distinct`);
  console.log(`  longest identical run    : ${longest} frame(s)`);
  console.log(`  seeks that missed target : ${missed}/${FRAMES}`);
  if (errors.length) console.log(`  page errors: ${errors.slice(0, 2).join(" | ")}`);
}

const clip = process.argv[2];
if (!clip) {
  console.error("usage: video-layer-probe.mts <clip.mp4> [frames]");
  process.exit(2);
}
const server = await serve(clip);
const browser = await chromium.launch({ headless: true });
try {
  for (const variant of VARIANTS) await run(variant, browser, server.url);
} finally {
  await browser.close();
  server.close();
}
