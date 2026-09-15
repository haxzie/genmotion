import path from "node:path";
import fs from "node:fs/promises";
import {
  CompileError,
  ENTRY_FILE,
  forPreview,
  forRender,
  HYPERFRAMES_VERSION,
  appRuntimeScript,
  compileProject,
  installedVersion,
  isRuntimeCompatible,
  lintProject,
  listScenes,
  projectRuntimeScript,
  type CompiledProject,
  type LintReport,
} from "@genmotion/hyperframes";
import type { HyperframesRuntime, HyperframesState } from "../shared";
import { probeMediaDuration } from "./probe";
import { scaffoldState } from "./scaffold";

/**
 * Paths a compiled composition loads its runtime and GSAP from, relative to
 * the preview document so the loopback server's secret prefix never has to
 * be known here. `local-server.ts` answers both under `…/preview/__gm/`.
 */
export const RUNTIME_URL = "__gm/runtime.js";
export const GSAP_URL = "__gm/gsap.min.js";

/**
 * The HyperFrames half of a `ProjectSession`: the last compile of the folder,
 * its lint report, and which runtime the page should load.
 *
 * Compiling happens here, in the main process, with the `@hyperframes/core`
 * this app was built against. The runtime that runs *in the page* may be the
 * project's own newer copy — that is what "install the latest on create" buys
 * — but only when the two agree on the composition contract; otherwise the
 * app's runtime stands in and `runtime.note` says so.
 */
export class HyperframesEngine {
  private compiled: CompiledProject | null = null;
  /**
   * The last compile that worked. An agent writes a composition a file at a
   * time, and between two of its writes the folder often does not compile;
   * the preview keeps showing this one — with the error alongside — rather
   * than going dark for the seconds it takes to finish the thought.
   */
  private lastGood: CompiledProject | null = null;
  private error: string | null = null;
  private lint: LintReport = { ok: true, errorCount: 0, warningCount: 0, findings: [] };
  private files: { path: string; code: string }[] = [];
  private runtime: HyperframesRuntime = { version: HYPERFRAMES_VERSION, source: "app", note: null };
  /** Bumped per compile — the preview appends it to its URL so a reload is never served stale. */
  private revision = 0;

  constructor(readonly dir: string) {}

  /** Recompile and re-lint the folder. Never throws: a broken composition is a state, not a crash. */
  async refresh(): Promise<void> {
    const [runtime, files] = await Promise.all([this.detectRuntime(), this.readSources()]);
    this.runtime = runtime;
    this.files = files;

    try {
      this.compiled = await compileProject(this.dir, {
        runtime: { url: RUNTIME_URL },
        gsapUrl: GSAP_URL,
        probeMediaDuration,
      });
      this.error = null;
    } catch (err) {
      this.compiled = null;
      this.error =
        err instanceof CompileError ? err.message : err instanceof Error ? err.message : String(err);
    }

    this.lint = await lintProject(this.dir).catch((err) => ({
      ok: false,
      errorCount: 1,
      warningCount: 0,
      findings: [
        {
          file: ENTRY_FILE,
          code: "lint_failed",
          severity: "error" as const,
          message: err instanceof Error ? err.message : String(err),
        },
      ],
    }));

    // The compiler is lenient: a composition missing its root, or a scene
    // half-written, still "compiles" — to a blank page. The linter is what
    // says it is broken. So the page the preview shows moves on only when a
    // compile is clean — or when there is nothing to show yet, in which case
    // whatever compiled beats an empty stage. A failed or erroring compile
    // changes nothing the preview shows, and the banner carries the error.
    if (this.compiled && (this.lint.errorCount === 0 || !this.lastGood)) {
      this.lastGood = this.compiled;
      this.revision += 1;
    }
  }

  /** The document the preview iframe and the export window both load — the last good one. Null until a compile has succeeded. */
  previewHtml(): string | null {
    return this.lastGood ? forPreview(this.lastGood.html) : null;
  }

  /** The preview document as the export window loads it — see `forRender`. */
  renderHtml(html: string): string {
    return forRender(html);
  }

  /** The runtime the page should run — the project's when it is one we can trust. */
  async runtimeScript(): Promise<string> {
    if (this.runtime.source === "project") {
      const own = await projectRuntimeScript(this.dir);
      if (own) return own;
    }
    return appRuntimeScript();
  }

  get current(): CompiledProject | null {
    return this.compiled;
  }

  get compileError(): string | null {
    return this.error;
  }

  state(): HyperframesState {
    // Dimensions and timeline from the last page that compiled, so the
    // editor keeps its stage and scene chips while the error banner is up.
    const c = this.compiled ?? this.lastGood;
    return {
      revision: this.revision,
      width: c?.width ?? null,
      height: c?.height ?? null,
      durationSeconds: c?.durationSeconds ?? 0,
      timeline: c?.timeline ?? { durationSeconds: 0, clips: [], scenes: [], audio: [] },
      lint: this.lint,
      compileError: this.error,
      runtime: this.runtime,
      files: this.files,
      scaffold: scaffoldState(this.dir),
    };
  }

  private async detectRuntime(): Promise<HyperframesRuntime> {
    const installed = await installedVersion(this.dir);
    if (!installed) return { version: HYPERFRAMES_VERSION, source: "app", note: null };
    if (isRuntimeCompatible(installed)) return { version: installed, source: "project", note: null };
    return {
      version: HYPERFRAMES_VERSION,
      source: "app",
      note: `The project has HyperFrames ${installed}, which this build of GenMotion (${HYPERFRAMES_VERSION}) can't drive yet — previewing with the bundled runtime.`,
    };
  }

  /** The root and every sub-composition, for the Code view. */
  private async readSources(): Promise<{ path: string; code: string }[]> {
    const paths = [ENTRY_FILE, ...(await listScenes(this.dir))];
    const files: { path: string; code: string }[] = [];
    for (const rel of paths) {
      const code = await fs.readFile(path.join(this.dir, rel), "utf8").catch(() => null);
      if (code !== null) files.push({ path: rel, code });
    }
    return files;
  }
}
