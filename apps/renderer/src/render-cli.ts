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
import { runRenderJobViaApi } from "./render-remote";

async function main() {
  const [command, id] = process.argv.slice(2);
  if (!command || !id) {
    console.error("usage: render-cli <render|thumbnail> <id>");
    process.exit(2);
  }

  // API mode: a per-job token means we talk to the render control-plane over
  // HTTP (no DB/R2 creds) — how a remote sandbox runs. Otherwise render against
  // the DB directly (the trusted local worker).
  const token = process.env.RENDER_JOB_TOKEN;
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  const browser = await launchBrowser();
  try {
    if (command === "render") {
      if (token) {
        if (!apiUrl) throw new Error("API_URL is required in render token mode");
        await runRenderJobViaApi(browser, id, { apiUrl, token });
      } else {
        await runRenderJob(browser, id);
      }
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
