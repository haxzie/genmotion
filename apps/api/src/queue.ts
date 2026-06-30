import { PgBoss } from "pg-boss";
import { env } from "./env";

export const RENDER_QUEUE = "render-mp4";
export const THUMBNAIL_QUEUE = "render-thumbnail";

let bossPromise: Promise<PgBoss> | null = null;

/** Shared pg-boss instance (lives in the same Postgres as the app data). */
export function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss(env.DATABASE_URL);
      boss.on("error", (err: Error) => console.error("[pg-boss]", err));
      await boss.start();
      await boss.createQueue(RENDER_QUEUE);
      await boss.createQueue(THUMBNAIL_QUEUE);
      return boss;
    })();
  }
  return bossPromise;
}

/**
 * Queue a thumbnail re-render for a project. Coalesced: at most one pending
 * job per project per 20s window, so bursts of edits don't pile up renders.
 */
export async function enqueueThumbnail(projectId: string): Promise<void> {
  try {
    const boss = await getBoss();
    await boss.send(THUMBNAIL_QUEUE, { projectId }, {
      singletonKey: projectId,
      singletonSeconds: 20,
    });
  } catch (err) {
    // Thumbnails are best-effort; never fail the request over them.
    console.warn("[thumbnail] enqueue failed:", err);
  }
}
