/**
 * Capture each template's poster — the image the gallery card shows.
 *
 * One frame of the first scene, through the same player the editor preview and
 * the export both drive, so the card is the composition rather than an
 * approximation of it. Headless Chromium via Playwright: the desktop app's own
 * capture needs an Electron window, which a package script has no way to open.
 *
 *   pnpm --filter @genmotion/templates poster            # every template
 *   pnpm --filter @genmotion/templates poster stat-drop  # just one
 */
import path from "node:path";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { createSceneBundler } from "@genmotion/project";
import { TEMPLATE_INLINE_LIMIT, getTemplate, listTemplateIds, templatePosterPath } from "../src/index.ts";
import { hostBundle } from "./lib/render-host-bundle.mjs";

/**
 * Where in the scene to sample. Entrances have settled by 60% and exits have
 * generally not started, so this lands on the scene's actual content — the
 * same point the desktop thumbnail picks, for the same reason.
 */
const SAMPLE_AT = 0.6;

/** Wide enough for a retina gallery card, small enough to keep in git. */
const POSTER_WIDTH = 960;

const PAGE_SHELL = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #000; overflow: hidden; }
</style></head><body><div id="root"></div></body></html>`;

async function capture(browser, host, id) {
  const record = await getTemplate(id);
  if (!record) throw new Error(`No such template: ${id}`);

  const entry = record.manifest.scenes[0];
  if (!entry) throw new Error(`${id} has no scenes`);

  const bundler = createSceneBundler({
    projectDir: record.dir,
    inlineAssetLimit: TEMPLATE_INLINE_LIMIT,
    assetUrlPrefix: "gm-template-asset://",
  });
  let built;
  try {
    built = await bundler.bundle(entry.file);
  } finally {
    await bundler.dispose();
  }
  if (!built.ok) throw new Error(`${id}/${entry.file}: ${built.error.message}`);

  const { fps, width, height } = record.manifest;
  // The composition is laid out at its real size and scaled down by CSS, so
  // text metrics and camera transforms are the ones the video will use — a
  // small viewport would reflow the layout into something else entirely.
  const scale = POSTER_WIDTH / width;
  const page = await browser.newPage({
    viewport: { width: POSTER_WIDTH, height: Math.round(height * scale) },
    deviceScaleFactor: 2,
  });

  try {
    await page.setContent(PAGE_SHELL);
    await page.addScriptTag({ content: host });

    const init = await page.evaluate(
      (payload) => window.__gmInit(payload),
      {
        scenes: [
          {
            id: entry.file,
            name: entry.name ?? entry.file,
            durationInFrames: entry.durationInFrames,
            compiledCode: built.code,
          },
        ],
        fps,
        width,
        height,
      },
    );
    if (init?.error) throw new Error(`${id}: ${init.error}`);

    await page.evaluate((s) => {
      const root = document.getElementById("root");
      root.style.transform = `scale(${s})`;
      root.style.transformOrigin = "top left";
    }, scale);

    const frame = Math.min(
      entry.durationInFrames - 1,
      Math.max(0, Math.round(entry.durationInFrames * (record.meta.sampleAt ?? SAMPLE_AT))),
    );
    // Resolves once React has committed and every registered asset reports
    // loaded — without it the capture races the first paint and comes back blank.
    await page.evaluate((n) => window.__gm.setFrame(n), frame);

    const jpeg = await page.screenshot({ type: "jpeg", quality: 82 });
    const target = templatePosterPath(id);
    await fs.writeFile(target, jpeg);
    console.log(`${id} → ${path.relative(process.cwd(), target)} (${Math.round(jpeg.length / 1024)}KB)`);
  } finally {
    await page.close();
  }
}

const wanted = process.argv.slice(2);
const ids = wanted.length ? wanted : await listTemplateIds();
const host = await hostBundle();
const browser = await chromium.launch();
try {
  for (const id of ids) await capture(browser, host, id);
} finally {
  await browser.close();
}
