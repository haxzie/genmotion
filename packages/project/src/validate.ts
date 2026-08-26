import path from "node:path";
import fs from "node:fs/promises";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  FrameContext,
  PlayingContext,
  RenderModeContext,
  VideoConfigContext,
} from "@genmotion/motion";
import { formatCompileError } from "@genmotion/compiler";
import { evaluateScene } from "@genmotion/compiler/evaluate";
import type { SceneBundler } from "./bundle";

export interface SceneValidationConfig {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
}

export const DEFAULT_VALIDATION_CONFIG: SceneValidationConfig = {
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 150,
};

export interface SceneValidation {
  /** Blocking failure, phrased for the agent to act on. Null when the scene is fine. */
  error: string | null;
  /** Non-blocking notes — surfaced to the user and fed back on the next turn. */
  warnings: string[];
  /** Files the bundle touched, so the watcher knows what invalidates this scene. */
  inputs: string[];
}

/**
 * Anything whose value isn't a pure function of the frame index. A scene that
 * uses these renders differently in the preview than in the export, and
 * differently on two runs of the same export.
 */
const NON_DETERMINISTIC =
  /\b(Math\.random|Date\.now|new Date\(|setTimeout|setInterval|requestAnimationFrame|performance\.now|fetch\(|XMLHttpRequest|localStorage|document\.|window\.)/;

/** The subset that actually drives motion — worth flagging inside dependencies. */
const DEPENDENCY_CLOCKS =
  /\b(requestAnimationFrame|performance\.now|Date\.now|Math\.random|setInterval)/;

const HOT_LINKED_LOGO = /https?:\/\/(cdn\.simpleicons\.org|thesvg\.org)\/[^"'`\s)]*/;

/** `node_modules/foo/dist/x.js` → `foo`; scoped packages keep their scope. */
function dependencyNames(inputs: string[]): string[] {
  const names = new Set<string>();
  for (const input of inputs) {
    const parts = input.split(path.sep);
    const at = parts.lastIndexOf("node_modules");
    if (at === -1) continue;
    const first = parts[at + 1];
    if (!first) continue;
    names.add(first.startsWith("@") ? `${first}/${parts[at + 2] ?? ""}` : first);
  }
  return [...names].sort();
}

/**
 * Validate a scene the way the browser will actually run it:
 * 1. bundle it (syntax, missing imports, unresolved packages),
 * 2. read the project's own sources for rules the bundle can't express,
 * 3. evaluate the module through the host require-shim,
 * 4. smoke-render start/middle/end with react-dom/server.
 *
 * Determinism is checked against the project's own files, not the bundle: a
 * charting library that mentions `Date.now` in a branch nobody hits is fine,
 * and failing on it would make most of npm unusable. Dependencies get a warning
 * instead, and the smoke render catches the ones that genuinely misbehave.
 */
export async function validateSceneFile(input: {
  bundler: SceneBundler;
  sceneFile: string;
  config?: SceneValidationConfig;
}): Promise<SceneValidation> {
  const { bundler, sceneFile } = input;
  // Always the bundler's resolved root, so the paths in error messages line up
  // with the paths esbuild reports back.
  const projectDir = bundler.projectDir;
  const config = input.config ?? DEFAULT_VALIDATION_CONFIG;
  const warnings: string[] = [];

  const built = await bundler.bundle(sceneFile);
  if (!built.ok) {
    return {
      error: `Compile error in ${sceneFile}: ${formatCompileError(built.error)}`,
      warnings,
      inputs: [],
    };
  }

  const entry = path.resolve(projectDir, sceneFile);
  const source = await fs.readFile(entry, "utf8").catch(() => null);
  if (source === null) {
    return { error: `Scene file not found: ${sceneFile}`, warnings, inputs: built.inputs };
  }
  if (!/export\s+default/.test(source)) {
    return {
      error: `${sceneFile} must have a default export: \`export default function Scene() { ... }\``,
      warnings,
      inputs: built.inputs,
    };
  }

  for (const file of built.localInputs) {
    const text =
      file === entry ? source : await fs.readFile(file, "utf8").catch(() => "");
    const where = path.relative(projectDir, file);

    const banned = text.match(NON_DETERMINISTIC);
    if (banned) {
      return {
        error: `${where} uses "${banned[1]}", which breaks deterministic rendering — the export would not match the preview. Use the frame-driven APIs from @genmotion/motion instead (random(seed) for randomness).`,
        warnings,
        inputs: built.inputs,
      };
    }

    const hotLinked = text.match(HOT_LINKED_LOGO);
    if (hotLinked) {
      return {
        error: `${where} hot-links a logo CDN ("${hotLinked[0]}"). That URL is never verified, so if the brand isn't in the set it 404s and the video ships with a broken image. Save it into the project's assets/ folder first and import it, or use a lucide-react icon instead.`,
        warnings,
        inputs: built.inputs,
      };
    }

    // Raster-pinning hints are fine on their own, but under a camera they tell
    // the compositor to freeze a layer's raster scale — so a zoom stretches a
    // stale texture instead of redrawing the content.
    if (/<\s*Camera[\s/>]/.test(text)) {
      const pinning = text.match(/\b(willChange|translate3d|translateZ)\b/);
      if (pinning) {
        return {
          error: `${where} uses "${pinning[1]}" inside a <Camera> scene. That pins the browser's raster scale, so a camera zoom magnifies a blurry cached texture instead of re-rendering the content. Remove it — the motion components handle compositing themselves.`,
          warnings,
          inputs: built.inputs,
        };
      }
    }
  }

  const deps = dependencyNames(built.inputs);
  if (deps.length > 0 && DEPENDENCY_CLOCKS.test(built.code)) {
    warnings.push(
      `${sceneFile} bundles ${deps.join(", ")}, and the result reads a clock or random source. If that code runs during render the export will drift from the preview — check the scene looks identical on two renders, or drive the animation from the frame instead.`,
    );
  }

  const evaluated = evaluateScene(built.code);
  if (!evaluated.ok) {
    return {
      error: `${sceneFile} failed to load: ${evaluated.error.message}`,
      warnings,
      inputs: built.inputs,
    };
  }

  const frames = [
    0,
    Math.floor(config.durationInFrames / 2),
    Math.max(0, config.durationInFrames - 1),
  ];
  for (const frame of frames) {
    try {
      renderToString(
        createElement(
          RenderModeContext.Provider,
          { value: "preview" },
          createElement(
            PlayingContext.Provider,
            { value: false },
            createElement(
              VideoConfigContext.Provider,
              {
                value: {
                  fps: config.fps,
                  width: config.width,
                  height: config.height,
                  durationInFrames: config.durationInFrames,
                },
              },
              createElement(
                FrameContext.Provider,
                { value: frame },
                createElement(evaluated.component),
              ),
            ),
          ),
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        error: `${sceneFile} crashed while rendering frame ${frame}: ${message}`,
        warnings,
        inputs: built.inputs,
      };
    }
  }

  return { error: null, warnings, inputs: built.inputs };
}
