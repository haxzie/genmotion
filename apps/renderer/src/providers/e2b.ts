import { Sandbox } from "@e2b/code-interpreter";
import { signRenderToken } from "@genmotion/shared/render-token";
import type { RenderProvider } from "./types";
import { LocalRenderProvider } from "./local";

export interface E2BProviderOptions {
  /** E2B template (image) that ships Chromium + ffmpeg + the render CLI. */
  template: string;
  /** E2B API key (falls back to the SDK's E2B_API_KEY lookup if omitted). */
  apiKey?: string;
  /** Hard cap for both the sandbox lifetime and the render command. */
  timeoutMs: number;
  /** Public API base URL the sandbox calls (render control-plane). */
  apiUrl: string;
  /** Shared secret used to sign the per-job render token. */
  secret: string;
  /** Command that runs the one-shot render CLI inside the sandbox image. */
  cliCommand: string;
}

/**
 * Runs each MP4 render inside a fresh E2B sandbox. The sandbox is
 * credential-less: it gets only the public API URL and a short-lived per-job
 * token, and talks to the render control-plane over HTTP (no DB/R2 secrets).
 * Thumbnails stay on the trusted worker (local browser, direct DB) since they're
 * cheap and need DB access.
 */
export class E2BRenderProvider implements RenderProvider {
  private readonly local = new LocalRenderProvider();

  constructor(private readonly opts: E2BProviderOptions) {}

  warmup(): Promise<void> {
    // Warm the local browser used for thumbnails; sandboxes spin up per job.
    return this.local.warmup();
  }

  async renderJob(exportJobId: string): Promise<void> {
    const token = signRenderToken(
      exportJobId,
      this.opts.secret,
      Math.ceil(this.opts.timeoutMs / 1000) + 60,
    );
    const envs = { API_URL: this.opts.apiUrl, RENDER_JOB_TOKEN: token };

    const sandbox = await Sandbox.create(this.opts.template, {
      apiKey: this.opts.apiKey,
      timeoutMs: this.opts.timeoutMs,
      envs,
    });
    try {
      const result = await sandbox.commands.run(
        `${this.opts.cliCommand} render ${exportJobId}`,
        {
          timeoutMs: this.opts.timeoutMs,
          envs,
          onStdout: (data) => {
            process.stdout.write(`[sandbox ${exportJobId}] ${data}`);
          },
          onStderr: (data) => {
            process.stderr.write(`[sandbox ${exportJobId}] ${data}`);
          },
        },
      );
      if (result.exitCode !== 0) {
        throw new Error(`render CLI exited with ${result.exitCode}`);
      }
    } finally {
      await sandbox.kill();
    }
  }

  renderThumbnail(projectId: string): Promise<void> {
    return this.local.renderThumbnail(projectId);
  }

  dispose(): Promise<void> {
    return this.local.dispose();
  }
}
