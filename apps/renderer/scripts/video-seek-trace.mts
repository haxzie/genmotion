/**
 * Per-frame trace of what the <video> element is actually doing during a render.
 *
 * The hash probes say a frame stalled; this says why — what time the component
 * asked for, where the element landed, and whether it had decoded anything yet.
 *
 *   pnpm tsx scripts/video-seek-trace.mts <clip.mp4> [sceneFrames]
 */
import { createReadStream, statSync } from "node:fs";
import http from "node:http";
import { chromium } from "playwright";
import { compileSceneToJs } from "@genmotion/compiler/node";
import { buildRenderHostBundle } from "../src/build-host";

const FPS = 30;
const W = 640;
const H = 360;
const SCENE_FRAMES = Number(process.argv[3] ?? 310);

async function serve(file: string) {
  const size = statSync(file).size;
  const server = http.createServer((req, res) => {
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
    if (!m) {
      res.writeHead(200, { "content-type": "video/mp4", "content-length": String(size), "accept-ranges": "bytes", "access-control-allow-origin": "*" });
      createReadStream(file).pipe(res);
      return;
    }
    const start = Number(m[1] ?? 0);
    const end = m[2] ? Number(m[2]) : size - 1;
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
  return { url: `http://127.0.0.1:${port}/c.mp4`, close: () => server.close() };
}

const code = (src: string) => `
import { AbsoluteFill, Video } from "@genmotion/motion";
export default function Scene() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#101014" }}>
      <Video id="clip" src="${src}" volume={0} loop />
    </AbsoluteFill>
  );
}
`;

const clip = process.argv[2]!;
const server = await serve(clip);
const browser = await chromium.launch({ headless: true });
const compiled = await compileSceneToJs(code(server.url));
if (!compiled.ok) throw new Error("compile failed");

const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.setContent(`<body style="margin:0"><div id="root"></div></body>`, { waitUntil: "domcontentloaded" });
await page.addScriptTag({ content: await buildRenderHostBundle() });
await page.evaluate((p) => window.__gmInit(p), {
  scenes: [{ id: "s1", name: "S", durationInFrames: SCENE_FRAMES, compiledCode: compiled.code }],
  fps: FPS, width: W, height: H,
});

const rows: { f: number; want: number; got: number; dur: number; rs: number }[] = [];
for (let f = 0; f < SCENE_FRAMES; f++) {
  await page.evaluate((n) => window.__gm!.setFrame(n), f);
  const s = await page.evaluate(() => {
    const v = document.querySelector("video") as HTMLVideoElement | null;
    return v ? { got: v.currentTime, dur: v.duration, rs: v.readyState } : null;
  });
  if (!s) continue;
  const want = ((f + 0.5) / FPS) % (Number.isFinite(s.dur) && s.dur > 0 ? s.dur : Infinity);
  rows.push({ f, want, got: s.got, dur: s.dur, rs: s.rs });
}
await browser.close();
server.close();

const bad = rows.filter((r) => Math.abs(r.got - r.want) > 0.02);
const rs = rows.reduce<Record<number, number>>((a, r) => ({ ...a, [r.rs]: (a[r.rs] ?? 0) + 1 }), {});
console.log(`duration reported by the element: ${rows[rows.length - 1]?.dur}`);
console.log(`readyState histogram across frames: ${JSON.stringify(rs)}`);
console.log(`frames whose element time missed the request: ${bad.length}/${rows.length}`);
console.log("first 15 misses (frame, wanted, got, readyState):");
for (const r of bad.slice(0, 15)) {
  console.log(`  f${String(r.f).padStart(3)}  want ${r.want.toFixed(3)}  got ${r.got.toFixed(3)}  rs${r.rs}`);
}
// Where do the misses start relative to the clip's end?
const firstMiss = bad[0];
if (firstMiss) console.log(`first miss at t=${firstMiss.want.toFixed(3)} of a ${rows[0]?.dur.toFixed(3)}s clip`);
