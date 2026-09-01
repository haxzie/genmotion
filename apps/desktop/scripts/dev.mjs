import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import * as esbuild from "esbuild";
import electronPath from "electron";
import { entries, mainBuildOptions } from "./build-main.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The API and renderer get the root .env through node's --env-file; this script
// is plain `node`, so it has to load the file itself. Turbo runs tasks in strict
// env mode, so exporting the vars in a shell would not reach us either — without
// this, GM_CLOUD_API_URL is unset and the main process signs in against the
// production API during local development. Real env vars still win.
try {
  process.loadEnvFile(path.join(root, "../../.env"));
} catch {
  // No root .env — the hosted defaults are the right fallback.
}

const server = await createServer({ root, configFile: path.join(root, "vite.config.ts") });
await server.listen();
const url = server.resolvedUrls?.local?.[0];
if (!url) throw new Error("vite did not report a local URL");

let child = null;

function launch() {
  // Anything after `pnpm dev` goes to the app, so a launch flag can be tried
  // without installing the CLI shim: `pnpm dev --gm-cwd=/some/folder`.
  const proc = spawn(electronPath, [path.join(root, "dist/main/main.cjs"), ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, GM_DEV_SERVER_URL: url },
  });
  child = proc;
  proc.on("exit", () => {
    // Only the *current* child exiting means the user quit the app. One we
    // killed for a rebuild has already been detached from `child`, and its
    // exit event can land after the replacement is up — treating that as a
    // quit would close the vite server out from under the new window.
    if (proc !== child) return;
    child = null;
    void server.close().then(() => process.exit(0));
  });
}

/** Rebuild main/preload on change and relaunch — the renderer hot-reloads itself. */
const contexts = await Promise.all(
  entries.map((entry) =>
    esbuild.context({
      ...mainBuildOptions,
      ...entry,
      logLevel: "warning",
      plugins: [
        {
          name: "relaunch",
          setup(build) {
            let first = true;
            build.onEnd(() => {
              if (first) {
                first = false;
                return;
              }
              const previous = child;
              if (!previous) return;
              // Detach first, so the exit handler above knows this one was
              // replaced rather than quit, then relaunch when it is actually
              // gone — electron routinely takes longer to die than any fixed
              // delay we could guess at.
              child = null;
              previous.once("exit", launch);
              previous.kill();
            });
          },
        },
      ],
    }),
  ),
);

await Promise.all(contexts.map((ctx) => ctx.rebuild()));
await Promise.all(contexts.map((ctx) => ctx.watch()));
launch();

process.on("SIGINT", () => {
  child?.kill();
  void server.close().then(() => process.exit(0));
});
