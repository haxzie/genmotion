import path from "node:path";
import fs from "node:fs/promises";
import { realpathSync } from "node:fs";
import * as esbuild from "esbuild";
import type { CompileError } from "@genmotion/shared";
import { toCompileError } from "@genmotion/compiler";
import { HOST_MODULE_IDS } from "@genmotion/compiler/evaluate";
import { ASSETS_DIR, isDependencyPath } from "./paths";

/**
 * Modules the scene bundle must NOT include a copy of — the host hands them to
 * the module at evaluation time. Sourced from the require-shim's own table so
 * the two can never drift apart.
 *
 * Subpaths are added for the ones scenes legitimately reach into; anything else
 * (react-dom, say) stays unresolved and fails loudly in the shim rather than
 * quietly bundling a second React.
 */
export const HOST_EXTERNALS: string[] = [
  ...HOST_MODULE_IDS,
  "react-dom",
  "react-dom/*",
  "react/*",
  "gsap/*",
];

const INLINE_ASSET_LIMIT = 96 * 1024;

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);
const MEDIA_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".mp3", ".wav", ".m4a", ".ogg", ".woff", ".woff2"]);

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

const ASSET_FILTER = new RegExp(
  `\\.(${[...IMAGE_EXTENSIONS, ...MEDIA_EXTENSIONS]
    .map((e) => e.slice(1))
    .join("|")})$`,
  "i",
);

export type BundleSceneResult =
  | {
      ok: true;
      code: string;
      /** Every file the bundle pulled in, absolute. */
      inputs: string[];
      /** The project's own sources (no node_modules) — what determinism rules apply to. */
      localInputs: string[];
    }
  | { ok: false; error: CompileError };

export interface SceneBundlerOptions {
  projectDir: string;
  /**
   * Prefix for assets too large to inline. The desktop shell serves these over
   * a custom protocol; tests and CLI use `file://`.
   */
  assetUrlPrefix?: string;
  /** Images at or under this size are inlined as data URLs instead. */
  inlineAssetLimit?: number;
  /** Inline sourcemaps make runtime stack traces point at the .tsx. */
  sourcemap?: boolean;
}

/**
 * Turns a project asset import into something the browser can load: small
 * images inline as data URLs (no round-trip, survives being copied anywhere),
 * everything bigger becomes a URL the host serves — video and audio have to
 * stay real URLs regardless of size so the element can range-request while
 * seeking.
 */
function assetPlugin(options: Required<Pick<SceneBundlerOptions, "projectDir" | "assetUrlPrefix" | "inlineAssetLimit">>): esbuild.Plugin {
  const { projectDir, assetUrlPrefix, inlineAssetLimit } = options;
  return {
    name: "genmotion-assets",
    setup(build) {
      build.onResolve({ filter: ASSET_FILTER }, (args) => {
        if (args.kind === "entry-point") return null;
        const resolved = path.resolve(args.resolveDir, args.path);
        return { path: resolved, namespace: "gm-asset" };
      });

      build.onLoad({ filter: /.*/, namespace: "gm-asset" }, async (args) => {
        const ext = path.extname(args.path).toLowerCase();
        const stat = await fs.stat(args.path).catch(() => null);
        if (!stat) {
          return {
            errors: [{ text: `Asset not found: ${path.relative(projectDir, args.path)}` }],
          };
        }

        if (IMAGE_EXTENSIONS.has(ext) && stat.size <= inlineAssetLimit) {
          const data = await fs.readFile(args.path);
          const mime = MIME[ext] ?? "application/octet-stream";
          const url = `data:${mime};base64,${data.toString("base64")}`;
          return { contents: `export default ${JSON.stringify(url)}`, loader: "js", watchFiles: [args.path] };
        }

        // Relativize against real paths on both sides: esbuild reports the
        // resolved (symlink-free) path, and on macOS the project itself often
        // lives under a symlinked /var or /tmp.
        const real = await fs.realpath(args.path);
        const rel = path.relative(projectDir, real);
        if (rel.startsWith("..") || path.isAbsolute(rel)) {
          return {
            errors: [
              {
                text: `Asset "${args.path}" is outside the project folder. Copy it into ${ASSETS_DIR}/ and import it from there.`,
              },
            ],
          };
        }
        const url = rel.split(path.sep).map(encodeURIComponent).join("/");
        return {
          contents: `export default ${JSON.stringify(assetUrlPrefix + url)}`,
          loader: "js",
          watchFiles: [args.path],
        };
      });
    },
  };
}

function realpath(dir: string): string {
  try {
    return realpathSync(dir);
  } catch {
    return dir; // not created yet — fall back to the literal path
  }
}

export interface SceneBundler {
  /**
   * The project root, resolved through symlinks. Callers should relativize
   * against this rather than the path they passed in — esbuild reports real
   * paths, and on macOS a project under /tmp or /var is reached by a symlink.
   */
  readonly projectDir: string;
  /** Bundle one scene. Repeat calls for the same file rebuild incrementally. */
  bundle(sceneFile: string): Promise<BundleSceneResult>;
  /** Forget a scene's incremental context (file deleted or renamed). */
  release(sceneFile: string): Promise<void>;
  dispose(): Promise<void>;
}

/**
 * Bundles a scene and everything it imports — sibling components, project
 * modules, and installed npm packages — into one CJS module for the existing
 * `evaluateScene()` require-shim.
 *
 * A fresh project bundles with no `node_modules` at all: every runtime module a
 * starter scene imports is external, so preview works before anything is
 * installed. Only packages the agent adds need a real install.
 */
export function createSceneBundler(options: SceneBundlerOptions): SceneBundler {
  // esbuild resolves symlinks; match it, or every path comparison against the
  // project root is wrong under a symlinked home or temp directory.
  const projectDir = realpath(path.resolve(options.projectDir));
  const assetUrlPrefix = options.assetUrlPrefix ?? "gm-asset://";
  const inlineAssetLimit = options.inlineAssetLimit ?? INLINE_ASSET_LIMIT;
  const contexts = new Map<string, esbuild.BuildContext>();

  async function contextFor(entry: string): Promise<esbuild.BuildContext> {
    const existing = contexts.get(entry);
    if (existing) return existing;
    const ctx = await esbuild.context({
      entryPoints: [entry],
      absWorkingDir: projectDir,
      bundle: true,
      write: false,
      metafile: true,
      format: "cjs",
      target: "es2022",
      platform: "browser",
      jsx: "automatic",
      jsxImportSource: "react",
      external: HOST_EXTERNALS,
      define: { "process.env.NODE_ENV": '"production"' },
      sourcemap: options.sourcemap ? "inline" : false,
      logLevel: "silent",
      plugins: [assetPlugin({ projectDir, assetUrlPrefix, inlineAssetLimit })],
    });
    contexts.set(entry, ctx);
    return ctx;
  }

  return {
    projectDir,

    async bundle(sceneFile) {
      const entry = path.resolve(projectDir, sceneFile);
      try {
        const ctx = await contextFor(entry);
        const result = await ctx.rebuild();
        const code = result.outputFiles?.[0]?.text;
        if (!code) {
          return { ok: false, error: { message: "esbuild produced no output" } };
        }
        const inputs = Object.keys(result.metafile?.inputs ?? {})
          // Virtual asset modules aren't files on disk.
          .filter((p) => !p.startsWith("gm-asset:"))
          .map((p) => path.resolve(projectDir, p));
        return {
          ok: true,
          code,
          inputs,
          localInputs: inputs.filter((p) => !isDependencyPath(p)),
        };
      } catch (err) {
        return { ok: false, error: toCompileError(err) };
      }
    },

    async release(sceneFile) {
      const entry = path.resolve(projectDir, sceneFile);
      const ctx = contexts.get(entry);
      if (!ctx) return;
      contexts.delete(entry);
      await ctx.dispose();
    },

    async dispose() {
      const all = [...contexts.values()];
      contexts.clear();
      await Promise.all(all.map((ctx) => ctx.dispose()));
    },
  };
}
