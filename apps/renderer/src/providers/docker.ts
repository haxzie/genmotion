import { spawn } from "node:child_process";
import { signRenderToken } from "@genmotion/shared/render-token";
import type { RenderProvider } from "./types";

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
 * Runs every job — MP4 renders AND thumbnails — in a throwaway local Docker
 * container: a faithful, offline mirror of the E2B provider for developing and
 * testing the credential-less render path. The container gets only API_URL + a
 * scoped token (no DB/R2), and `--add-host host.docker.internal:host-gateway`
 * lets it reach the API on the host. The worker holds no Chromium.
 */
export class DockerRenderProvider implements RenderProvider {
  constructor(private readonly opts: DockerProviderOptions) {}

  warmup(): Promise<void> {
    return Promise.resolve();
  }

  renderJob(exportJobId: string): Promise<void> {
    return this.runInContainer("render", exportJobId, "render");
  }

  renderThumbnail(projectId: string): Promise<void> {
    return this.runInContainer("thumbnail", projectId, "thumbnail");
  }

  private runInContainer(
    command: "render" | "thumbnail",
    id: string,
    scope: "render" | "thumbnail",
  ): Promise<void> {
    const token = signRenderToken(id, this.opts.secret, {
      scope,
      ttlSeconds: Math.ceil(this.opts.timeoutMs / 1000) + 60,
    });
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
      command,
      id,
    ];

    return new Promise<void>((resolve, reject) => {
      const proc = spawn("docker", args, { stdio: "inherit" });
      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        reject(new Error(`docker ${command} timed out after ${this.opts.timeoutMs}ms`));
      }, this.opts.timeoutMs);
      proc.on("close", (code) => {
        clearTimeout(timer);
        code === 0
          ? resolve()
          : reject(new Error(`docker ${command} exited with ${code}`));
      });
      proc.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  dispose(): Promise<void> {
    return Promise.resolve();
  }
}
