import { Sandbox } from "@e2b/code-interpreter";
import type { RenderProvider } from "./types";

export interface E2BProviderOptions {
  /** E2B template (image) that ships Chromium + ffmpeg + the render CLI. */
  template: string;
  /** E2B API key (falls back to the SDK's E2B_API_KEY lookup if omitted). */
  apiKey?: string;
  /** Hard cap for both the sandbox lifetime and the render command. */
  timeoutMs: number;
  /** Env forwarded into the sandbox so the render can reach Postgres + R2. */
  env: Record<string, string>;
  /**
   * Command that runs the one-shot render CLI inside the sandbox image. The job
   * kind and id are appended, e.g. `node /app/render-cli.mjs render <jobId>`.
   */
  cliCommand: string;
}

/**
 * Runs each render inside a fresh E2B sandbox. The sandbox image bundles the
 * same render pipeline the local provider runs in-process (Chromium + ffmpeg);
 * we just invoke its CLI, stream logs, then tear the sandbox down. Scales out
 * naturally (one sandbox per job) with no always-on renderer to maintain.
 */
export class E2BRenderProvider implements RenderProvider {
  constructor(private readonly opts: E2BProviderOptions) {}

  private async run(kind: "render" | "thumbnail", id: string): Promise<void> {
    const sandbox = await Sandbox.create(this.opts.template, {
      apiKey: this.opts.apiKey,
      timeoutMs: this.opts.timeoutMs,
      envs: this.opts.env,
    });
    try {
      const result = await sandbox.commands.run(
        `${this.opts.cliCommand} ${kind} ${id}`,
        {
          timeoutMs: this.opts.timeoutMs,
          envs: this.opts.env,
          onStdout: (data) => {
            process.stdout.write(`[sandbox ${id}] ${data}`);
          },
          onStderr: (data) => {
            process.stderr.write(`[sandbox ${id}] ${data}`);
          },
        },
      );
      if (result.exitCode !== 0) {
        throw new Error(
          `render CLI (${kind} ${id}) exited with ${result.exitCode}`,
        );
      }
    } finally {
      await sandbox.kill();
    }
  }

  renderJob(exportJobId: string): Promise<void> {
    return this.run("render", exportJobId);
  }

  renderThumbnail(projectId: string): Promise<void> {
    return this.run("thumbnail", projectId);
  }

  async dispose(): Promise<void> {
    // Sandboxes are per-job and torn down in `run`; nothing persistent to close.
  }
}
