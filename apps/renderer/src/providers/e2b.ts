import { Sandbox } from "@e2b/code-interpreter";
import { signRenderToken } from "@genmotion/shared/render-token";
import type { RenderProvider } from "./types";

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
 * Runs every job — MP4 renders AND thumbnails — inside a fresh E2B sandbox. The
 * sandbox is credential-less: it gets only the public API URL and a short-lived,
 * scoped token, and talks to the render control-plane over HTTP (no DB/R2
 * secrets). The worker holds no Chromium at all, so it stays lean.
 */
export class E2BRenderProvider implements RenderProvider {
  constructor(private readonly opts: E2BProviderOptions) {}

  warmup(): Promise<void> {
    // Sandboxes spin up per job; nothing to warm on the worker.
    return Promise.resolve();
  }

  renderJob(exportJobId: string): Promise<void> {
    return this.runInSandbox("render", exportJobId, "render");
  }

  renderThumbnail(projectId: string): Promise<void> {
    return this.runInSandbox("thumbnail", projectId, "thumbnail");
  }

  private async runInSandbox(
    command: "render" | "thumbnail",
    id: string,
    scope: "render" | "thumbnail",
  ): Promise<void> {
    const token = signRenderToken(id, this.opts.secret, {
      scope,
      ttlSeconds: Math.ceil(this.opts.timeoutMs / 1000) + 60,
    });
    const envs = { API_URL: this.opts.apiUrl, RENDER_JOB_TOKEN: token };

    const sandbox = await Sandbox.create(this.opts.template, {
      apiKey: this.opts.apiKey,
      timeoutMs: this.opts.timeoutMs,
      envs,
    });
    try {
      const result = await sandbox.commands.run(
        `${this.opts.cliCommand} ${command} ${id}`,
        {
          timeoutMs: this.opts.timeoutMs,
          envs,
          onStdout: (data) => {
            process.stdout.write(`[sandbox ${command} ${id}] ${data}`);
          },
          onStderr: (data) => {
            process.stderr.write(`[sandbox ${command} ${id}] ${data}`);
          },
        },
      );
      if (result.exitCode !== 0) {
        throw new Error(`render CLI (${command}) exited with ${result.exitCode}`);
      }
    } finally {
      await sandbox.kill();
    }
  }

  dispose(): Promise<void> {
    return Promise.resolve();
  }
}
