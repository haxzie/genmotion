import type { Browser } from "playwright";
import { launchBrowser } from "../browser";
import { buildRenderHostBundle } from "../build-host";
import { runRenderJob, runThumbnailJob } from "../render-job";
import type { RenderProvider } from "./types";

/**
 * Runs renders in THIS process with a single reused headless Chromium, kept warm
 * from startup for fast exports. Selected with RENDER_PROVIDER=local — the right
 * choice for a dedicated always-on worker (VPS/container). The e2b/docker
 * providers instead offload every job to a sandbox, so they never touch this.
 */
export class LocalRenderProvider implements RenderProvider {
  private browserPromise: Promise<Browser> | null = null;

  private browser(): Promise<Browser> {
    if (!this.browserPromise) this.browserPromise = launchBrowser();
    return this.browserPromise;
  }

  async warmup(): Promise<void> {
    await buildRenderHostBundle();
    await this.browser();
  }

  async renderJob(exportJobId: string): Promise<void> {
    await runRenderJob(await this.browser(), exportJobId);
  }

  async renderThumbnail(projectId: string): Promise<void> {
    await runThumbnailJob(await this.browser(), projectId);
  }

  async dispose(): Promise<void> {
    if (!this.browserPromise) return;
    const browser = this.browserPromise;
    this.browserPromise = null;
    try {
      await (await browser).close();
    } catch {
      /* already gone */
    }
  }
}
