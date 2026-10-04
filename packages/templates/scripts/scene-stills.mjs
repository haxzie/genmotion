/**
 * Capture the scene library's filmstrips — three frames per scene, side by
 * side, at the fractions its `scenes.json` entry names (`sampleAt`).
 *
 * Three frames rather than one because an agent borrowing a scene needs to see
 * what *moves*: the entrance, the key moment and the settled state. A video
 * would say more but an agent can't watch one; a strip it can read in a single
 * image.
 *
 *   pnpm --filter @genmotion/templates scene-stills                 # every template with a scenes.json
 *   pnpm --filter @genmotion/templates scene-stills stripe-payment-links-launch-video
 */
import path from "node:path";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { createSceneBundler } from "@genmotion/project";
import { TEMPLATE_INLINE_LIMIT, getTemplate, listTemplateIds } from "../src/index.ts";
import { DEFAULT_SAMPLE_AT, readSceneSidecar, sceneStillPath } from "../src/scenes.ts";
import { hostBundle } from "./lib/render-host-bundle.mjs";

/** The long edge of one frame in the strip. Legible to a vision model, small in git. */
const FRAME_LONG_EDGE = 560;
const GAP = 6;

const PAGE_SHELL = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #000; overflow: hidden; }
</style></head><body><div id="root"></div></body></html>`;

async function frameShots(browser, record, entry, code, fractions) {
  const { fps, width, height } = record.manifest;
  const host = await hostBundle(record.manifest.engine);
  const scale = FRAME_LONG_EDGE / Math.max(width, height);
  const page = await browser.newPage({
    viewport: { width: Math.round(width * scale), height: Math.round(height * scale) },
    deviceScaleFactor: 1,
  });
  try {
    await page.setContent(PAGE_SHELL);
    await page.addScriptTag({ content: host });
    const init = await page.evaluate((payload) => window.__gmInit(payload), {
      scenes: [{ id: entry.file, name: entry.name ?? entry.file, durationInFrames: entry.durationInFrames, compiledCode: code }],
      fps,
      width,
      height,
    });
    if (init?.error) throw new Error(init.error);
    await page.evaluate((s) => {
      const root = document.getElementById("root");
      root.style.transform = `scale(${s})`;
      root.style.transformOrigin = "top left";
    }, scale);

    const shots = [];
    for (const f of fractions) {
      const frame = Math.min(entry.durationInFrames - 1, Math.max(0, Math.round(entry.durationInFrames * f)));
      await page.evaluate((n) => window.__gm.setFrame(n), frame);
      shots.push((await page.screenshot({ type: "png", timeout: 180_000 })).toString("base64"));
    }
    return { shots, w: Math.round(width * scale), h: Math.round(height * scale) };
  } finally {
    await page.close();
  }
}

/** Lay the three frames out in a row and take one JPEG of the row. */
async function strip(browser, { shots, w, h }) {
  const total = w * shots.length + GAP * (shots.length - 1);
  const page = await browser.newPage({ viewport: { width: total, height: h }, deviceScaleFactor: 1 });
  try {
    await page.setContent(
      `<!DOCTYPE html><html><body style="margin:0;background:#111;display:flex;gap:${GAP}px">${shots
        .map((b64) => `<img src="data:image/png;base64,${b64}" width="${w}" height="${h}">`)
        .join("")}</body></html>`,
    );
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    return await page.screenshot({ type: "jpeg", quality: 72 });
  } finally {
    await page.close();
  }
}

async function capture(browser, id) {
  const record = await getTemplate(id);
  if (!record) throw new Error(`No such template: ${id}`);
  const sidecar = await readSceneSidecar(record);
  if (!sidecar) return;
  const bundler = createSceneBundler({
    projectDir: record.dir,
    inlineAssetLimit: TEMPLATE_INLINE_LIMIT,
    assetUrlPrefix: "gm-template-asset://",
  });
  try {
    await fs.mkdir(path.join(record.dir, "stills"), { recursive: true });
    for (const entry of record.manifest.scenes) {
      const curated = sidecar.scenes.find((s) => s.file === entry.file);
      if (!curated) continue;
      const built = await bundler.bundle(entry.file);
      if (!built.ok) {
        console.error(`${id}/${entry.file}: ${built.error.message}`);
        continue;
      }
      try {
        const shots = await frameShots(browser, record, entry, built.code, curated.sampleAt ?? DEFAULT_SAMPLE_AT);
        const jpeg = await strip(browser, shots);
        const target = sceneStillPath(record, entry.file);
        await fs.writeFile(target, jpeg);
        console.log(`${id}/${entry.file} → ${Math.round(jpeg.length / 1024)}KB`);
      } catch (err) {
        console.error(`${id}/${entry.file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    await bundler.dispose();
  }
}

const wanted = process.argv.slice(2);
const ids = wanted.length ? wanted : await listTemplateIds();
// `PLAYWRIGHT_CHROMIUM_PATH` for a machine whose preinstalled Chromium doesn't
// match the pinned Playwright's (a CI image, a cloud container).
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  for (const id of ids) await capture(browser, id);
} finally {
  await browser.close();
}
