/**
 * Electron half of the OSR video probe — see osr-video-probe.mts.
 *
 * Drives the real desktop export path (offscreen BrowserWindow, the same
 * render-host bundle, setFrame → capturePage) and reports, per variant:
 *
 *   decoded  — distinct hashes of the video drawn to a canvas IN THE PAGE.
 *              This is what the element has.
 *   captured — distinct hashes of the video's region of the captured bitmap.
 *              This is what lands in the export.
 *
 * Variants translate the wrapper by whole pixels and the crop follows that
 * offset, so a stale capture yields a byte-identical crop rather than one that
 * merely looks similar.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow, net, protocol } from "electron";

process.on("uncaughtException", (err) => {
  try { fs.appendFileSync(process.argv[3], `  UNCAUGHT: ${err.stack ?? err}\n`); } catch {}
});

const payload = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
// Electron's main process doesn't get its stdout piped through on macOS, so
// the report goes to a file the driver prints.
const REPORT = process.argv[3];

/**
 * Serve the project over `gm-asset://` exactly the way the app does — same
 * privileges, same net.fetch on a file URL. An http:// stand-in is a different
 * media loader, and this is a media bug.
 */
if (payload.assetRoot) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "gm-asset",
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
    },
  ]);
}
const { W, H, FPS, FRAMES, hostBundle, shell, variants } = payload;

const sha = (buf) => createHash("sha1").update(buf).digest("hex").slice(0, 10);
const log = (msg) => {
  fs.appendFileSync(REPORT, `${msg}\n`);
  process.stderr.write(`${msg}\n`);
};
/** Every await here can hang silently in an offscreen window; name the step. */
const step = (label, promise, ms = 20000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms: ${label}`)), ms),
    ),
  ]);

async function runVariant(variant) {
  // Per-variant window into the scene: the project probe renders a slice of a
  // long scene, the synthetic one renders the whole thing from 0.
  const frames = variant.frames ?? FRAMES;
  const from = variant.from ?? 0;
  const duration = variant.durationInFrames ?? frames;
  const win = new BrowserWindow({
    width: W,
    height: H,
    show: false,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.webContents.on("render-process-gone", (_e, details) =>
    log(`  RENDERER GONE: ${JSON.stringify(details)}`),
  );
  win.webContents.on("unresponsive", () => log("  renderer unresponsive"));
  const decoded = [];
  const captured = [];
  const times = [];
  let missedSeeks = 0;
  // Mean |Δ| between consecutive crops, the same measure that separates a
  // frozen video (~1) from a playing one (~6) in an exported file.
  let prevBitmap = null;
  let diffSum = 0;
  let diffCount = 0;
  try {
    log(`\n${variant.label}`);
    log("  loading shell…");
    // A fresh window immediately after destroying the last one can have its
    // first navigation aborted (ERR_FAILED -2); one retry settles it.
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(shell)}`;
    try {
      await step("loadURL", win.webContents.loadURL(url));
    } catch {
      await new Promise((r) => setTimeout(r, 500));
      await step("loadURL retry", win.webContents.loadURL(url));
    }
    log("  injecting host bundle…");
    await step("host bundle", win.webContents.executeJavaScript(hostBundle));
    log("  init…");
    const init = await step("__gmInit", win.webContents.executeJavaScript(
      `window.__gmInit(${JSON.stringify({
        scenes: variant.scenes ?? [
          { id: "s", name: variant.label, durationInFrames: duration, compiledCode: variant.code },
        ],
        fps: FPS,
        width: W,
        height: H,
      })})`,
    ));
    if (init?.error) throw new Error(`${variant.label}: ${init.error}`);

    for (let i = 0; i < frames; i++) {
      const frame = from + i;
      if (i % 10 === 0) log(`  frame ${frame}…`);
      await step(`setFrame(${frame})`, win.webContents.executeJavaScript(`window.__gm.setFrame(${frame})`));

      // What the element itself holds: draw the current video frame into a
      // small canvas and hash the pixels. Worth turning OFF (readDecoded:
      // false) when measuring the capture: drawImage() every frame pulls the
      // decoder along and can flatter a stall.
      const state = variant.readDecoded === false ? null : await step(`read state ${frame}`, win.webContents.executeJavaScript(`(() => {
        const v = document.querySelector("video");
        if (!v) return null;
        const c = document.createElement("canvas");
        c.width = 32; c.height = 18;
        const ctx = c.getContext("2d");
        ctx.drawImage(v, 0, 0, 32, 18);
        const d = ctx.getImageData(0, 0, 32, 18).data;
        let s = "";
        for (let i = 0; i < d.length; i += 4) s += d[i].toString(16).padStart(2, "0");
        return { t: v.currentTime, rs: v.readyState, d: v.duration, px: s };
      })()`));

      const image = await step(`capturePage ${frame}`, win.webContents.capturePage());
      const size = image.getSize();
      const dpr = size.width / W;
      // The wrapper's offset for this frame, so the crop tracks the moving box.
      const dx = variant.offsetPx ? frame % variant.offsetPx : 0;
      const box = variant.crop;
      const crop = image.crop({
        x: Math.round((box.x + dx) * dpr),
        y: Math.round(box.y * dpr),
        width: Math.round(box.width * dpr),
        height: Math.round(box.height * dpr),
      });

      captured.push(sha(crop.toPNG()));
      const bitmap = crop.getBitmap();
      if (prevBitmap && prevBitmap.length === bitmap.length) {
        let sum = 0;
        // Every 4th byte, one channel: enough signal, a quarter of the work.
        for (let i = 0; i < bitmap.length; i += 16) sum += Math.abs(bitmap[i] - prevBitmap[i]);
        diffSum += sum / (bitmap.length / 16);
        diffCount++;
      }
      prevBitmap = bitmap;
      if (state) {
        decoded.push(sha(Buffer.from(state.px)));
        times.push(state.t);
        // Only meaningful for a single scene: in whole-composition mode the
        // element's target is the SCENE-local frame, which this loop doesn't
        // know, so comparing against the global one would flag every frame.
        if (!variant.scenes) {
          const dur = Number.isFinite(state.d) && state.d > 0 ? state.d : Infinity;
          const want = (((frame + 0.5) / FPS) % dur);
          if (Math.abs(state.t - want) > 0.02) missedSeeks++;
        }
      }
    }
  } finally {
    if (!win.isDestroyed()) win.destroy();
    // Let the destroyed window's compositor go away before the next one opens.
    await new Promise((r) => setTimeout(r, 400));
  }

  log("  loop done");
  // Where the element sat, frame by frame: a currentTime that advances while
  // the decoded pixels repeat is a compositing problem, not a seek problem.
  // d= the element decoded the same pixels as the frame before; c= the capture
  // is byte-identical to the frame before. "d c" together is a real stall;
  // "c" alone is the capture lagging what the element already has.
  const trace = captured
    .map((hash, i) => {
      const t = times[i];
      const marks =
        (decoded[i] && decoded[i] === decoded[i - 1] ? "d" : "") +
        (hash === captured[i - 1] ? "c" : "");
      return `${from + i}${t === undefined ? "" : `:${t.toFixed(3)}`}${marks ? `[${marks}]` : ""}`;
    })
    .join(" ");
  log(`  frame trace (\`=\` marks an unchanged decode):\n    ${trace}`);
  // Longest run of consecutive identical captures — "stuck for N frames".
  let longest = 1;
  let run = 1;
  for (let i = 1; i < captured.length; i++) {
    run = captured[i] === captured[i - 1] ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  if (decoded.length > 0) {
    log(`  decoded by the element   : ${new Set(decoded).size}/${frames} distinct`);
  }
  log(`  mean change per frame    : ${(diffSum / Math.max(1, diffCount)).toFixed(3)} (crop ${variant.crop.width}x${variant.crop.height})`);
  log(`  captured into the export : ${new Set(captured).size}/${frames} distinct`);
  log(`  longest identical run    : ${longest} frame(s)`);
  if (!variant.scenes) log(`  seeks that missed target : ${missedSeeks}/${frames}`);
}

// Deliberately NOT calling disableHardwareAcceleration: the app doesn't, and
// GPU compositing is exactly the thing under suspicion here.
//
// `.then`, not top-level await: with an ESM main, Electron emits `ready` only
// after the entry module has finished evaluating, so awaiting whenReady() at
// the top level deadlocks the probe with no output at all.
// Destroying a variant's window leaves zero windows open, and Electron's
// default reaction to that is to quit — which ended the probe mid-run, after
// the last frame and before it could report anything.
app.on("window-all-closed", () => {});

app.whenReady().then(async () => {
  if (payload.assetRoot) {
    protocol.handle("gm-asset", async (request) => {
      const url = new URL(request.url);
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      const target = path.resolve(payload.assetRoot, relative);
      if (path.relative(payload.assetRoot, target).startsWith("..")) {
        return new Response("Forbidden", { status: 403 });
      }
      // Mirrors serveAssetFile() in electron/main.ts. Set GM_PROBE_LEGACY_RANGE=1
      // to get the old net.fetch(file://) behaviour back and watch the video
      // freeze — that is the bug this probe exists to pin.
      if (process.env.GM_PROBE_LEGACY_RANGE === "1") {
        return net.fetch(pathToFileURL(target).toString(), {
          headers: request.headers,
          bypassCustomProtocolHandlers: true,
        });
      }
      const size = fs.statSync(target).size;
      const m = /^bytes=(\d*)-(\d*)$/.exec((request.headers.get("range") ?? "").trim());
      const headers = {
        "content-type": target.endsWith(".mp4") ? "video/mp4" : "application/octet-stream",
        "accept-ranges": "bytes",
      };
      let status = 200;
      let start = 0;
      let end = size - 1;
      if (m) {
        start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2] || 0));
        end = m[1] ? (m[2] ? Math.min(Number(m[2]), size - 1) : size - 1) : size - 1;
        if (start <= end && start < size) {
          status = 206;
          headers["content-range"] = `bytes ${start}-${end}/${size}`;
        } else {
          start = 0;
          end = size - 1;
        }
      }
      headers["content-length"] = String(end - start + 1);
      return new Response(Readable.toWeb(createReadStream(target, { start, end })), {
        status,
        headers,
      });
    });
  }
  try {
    for (const variant of variants) await runVariant(variant);
  } catch (err) {
    log(`probe failed: ${err && err.stack ? err.stack : err}`);
    process.exitCode = 1;
  }
  app.quit();
});
