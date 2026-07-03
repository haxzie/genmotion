import { readFileSync } from "node:fs";
import type { Browser } from "playwright";
import type { RenderJobPayload } from "@genmotion/shared";
import { renderCompositionToFile } from "./render-job";

/**
 * Remote (credential-less) render driver. Instead of touching Postgres or R2, it
 * talks to the API's render control-plane over HTTP with a short-lived per-job
 * token: fetch the payload, report progress, render via the shared core, and
 * POST the finished MP4 back (the API — which holds the R2 creds — stores it).
 * This is what runs inside an E2B / Docker sandbox, so the DB is never exposed.
 */
export async function runRenderJobViaApi(
  browser: Browser,
  exportJobId: string,
  opts: { apiUrl: string; token: string },
): Promise<void> {
  const base = opts.apiUrl.replace(/\/$/, "");
  const authHeaders = { authorization: `Bearer ${opts.token}` };

  const patch = (body: Record<string, unknown>) =>
    fetch(`${base}/api/render/jobs/${exportJobId}`, {
      method: "PATCH",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});

  const jobRes = await fetch(`${base}/api/render/jobs/${exportJobId}`, {
    headers: authHeaders,
  });
  if (!jobRes.ok) {
    throw new Error(`fetch render job failed: ${jobRes.status}`);
  }
  const payload = (await jobRes.json()) as RenderJobPayload;

  await patch({
    status: "rendering",
    progress: 0,
    startedAt: new Date().toISOString(),
  });

  try {
    const { finalPath, totalFrames, cleanup } = await renderCompositionToFile(
      browser,
      payload,
      {
        onProgress: (p) => void patch({ progress: p }),
        onPhase: (status) => void patch({ status }),
      },
    );
    try {
      await patch({ status: "uploading", progress: 96 });
      const mp4 = readFileSync(finalPath);
      const out = await fetch(
        `${base}/api/render/jobs/${exportJobId}/output?frames=${totalFrames}`,
        {
          method: "POST",
          headers: { ...authHeaders, "content-type": "video/mp4" },
          body: mp4,
        },
      );
      if (!out.ok) {
        throw new Error(`upload output failed: ${out.status}`);
      }
      console.log(`[render ${exportJobId}] done — ${totalFrames} frames (via API)`);
    } finally {
      cleanup();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[render ${exportJobId}] failed:`, message);
    await patch({
      status: "failed",
      error: message.slice(0, 2000),
      completedAt: new Date().toISOString(),
    });
    throw err;
  }
}
