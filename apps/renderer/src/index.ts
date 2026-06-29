import { chromium, type Browser } from "playwright";
import { PgBoss } from "pg-boss";
import { runRenderJob, runThumbnailJob } from "./render-job";
import { buildRenderHostBundle } from "./build-host";

const RENDER_QUEUE = "render-mp4";
const THUMBNAIL_QUEUE = "render-thumbnail";

async function main() {
  // Fail fast on missing pieces, warm the bundle cache.
  await buildRenderHostBundle();
  console.log("Render-host bundle built.");

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ["--force-color-profile=srgb", "--font-render-hinting=none"],
  });
  console.log("Headless Chromium ready.");

  const boss = new PgBoss(
    process.env.DATABASE_URL ??
      "postgres://genmotion:genmotion@localhost:5433/genmotion",
  );
  boss.on("error", (err: Error) => console.error("[pg-boss]", err));
  await boss.start();
  await boss.createQueue(RENDER_QUEUE);
  await boss.createQueue(THUMBNAIL_QUEUE);

  await boss.work<{ exportJobId: string }>(
    RENDER_QUEUE,
    { batchSize: 1 },
    async (jobs: Array<{ data: { exportJobId: string } }>) => {
      for (const job of jobs) {
        console.log(`[render] picked up job ${job.data.exportJobId}`);
        await runRenderJob(browser, job.data.exportJobId);
      }
    },
  );

  await boss.work<{ projectId: string }>(
    THUMBNAIL_QUEUE,
    { batchSize: 1 },
    async (jobs: Array<{ data: { projectId: string } }>) => {
      for (const job of jobs) {
        await runThumbnailJob(browser, job.data.projectId);
      }
    },
  );

  console.log("GenMotion renderer worker listening for jobs.");

  const shutdown = async () => {
    await boss.stop();
    await browser.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Renderer failed to start:", err);
  process.exit(1);
});
