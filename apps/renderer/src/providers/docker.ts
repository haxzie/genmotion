import { spawn } from "node:child_process";
import { signRenderToken } from "@genmotion/shared/render-token";
import type { RenderProvider } from "./types";
import { LocalRenderProvider } from "./local";

export interface DockerProviderOptions {
  /** Local image to run — same layout as the E2B template (repo at /app). */
  image: string;
  /** Hard cap for the render command. */
  timeoutMs: number;
  /** API base URL the container calls; use host.docker.internal in dev. */
  apiUrl: string;
  /** Shared secret used to sign the per-job render token. */
  secret: string;
  /** Command that runs the one-shot render CLI inside the image. */
  cliCommand: string;
}

/**
 * Runs each MP4 render in a throwaway local Docker container — a faithful,
 * offline mirror of the E2B provider for developing/testing the credential-less
 * render path. The container gets only API_URL + a per-job token (no DB/R2), and
 * `--add-host host.docker.internal:host-gateway` lets it reach the API on the
 * host. Thumbnails run on the trusted worker (local browser).
 */
export class DockerRenderProvider implements RenderProvider {
  private readonly local = new LocalRenderProvider();

  constructor(private readonly opts: DockerProviderOptions) {}

  warmup(): Promise<void> {
    return this.local.warmup();
  }

  renderJob(exportJobId: string): Promise<void> {
    const token = signRenderToken(
      exportJobId,
      this.opts.secret,
      Math.ceil(this.opts.timeoutMs / 1000) + 60,
    );
    const args = [
      "run",
      "--rm",
      "--add-host",
      "host.docker.internal:host-gateway",
      "-e",
      `API_URL=${this.opts.apiUrl}`,
      "-e",
      `RENDER_JOB_TOKEN=${token}`,
      this.opts.image,
      ...this.opts.cliCommand.split(" ").filter(Boolean),
      "render",
      exportJobId,
    ];

    return new Promise<void>((resolve, reject) => {
      const proc = spawn("docker", args, { stdio: "inherit" });
      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        reject(new Error(`docker render timed out after ${this.opts.timeoutMs}ms`));
      }, this.opts.timeoutMs);
      proc.on("close", (code) => {
        clearTimeout(timer);
        code === 0
          ? resolve()
          : reject(new Error(`docker render exited with ${code}`));
      });
      proc.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  renderThumbnail(projectId: string): Promise<void> {
    return this.local.renderThumbnail(projectId);
  }

  dispose(): Promise<void> {
    return this.local.dispose();
  }
}
