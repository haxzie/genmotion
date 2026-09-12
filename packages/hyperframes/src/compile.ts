import path from "node:path";
import fs from "node:fs/promises";
import {
  RUNTIME_BOOTSTRAP_ATTR,
  bundleToSingleHtml,
  extractCompiledHtmlParityContract,
  injectScriptsAtHeadStart,
} from "@hyperframes/core/compiler";
import { getHyperframeRuntimeScript } from "@hyperframes/core";
import { readTimeline } from "./timeline";
import type { CompositionTimeline } from "./shared";

/** The root composition of a project. Sub-compositions live under `scenes/`. */
export const ENTRY_FILE = "index.html";

/** Seconds of a media file, or 0 when unknown — supplied by the host (ffmpeg lives there). */
export type MediaDurationProber = (absolutePath: string) => Promise<number>;

export interface CompileOptions {
  /**
   * Where the page should load the HyperFrames runtime from.
   *
   * A URL keeps the ~400KB script cacheable across the preview's reloads; the
   * export inlines it (`inline: true`) so a captured page is self-contained.
   */
  runtime: { url: string } | { inline: string };
  /** Local URL for GSAP — every CDN reference is rewritten to it (see `rewriteCdnScripts`). */
  gsapUrl: string;
  probeMediaDuration?: MediaDurationProber;
}

export interface CompiledProject {
  /** One self-contained (bar assets) document: sub-compositions inlined, timing resolved. */
  html: string;
  width: number;
  height: number;
  /** Declared or inferred length, in seconds. Zero when nothing declares one. */
  durationSeconds: number;
  timeline: CompositionTimeline;
}

export class CompileError extends Error {}

/**
 * Compile a project folder into the single document the preview and the
 * export both load.
 *
 * `@hyperframes/core`'s bundler does the real work — inlines every
 * `data-composition-src`, resolves `data-end`s, probes media durations — and
 * this wraps it with the two things a desktop host needs on top: a runtime
 * that comes from this app rather than a `<script src="">` placeholder, and
 * no reliance on a CDN for GSAP, which would make an offline export a blank
 * video.
 */
export async function compileProject(
  projectDir: string,
  options: CompileOptions,
): Promise<CompiledProject> {
  const entry = path.join(projectDir, ENTRY_FILE);
  await fs.access(entry).catch(() => {
    throw new CompileError(`No ${ENTRY_FILE} in the project folder`);
  });

  let html: string;
  try {
    html = await bundleToSingleHtml(projectDir, {
      entryFile: ENTRY_FILE,
      runtime: "placeholder",
      probeMediaDuration: options.probeMediaDuration,
    });
  } catch (err) {
    throw new CompileError(err instanceof Error ? err.message : String(err));
  }

  html = rewriteCdnScripts(html, options.gsapUrl);
  html = installRuntime(html, options.runtime);

  const contract = extractCompiledHtmlParityContract(html);
  const root = contract.compositions.find((c) => c.start === 0 && c.width && c.height)
    ?? contract.compositions[0];
  const timeline = readTimeline(html);

  return {
    html,
    width: root?.width ?? 1920,
    height: root?.height ?? 1080,
    durationSeconds: root?.duration ?? timeline.durationSeconds,
    timeline,
  };
}

/**
 * GSAP script tags pointing at a CDN, however the agent spelled them.
 *
 * The skills teach `cdn.jsdelivr.net/npm/gsap@<v>/dist/gsap.min.js`, but
 * unpkg and cdnjs turn up too. Plugins (`ScrollTrigger`, `SplitText`) are left
 * alone: they are separate files, and rewriting them to the core bundle would
 * break the composition rather than free it from the network.
 */
const GSAP_CDN = /https?:\/\/(?:cdn\.jsdelivr\.net\/npm\/gsap@[^/"']+\/dist|unpkg\.com\/gsap@[^/"']+\/dist|cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\/[^/"']+)\/gsap\.min\.js/g;

export function rewriteCdnScripts(html: string, gsapUrl: string): string {
  return html.replace(GSAP_CDN, gsapUrl);
}

function installRuntime(html: string, runtime: CompileOptions["runtime"]): string {
  const placeholder = new RegExp(`<script\\s+${RUNTIME_BOOTSTRAP_ATTR}="1"\\s+src=""></script>`);
  if (!placeholder.test(html)) {
    throw new CompileError("The compiler produced no runtime slot — is this a HyperFrames composition?");
  }
  return html.replace(
    placeholder,
    "url" in runtime
      ? `<script ${RUNTIME_BOOTSTRAP_ATTR}="1" src="${runtime.url}"></script>`
      // A closing tag inside the script text would end it early; there is
      // none in the runtime today, and this keeps it that way.
      : `<script ${RUNTIME_BOOTSTRAP_ATTR}="1">${runtime.inline.replace(/<\/script/gi, "<\\/script")}</script>`,
  );
}

/** The runtime this app ships, as page script. */
export function appRuntimeScript(): string {
  return getHyperframeRuntimeScript();
}

/**
 * The compiled document as a capture window should load it.
 *
 * One flag ahead of every page script: the runtime reads it at init and stops
 * syncing media against a live clock, so a `renderSeek` lands on the exact
 * frame. It is the same switch `@hyperframes/producer` throws for its own
 * captures; the preview iframe loads the document without it.
 */
export function forRender(html: string): string {
  return injectScriptsAtHeadStart(html, ["globalThis.__HF_RENDER_CAPTURE_MODE = true;"]);
}
