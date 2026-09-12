import path from "node:path";
import fs from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { GSAP_VERSION, HYPERFRAMES_VERSION } from "./version";
import type { InstallStep } from "./shared";

export interface InstallOptions {
  /** Absolute path to `npm`, or null when the machine has none. */
  npm: string | null;
  env?: NodeJS.ProcessEnv;
  onProgress?: (state: InstallStep) => void;
  signal?: AbortSignal;
  /** How long to wait on the registry before deciding we are offline. */
  resolveTimeoutMs?: number;
}

/**
 * Put the newest HyperFrames into a freshly scaffolded project.
 *
 * The scaffold is already complete and previewable when this starts — it was
 * written against the runtime this app carries — so the install is a
 * background upgrade, not a gate: resolve the latest release, `npm install`
 * it with lifecycle scripts off, and pin the exact version in the project's
 * `package.json`. Anything that stops it (no npm, no network, a registry
 * hiccup) leaves the project on the vendored version and says so through the
 * `note`, which the editor shows in its scaffolding banner.
 *
 * `--ignore-scripts` is not optional: a package the user never chose is being
 * installed on their machine, and a postinstall script is arbitrary code.
 */
export async function installHyperframes(
  projectDir: string,
  options: InstallOptions,
): Promise<InstallStep> {
  const report = (state: InstallStep) => {
    options.onProgress?.(state);
    return state;
  };

  if (!options.npm) {
    return report({
      step: "done",
      version: HYPERFRAMES_VERSION,
      note: `npm isn't installed on this machine, so the project uses the bundled HyperFrames ${HYPERFRAMES_VERSION}.`,
    });
  }

  report({ step: "resolving" });
  const latest = await resolveLatest(options.npm, options.env, options.resolveTimeoutMs ?? 8000);
  if (!latest) {
    return report({
      step: "done",
      version: HYPERFRAMES_VERSION,
      note: `Couldn't reach the npm registry — the project uses the bundled HyperFrames ${HYPERFRAMES_VERSION}.`,
    });
  }

  report({ step: "installing", version: latest });
  try {
    await runNpm(
      options.npm,
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--save-exact",
        "--loglevel=error",
        `@hyperframes/core@${latest}`,
        `gsap@${GSAP_VERSION}`,
      ],
      projectDir,
      options.env,
      options.signal,
    );
  } catch (err) {
    return report({
      step: "failed",
      version: latest,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  await recordVersion(projectDir, latest);
  return report({ step: "done", version: latest, note: null });
}

/** The newest published `@hyperframes/core`, or null when the registry can't be reached in time. */
async function resolveLatest(
  npm: string,
  env: NodeJS.ProcessEnv | undefined,
  timeoutMs: number,
): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      npm,
      ["view", "@hyperframes/core", "version", "--loglevel=error"],
      { env: env ?? process.env, timeout: timeoutMs },
      (err, stdout) => {
        if (err) return resolve(null);
        const version = stdout.trim().split("\n").pop()?.trim() ?? "";
        resolve(/^\d+\.\d+\.\d+/.test(version) ? version : null);
      },
    );
  });
}

function runNpm(
  npm: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv | undefined,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(npm, args, { cwd, env: env ?? process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-4000);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim().split("\n").slice(-3).join(" ") || `npm exited with ${code}`));
    });
    signal?.addEventListener("abort", () => proc.kill(), { once: true });
  });
}

/**
 * The version the project actually runs, written where both the app and the
 * agent can read it. `npm install --save-exact` already pins `package.json`;
 * `hyperframes.json` is what the upstream tooling and the editor's banner
 * read, and mirroring it here is what lets an older project say which
 * release it was made with.
 */
export async function recordVersion(projectDir: string, version: string): Promise<void> {
  const file = path.join(projectDir, "hyperframes.json");
  const raw = await fs.readFile(file, "utf8").catch(() => "{}");
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    json = {};
  }
  json.version = version;
  await fs.writeFile(file, `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

/** Which `@hyperframes/core` a project has in its own `node_modules`, if any. */
export async function installedVersion(projectDir: string): Promise<string | null> {
  const file = path.join(projectDir, "node_modules", "@hyperframes", "core", "package.json");
  const raw = await fs.readFile(file, "utf8").catch(() => null);
  if (!raw) return null;
  try {
    const version = (JSON.parse(raw) as { version?: unknown }).version;
    return typeof version === "string" ? version : null;
  } catch {
    return null;
  }
}

/** The runtime script from the project's own install, when it has one. */
export async function projectRuntimeScript(projectDir: string): Promise<string | null> {
  const file = path.join(
    projectDir,
    "node_modules",
    "@hyperframes",
    "core",
    "dist",
    "hyperframe.runtime.iife.js",
  );
  return fs.readFile(file, "utf8").catch(() => null);
}
