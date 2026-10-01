import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ProjectEngine } from "@genmotion/project";

/**
 * The browser bundle that mounts a composition for one engine.
 *
 * A published build ships them prebuilt under `dist/browser/` (see
 * `scripts/build-browser.mjs`), next to whatever module this file was bundled
 * into — `@genmotion/render`'s own `dist/index.js`, or the `genmotion` CLI's
 * `dist/main.js`. Running from source in the monorepo there is no prebuilt
 * copy, so the entry is bundled on first use instead. Either way the result is
 * cached for the life of the process.
 */
const ENTRIES: Record<Exclude<ProjectEngine, "hyperframes">, string> = {
  three: "three-host",
  react: "react-host",
};

const cache = new Map<string, Promise<string>>();

export function hostBundle(engine: ProjectEngine): Promise<string> {
  if (engine === "hyperframes") {
    return Promise.reject(new Error("HyperFrames compositions carry their own runtime; there is no host bundle"));
  }
  const name = ENTRIES[engine];
  let pending = cache.get(name);
  if (!pending) {
    pending = loadBundle(name);
    cache.set(name, pending);
    pending.catch(() => cache.delete(name));
  }
  return pending;
}

async function loadBundle(name: string): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const prebuilt = path.join(here, "browser", `${name}.js`);
  if (existsSync(prebuilt)) return fs.readFile(prebuilt, "utf8");

  const source = [".ts", ".tsx"]
    .map((ext) => path.join(here, "browser", `${name}${ext}`))
    .find((file) => existsSync(file));
  if (!source) {
    throw new Error(`The ${name} browser bundle is missing from ${path.join(here, "browser")} — reinstall @genmotion/cli`);
  }
  const { buildBrowserBundle } = await import("./build-browser");
  return buildBrowserBundle(source);
}
