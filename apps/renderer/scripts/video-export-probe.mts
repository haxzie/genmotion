/**
 * Does a <Video> in a scene actually advance in the export?
 *
 * Drives the real render path — the same `buildRenderHostBundle` + headless
 * Chromium + `setFrame` barrier + `Page.captureScreenshot` loop that
 * render-job.ts runs — over a synthetic clip whose every frame is visibly
 * different, then hashes each captured frame. Two consecutive identical hashes
 * mean the video did not move while the composition did: a stuck frame.
 *
 * Not a vitest test: it needs a browser, a real file server and ffmpeg, and it
 * is a diagnostic to read, not an assertion to keep green.
 *
 *   pnpm tsx scripts/video-export-probe.mts
 */
import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import { mkdtempSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { chromium, type Browser, type Page } from "playwright";
import { compileSceneToJs } from "@genmotion/compiler/node";
import { buildRenderHostBundle } from "../src/build-host";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;

const FPS = 30;
const WIDTH = 640;
const HEIGHT = 360;
/** 3 seconds of composition — long enough to see the video stall, short to run. */
const FRAMES = FPS * 3;

const PAGE_SHELL = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #000; overflow: hidden; }
</style></head><body><div id="root"></div></body></html>`;

/** A clip whose every frame differs from the last, so a stall is unmistakable. */
function makeClip(dir: string, rate = FPS): string {
  const out = join(dir, `clip-${rate}.mp4`);
  const res = spawnSync(FFMPEG, [
    "-y",
    "-f", "lavfi",
    "-i", `testsrc=size=${WIDTH}x${HEIGHT}:rate=${rate}:duration=6`,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-g", "15",
    out,
  ]);
  if (res.status !== 0) throw new Error(`ffmpeg failed: ${res.stderr?.toString().slice(-400)}`);
  return out;
}

/**
 * Serve the clip over HTTP. `ranges: false` answers every request with the whole
 * file and no `Accept-Ranges`, which is how plenty of real hosts behave — worth
 * testing separately, because seeking is the entire mechanism here.
 */
async function serveClip(file: string, ranges: boolean) {
  const size = statSync(file).size;
  const server = http.createServer((req, res) => {
    const range = ranges ? req.headers.range : undefined;
    if (!range) {
      res.writeHead(200, {
        "content-type": "video/mp4",
        "content-length": String(size),
        ...(ranges ? { "accept-ranges": "bytes" } : {}),
        "access-control-allow-origin": "*",
      });
      createReadStream(file).pipe(res);
      return;
    }
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = Number(match?.[1] ?? 0);
    const end = match?.[2] ? Number(match[2]) : size - 1;
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

const sceneCode = (src: string, extra = "") => `
import { AbsoluteFill, Video, useCurrentFrame } from "@genmotion/motion";

export default function Scene() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#101014" }}>
      <Video id="clip" src="${src}"${extra} />
      <div id="counter" style={{ position: "absolute", left: 8, top: 8, color: "#fff", fontSize: 24 }}>
        {frame}
      </div>
    </AbsoluteFill>
  );
}
`;

/**
 * Capture straight to an MP4 the way the exporter does — JPEG frames piped into
 * ffmpeg — then decode it back and count distinct frames. The hash probes read
 * what the browser painted; this reads what actually lands in the file.
 */
async function encodeAndVerify(browser: Browser, code: string, dir: string, clipPath: string) {
  const frames = join(dir, "frames");
  spawnSync("mkdir", ["-p", frames]);
  const compiled = await compileSceneToJs(code);
  if (!compiled.ok) throw new Error("compile failed");

  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.setContent(PAGE_SHELL, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ content: await buildRenderHostBundle() });
  await page.evaluate(
    (payload) => window.__gmInit(payload),
    {
      scenes: [
        { id: "s1", name: "Video scene", durationInFrames: FRAMES, compiledCode: compiled.code },
      ],
      fps: FPS,
      width: WIDTH,
      height: HEIGHT,
    },
  );
  const cdp = await context.newCDPSession(page);
  for (let frame = 0; frame < FRAMES; frame++) {
    await page.evaluate((f) => window.__gm!.setFrame(f), frame);
    const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92 });
    writeFileSync(join(frames, `f${String(frame).padStart(4, "0")}.jpg`), Buffer.from(shot.data, "base64"));
  }
  await context.close();

  const out = join(dir, "export.mp4");
  const enc = spawnSync(FFMPEG, [
    "-y", "-framerate", String(FPS), "-i", join(frames, "f%04d.jpg"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", out,
  ]);
  if (enc.status !== 0) throw new Error(`encode failed: ${enc.stderr?.toString().slice(-400)}`);

  // Compare the finished file's motion against the SOURCE clip's motion.
  //
  // Not by hashing: h.264 is lossy, so a duplicated frame re-encoded and decoded
  // back differs in the last bit or two and hashes unique whether the video
  // moved or not — the false pass this check gave on its first attempt. Nor by
  // an absolute pixel-difference threshold: `testsrc` changes only a small part
  // of the frame, so its own honest frame-to-frame difference is ~0.4 grey
  // levels, and a threshold picked in advance called every real frame a
  // duplicate — the false FAILURE it gave on its second. The source clip is the
  // only fair reference. A frame that stalled shows a difference far below
  // anything the source ever produces; a frame that moved sits in the source's
  // own range.
  const exportDiffs = frameDiffs(out);
  const sourceDiffs = frameDiffs(clipPath);
  const floor = Math.min(...sourceDiffs) * 0.5;
  const stalled = exportDiffs.filter((d) => d < floor).length;
  return { out, total: exportDiffs.length + 1, stalled, floor, exportDiffs, sourceDiffs };
}

/** Mean absolute grey-level difference between each frame and the one before. */
function frameDiffs(file: string): number[] {
  const W = 320;
  const H = 180;
  const raw = spawnSync(
    FFMPEG,
    [
      "-i", file,
      "-vf", `crop=${WIDTH}:${HEIGHT - 60}:0:60,scale=${W}:${H}`,
      "-pix_fmt", "gray",
      "-f", "rawvideo", "-",
    ],
    { maxBuffer: 1 << 28 },
  );
  if (raw.status !== 0) throw new Error(`decode failed: ${raw.stderr?.toString().slice(-300)}`);
  const bytes = raw.stdout as Buffer;
  const size = W * H;
  const count = Math.min(FRAMES, Math.floor(bytes.length / size));
  const diffs: number[] = [];
  for (let i = 1; i < count; i++) {
    let sum = 0;
    for (let px = 0; px < size; px++) {
      sum += Math.abs(bytes[i * size + px]! - bytes[(i - 1) * size + px]!);
    }
    diffs.push(sum / size);
  }
  return diffs;
}

const summarise = (d: number[]) => {
  const s = [...d].sort((a, b) => a - b);
  return `min ${s[0]?.toFixed(2)} med ${s[Math.floor(s.length / 2)]?.toFixed(2)} max ${s[s.length - 1]?.toFixed(2)}`;
};

/** Frame hashes for one scene, captured exactly as the exporter captures. */
async function capture(browser: Browser, code: string): Promise<string[]> {
  const compiled = await compileSceneToJs(code);
  if (!compiled.ok) throw new Error(`compile failed: ${JSON.stringify(compiled.error)}`);

  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page: Page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setContent(PAGE_SHELL, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ content: await buildRenderHostBundle() });

  const init = await page.evaluate(
    (payload) => window.__gmInit(payload),
    {
      scenes: [
        { id: "s1", name: "Video scene", durationInFrames: FRAMES, compiledCode: compiled.code },
      ],
      fps: FPS,
      width: WIDTH,
      height: HEIGHT,
    },
  );
  if (init.error) throw new Error(init.error);

  const cdp = await context.newCDPSession(page);
  const hashes: string[] = [];
  for (let frame = 0; frame < FRAMES; frame++) {
    await page.evaluate((f) => window.__gm!.setFrame(f), frame);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    // Hash the video's own region only — the frame counter in the corner
    // changes every frame and would mask a completely frozen video.
    const region = await cdp.send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 60, width: WIDTH, height: HEIGHT - 60, scale: 1 },
    });
    void shot;
    hashes.push(createHash("sha1").update(region.data).digest("hex").slice(0, 12));
  }
  await context.close();
  if (errors.length) console.log("  page errors:", errors.slice(0, 3));
  return hashes;
}

/** Runs of consecutive identical hashes — each run longer than 1 is a stall. */
function stalls(hashes: string[]): { at: number; length: number }[] {
  const out: { at: number; length: number }[] = [];
  let start = 0;
  for (let i = 1; i <= hashes.length; i++) {
    if (i < hashes.length && hashes[i] === hashes[start]) continue;
    if (i - start > 1) out.push({ at: start, length: i - start });
    start = i;
  }
  return out;
}

/**
 * `expected` is how many distinct frames the source can actually supply over the
 * captured window. A 24fps clip in a 30fps composition genuinely repeats frames
 * — that is correct resampling, not a stall — so the bar has to move with it.
 */
function report(label: string, hashes: string[], expected = hashes.length) {
  const unique = new Set(hashes).size;
  const runs = stalls(hashes);
  const frozen = runs.reduce((n, r) => n + r.length - 1, 0);
  console.log(`\n${label}`);
  console.log(`  distinct frames : ${unique}/${hashes.length}  (expected ~${expected})`);
  console.log(`  repeated frames : ${frozen}`);
  if (runs.length) {
    console.log(
      `  stalls          : ${runs
        .slice(0, 8)
        .map((r) => `f${r.at}×${r.length}`)
        .join(", ")}${runs.length > 8 ? ` … +${runs.length - 8}` : ""}`,
    );
  }
  console.log(`  verdict         : ${unique >= expected ? "OK — advancing as fast as the source can" : "STUCK"}`);
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "gm-video-probe-"));
  const clip = makeClip(dir);
  console.log(`clip: ${clip}`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--force-color-profile=srgb", "--font-render-hinting=none"],
  });

  try {
    for (const ranges of [true, false]) {
      const server = await serveClip(clip, ranges);
      try {
        const label = ranges ? "Range requests supported" : "NO range support (whole-file responses)";
        report(label, await capture(browser, sceneCode(server.url)));
      } finally {
        server.close();
      }
    }

    // A second pass with the clip started part-way in, which is what `startFrom`
    // does on any trimmed clip.
    const server = await serveClip(clip, true);
    try {
      report(
        "startFrom={2} (Range supported)",
        await capture(browser, sceneCode(server.url, " startFrom={2}")),
      );

    } finally {
      server.close();
    }

    // Sources whose frame rate isn't the composition's. A 24fps clip can only
    // supply 72 distinct frames across 90 composition frames — repeats there are
    // the pulldown, not a stall.
    for (const rate of [24, 60]) {
      const mismatched = await serveClip(makeClip(dir, rate), true);
      try {
        report(
          `${rate}fps source in a ${FPS}fps composition`,
          await capture(browser, sceneCode(mismatched.url)),
          Math.min(FRAMES, Math.ceil((FRAMES / FPS) * rate)),
        );
      } finally {
        mismatched.close();
      }
    }
    // End to end: an actual encoded MP4, decoded back and counted.
    const final = await serveClip(clip, true);
    try {
      const enc = await encodeAndVerify(browser, sceneCode(final.url), dir, clip);
      console.log(`\nENCODED MP4 vs the source clip's own motion`);
      console.log(`  source motion   : ${summarise(enc.sourceDiffs)}`);
      console.log(`  export motion   : ${summarise(enc.exportDiffs)}`);
      console.log(`  stall floor     : ${enc.floor.toFixed(3)} (half the source's quietest frame)`);
      console.log(`  stalled frames  : ${enc.stalled}/${enc.total}`);
      console.log(`  verdict         : ${enc.stalled === 0 ? "OK — the export moves like the source" : "STUCK"}`);
      console.log(`  file            : ${enc.out}`);
    } finally {
      final.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
