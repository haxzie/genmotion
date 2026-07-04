import { PgBoss } from "pg-boss";
import { count, eq, sql, db, schema } from "@genmotion/db";
import { createRenderProvider, resolveProviderKind } from "./providers";

const RENDER_QUEUE = "render-mp4";
const THUMBNAIL_QUEUE = "render-thumbnail";
const LOCAL_DB_FALLBACK = "postgres://genmotion:genmotion@localhost:5433/genmotion";

/** host:port/db from a connection string, with credentials stripped. */
function describeDb(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

/** Verify the app DB (used by the cancel guard + local provider) is reachable. */
async function pingAppDb(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch (err) {
    console.error(
      "[db] app connection FAILED:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/** Log the current backlog: pg-boss queue depth + export_jobs status breakdown. */
async function logBacklog(boss: PgBoss, label: string): Promise<void> {
  try {
    const [render, thumb] = await Promise.all([
      boss.getQueueStats(RENDER_QUEUE),
      boss.getQueueStats(THUMBNAIL_QUEUE),
    ]);
    console.log(
      `[${label}] queues — ${RENDER_QUEUE}: ${render.queuedCount} queued, ${render.activeCount} active` +
        ` | ${THUMBNAIL_QUEUE}: ${thumb.queuedCount} queued, ${thumb.activeCount} active`,
    );
  } catch (err) {
    console.warn(
      `[${label}] could not read queue stats:`,
      err instanceof Error ? err.message : err,
    );
  }
  try {
    const rows = await db
      .select({ status: schema.exportJobs.status, n: count() })
      .from(schema.exportJobs)
      .groupBy(schema.exportJobs.status);
    const summary = rows.length
      ? rows.map((r) => `${r.status}=${r.n}`).join(", ")
      : "none";
    console.log(`[${label}] export_jobs by status: ${summary}`);
  } catch (err) {
    console.warn(
      `[${label}] could not read export_jobs:`,
      err instanceof Error ? err.message : err,
    );
  }
}

async function main() {
  const kind = resolveProviderKind();
  console.log(
    `[startup] GenMotion renderer worker — provider="${kind}", node ${process.version}`,
  );

  // Resolve the DB target and make a missing DATABASE_URL loud (the silent
  // localhost fallback in prod is a classic "worker polls the wrong/empty DB").
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    console.log(`[db] target: ${describeDb(databaseUrl)}`);
  } else {
    console.warn(
      `[db] DATABASE_URL is NOT set — falling back to ${describeDb(LOCAL_DB_FALLBACK)}. ` +
        "In production this MUST be the same Postgres the API enqueues into, " +
        "or the worker will never see any jobs.",
    );
  }

  // App DB reachability (needed by the cancel guard on every pickup, and by the
  // local provider's DB reads). e2b/docker renders otherwise go via the API.
  console.log(`[db] app connection: ${(await pingAppDb()) ? "OK" : "UNAVAILABLE"}`);

  const provider = createRenderProvider();
  await provider.warmup?.();
  console.log(`[startup] provider ready ("${kind}").`);

  const boss = new PgBoss(databaseUrl ?? LOCAL_DB_FALLBACK);
  boss.on("error", (err: Error) => console.error("[pg-boss]", err));
  await boss.start();
  console.log("[pg-boss] connected + started.");
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
  console.log(`[startup] render concurrency: ${concurrency} (${kind} provider).`);

  // Show what's already waiting so a backlog is visible the moment we boot.
  await logBacklog(boss, "startup");

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
      if (!row) {
        console.warn(`[render] job ${id} has no export_jobs row — skipping`);
        continue;
      }
      if (row.status === "cancelled") {
        console.log(`[render] skipping job ${id} — cancelled`);
        continue;
      }

      console.log(`[render] picked up job ${id} (status=${row.status})`);
      const startedAt = Date.now();
      try {
        await provider.renderJob(id);
        console.log(
          `[render] finished job ${id} in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
        );
      } catch (err) {
        // Re-throw so pg-boss records the failure and retries per its policy.
        console.error(
          `[render] job ${id} FAILED after ${((Date.now() - startedAt) / 1000).toFixed(1)}s:`,
          err instanceof Error ? err.message : err,
        );
        throw err;
      }
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
        try {
          await provider.renderThumbnail(job.data.projectId);
        } catch (err) {
          console.error(
            `[thumbnail] project ${job.data.projectId} failed:`,
            err instanceof Error ? err.message : err,
          );
          throw err;
        }
      }
    },
  );

  console.log(
    `[startup] listening for jobs — ${RENDER_QUEUE} (x${concurrency}) + ${THUMBNAIL_QUEUE}.`,
  );

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
