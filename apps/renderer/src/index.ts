import { PgBoss } from "pg-boss";
import { eq, db, schema } from "@genmotion/db";
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

  // Run up to RENDER_CONCURRENCY renders at once. Each worker pulls one job at a
  // time (Postgres SKIP LOCKED prevents double-processing), so N registrations
  // means up to N renders in parallel — for the e2b/docker providers that's N
  // isolated sandboxes (one per render). The local provider shares a single
  // browser, so keep concurrency at 1 there unless the box is beefy.
  const concurrency = Math.min(
    32,
    Math.max(1, Math.floor(Number(process.env.RENDER_CONCURRENCY) || 1)),
  );
  console.log(
    `Render concurrency: ${concurrency} (${resolveProviderKind()} provider).`,
  );
  const renderHandler = async (
    jobs: Array<{ data: { exportJobId: string } }>,
  ) => {
    for (const job of jobs) {
      const id = job.data.exportJobId;
      // Skip if the user cancelled it after it was enqueued. The API removes the
      // job from the queue on cancel, but a worker may have already dequeued it,
      // so re-check status here. (Retries still work: a "failed" job re-runs.)
      const [row] = await db
        .select({ status: schema.exportJobs.status })
        .from(schema.exportJobs)
        .where(eq(schema.exportJobs.id, id));
      if (!row || row.status === "cancelled") {
        console.log(`[render] skipping job ${id} — cancelled`);
        continue;
      }
      console.log(`[render] picked up job ${id}`);
      await provider.renderJob(id);
    }
  };
  for (let i = 0; i < concurrency; i++) {
    await boss.work<{ exportJobId: string }>(
      RENDER_QUEUE,
      { batchSize: 1 },
      renderHandler,
    );
  }

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
