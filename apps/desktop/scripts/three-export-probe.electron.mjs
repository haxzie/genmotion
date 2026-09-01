/**
 * Electron half of the three.js export probe — see three-export-probe.mts.
 *
 * Drives the desktop export path itself: the offscreen BrowserWindow, the same
 * render-host bundle, setFrame → capturePage.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import { app, BrowserWindow } from "electron";

const payload = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const REPORT = process.argv[3];
const log = (m) => fs.appendFileSync(REPORT, `${m}\n`);
process.on("uncaughtException", (e) => log(`UNCAUGHT: ${e.stack ?? e}`));

const W = 960, H = 540, FPS = 30;
const FRAMES = payload.frames;
const PAGE_SHELL = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #000; overflow: hidden; }
</style></head><body><div id="root"></div></body></html>`;

/** Mean luminance of the centre box — a black frame means nothing was drawn. */
function centreLuma(image) {
  const { width, height } = image.getSize();
  const buf = image.toBitmap(); // BGRA
  let sum = 0, n = 0;
  for (let y = (height * 0.3) | 0; y < (height * 0.7) | 0; y += 4) {
    for (let x = (width * 0.3) | 0; x < (width * 0.7) | 0; x += 4) {
      const i = (y * width + x) * 4;
      sum += 0.114 * buf[i] + 0.587 * buf[i + 1] + 0.299 * buf[i + 2];
      n++;
    }
  }
  return sum / n;
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: W, height: H, show: false,
    webPreferences: { offscreen: true, backgroundThrottling: false, nodeIntegration: false, contextIsolation: true },
  });
  try {
    await win.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(PAGE_SHELL)}`);
    await win.webContents.executeJavaScript(payload.hostBundle);
    const init = await win.webContents.executeJavaScript(
      `window.__gmInit(${JSON.stringify({ scenes: payload.scenes, fps: FPS, width: W, height: H })})`,
    );
    if (init?.error) throw new Error(`__gmInit: ${init.error}`);

    const hashes = new Set();
    const lumas = [];
    const t0 = Date.now();
    for (let f = 0; f < FRAMES; f++) {
      await win.webContents.executeJavaScript(`window.__gm.setFrame(${f})`);
      const image = await win.webContents.capturePage();
      hashes.add(createHash("sha1").update(image.toJPEG(92)).digest("hex").slice(0, 10));
      lumas.push(centreLuma(image));
      if (f === 0) {
        const s = image.getSize();
        // The canvas's backing store, not its CSS box: if this isn't DPR-sized
        // the 3D layer is being upscaled into a capture the DOM around it was
        // rasterised into at full resolution, and only the 3D looks soft.
        const buffer = await win.webContents.executeJavaScript(
          `(() => { const c = document.querySelector("canvas"); return c.width + "x" + c.height; })()`,
        );
        log(`capture ${s.width}x${s.height} from a ${W}x${H} window; canvas drawing buffer ${buffer}`);
      }
    }
    const ms = (Date.now() - t0) / FRAMES;
    log(`distinct frames ${hashes.size}/${FRAMES}   centre luma min=${Math.min(...lumas).toFixed(1)} max=${Math.max(...lumas).toFixed(1)}   ${ms.toFixed(0)}ms/frame`);
    log(hashes.size === FRAMES ? "PASS: every frame differs" : "FAIL: repeated captures");
    log(Math.max(...lumas) > 25 ? "PASS: 3D actually drew" : "FAIL: frames are black");
  } catch (err) {
    log(`FAILED: ${err.stack ?? err}`);
  } finally {
    if (!win.isDestroyed()) win.destroy();
    app.quit();
  }
});
