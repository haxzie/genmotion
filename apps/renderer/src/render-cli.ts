/**
 * One-shot render entrypoint. Runs a single job in-process against a freshly
 * launched Chromium, then exits. This is what the E2B sandbox image invokes:
 *   node render-cli.mjs render <exportJobId>
 *   node render-cli.mjs thumbnail <projectId>
 *
 * The render pipeline updates the export job's DB status itself, so a non-zero
 * exit here signals an infrastructure failure (browser/ffmpeg/setup), not a
 * "the scene failed to render" outcome.
 */
import { launchBrowser } from "./browser";
import { runRenderJob, runThumbnailJob } from "./render-job";

async function main() {
  const [command, id] = process.argv.slice(2);
  if (!command || !id) {
    console.error("usage: render-cli <render|thumbnail> <id>");
    process.exit(2);
  }

  const browser = await launchBrowser();
  try {
    if (command === "render") {
      await runRenderJob(browser, id);
    } else if (command === "thumbnail") {
      await runThumbnailJob(browser, id);
    } else {
      console.error(`unknown command "${command}" (expected render|thumbnail)`);
      process.exit(2);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("render-cli failed:", err);
  process.exit(1);
});
