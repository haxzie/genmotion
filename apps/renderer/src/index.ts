import { PgBoss } from "pg-boss";
import { createRenderProvider, resolveProviderKind } from "./providers";

const RENDER_QUEUE = "render-mp4";
const THUMBNAIL_QUEUE = "render-thumbnail";

async function main() {
  // The provider decides WHERE renders run (in-process vs an E2B sandbox);
  // switch it with RENDER_PROVIDER. The worker's queue plumbing is identical.
  const provider = createRenderProvider();
  console.log(`Renderer worker using the "${resolveProviderKind()}" provider.`);
  await provider.warmup?.();

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
        await provider.renderJob(job.data.exportJobId);
      }
    },
  );

  await boss.work<{ projectId: string }>(
    THUMBNAIL_QUEUE,
    { batchSize: 1 },
    async (jobs: Array<{ data: { projectId: string } }>) => {
      for (const job of jobs) {
        await provider.renderThumbnail(job.data.projectId);
      }
    },
  );

  console.log("GenMotion renderer worker listening for jobs.");

  const shutdown = async () => {
    await boss.stop();
    await provider.dispose();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Renderer failed to start:", err);
  process.exit(1);
});
