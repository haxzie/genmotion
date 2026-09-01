/**
 * Does a <Video> actually advance in a DESKTOP export?
 *
 * The renderer's probes drive Playwright + Page.captureScreenshot. The desktop
 * app exports through a different pipe — an offscreen BrowserWindow and
 * webContents.capturePage() — so a stall that only shows up there is invisible
 * to them. This drives that pipe.
 *
 *   pnpm --dir apps/desktop exec tsx --tsconfig ../../tsconfig.tsx-runtime.json \
 *     scripts/osr-video-probe.mts <clip.mp4> [frames]
 *
 * Each variant reports what the element decoded against what was captured, so
 * "the seek is wrong" and "the seek is right and the capture is stale" can't be
 * confused for each other. `bare` is the control: if it stalls too, the shape
 * of the scene is not what matters.
 */
import { createReadStream, statSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { compileSceneToJs } from "@genmotion/compiler/node";

const HERE = dirname(fileURLToPath(import.meta.url));
// Copied rather than imported from electron/export/service.ts: that module
// imports `electron`, which does not load outside the Electron runtime.
const PAGE_SHELL = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #000; overflow: hidden; }
</style></head><body><div id="root"></div></body></html>`;
const W = 640;
const H = 360;
const FPS = 30;
const FRAMES = Number(process.argv[3] ?? 90);

/** Range-capable file server: <video> needs 206s to seek. */
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

/** Control: nothing around the video moves. */
const bare = (src: string) => `
import { AbsoluteFill, Video } from "@genmotion/motion";
export default function Scene() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#101014" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: ${W}, height: ${H} }}>
        <Video src="${src}" volume={0} loop
          style={{ width: ${W}, height: ${H}, objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
}
`;

/**
 * Scene 03's shape: the video sits in a box that moves every single frame.
 * Whole-pixel steps on purpose — the probe crops at the same offset, so a
 * stale capture is byte-identical rather than merely similar.
 */
const movingBox = (src: string) => `
import { AbsoluteFill, Video, useCurrentFrame } from "@genmotion/motion";
export default function Scene() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#101014" }}>
      <div style={{
        position: "absolute", left: 0, top: 0, width: ${W}, height: ${H},
        transform: \`translateX(\${frame % 8}px)\`,
      }}>
        <Video src="${src}" volume={0} loop
          style={{ width: ${W}, height: ${H}, objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
}
`;

/** The same moving box, inside a static <Camera> — scene 03 to the letter. */
const inCamera = (src: string) => `
import { Camera, Layer, Video, useCurrentFrame } from "@genmotion/motion";
export default function Scene() {
  const frame = useCurrentFrame();
  return (
    <Camera world={1} keyframes={[{ at: 0, x: 0.5, y: 0.5, zoom: 1 }]}>
      <Layer>
        <div style={{
          position: "absolute", left: 0, top: 0, width: ${W}, height: ${H},
          transform: \`translateX(\${frame % 8}px) scale(\${1 + 0.008 * Math.sin(frame / 40)})\`,
        }}>
          <Video src="${src}" volume={0} loop
            style={{ width: ${W}, height: ${H}, objectFit: "cover" }} />
        </div>
      </Layer>
    </Camera>
  );
}
`;

const clip = process.argv[2];
if (!clip) {
  console.error("usage: osr-video-probe.mts <clip.mp4> [frames]");
  process.exit(2);
}

const server = await serve(clip);
// A crop well inside the picture: the edges of a moving box slide in and out
// of any fixed window, which would read as motion that isn't the video's.
const crop = { x: 120, y: 60, width: 320, height: 200 };
const shapes = [
  { label: "bare <Video>, nothing moving (control)", make: bare, offsetPx: 0 },
  { label: "<Video> in a box that moves every frame", make: movingBox, offsetPx: 8 },
  { label: "<Video> in a moving box inside a static <Camera> (scene 03)", make: inCamera, offsetPx: 8 },
];

const variants = [];
for (const shape of shapes) {
  const compiled = await compileSceneToJs(shape.make(server.url));
  if (!compiled.ok) throw new Error(`${shape.label}: ${JSON.stringify(compiled.error)}`);
  variants.push({ label: shape.label, code: compiled.code, offsetPx: shape.offsetPx, crop });
}

const hostBundle = await readFile(join(HERE, "..", "dist", "main", "render-host.js"), "utf8");
const dir = mkdtempSync(join(tmpdir(), "gm-osr-probe-"));
const payloadPath = join(dir, "payload.json");
writeFileSync(
  payloadPath,
  JSON.stringify({ W, H, FPS, FRAMES, hostBundle, shell: PAGE_SHELL, variants }),
);

const electron = join(HERE, "..", "node_modules", ".bin", "electron");
// The Electron main process writes its report to a file: on macOS its stdout
// never reaches this pipe, so "inherit" alone shows nothing at all.
const reportPath = join(dir, "report.txt");
writeFileSync(reportPath, "");
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
