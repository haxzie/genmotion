import path from "node:path";
import { existsSync } from "node:fs";
import {
  createSceneBundler,
  readManifest,
  type ProjectEngine,
  type ProjectManifest,
  type SceneBundler,
} from "@genmotion/project";
import { formatCompileError } from "@genmotion/compiler";
import type { HostScene } from "./browser/bridge";

/** URL prefix the loopback server serves project files under. */
export const FILES_PREFIX = "/__gm/files/";

export interface CompiledComposition {
  name: string;
  engine: ProjectEngine;
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  scenes: (HostScene & { file: string; startFrame: number })[];
  /** Per-scene compile failures. A composition with any cannot be rendered. */
  errors: { scene: string; file: string; message: string }[];
  manifest: ProjectManifest;
}

export class UnsupportedEngineError extends Error {}

/**
 * Reads `project.json` and bundles every scene it lists, ready to hand to a
 * host's `__gmInit`. Scenes compile independently, so one broken file is
 * reported by name without hiding the others' errors.
 */
export async function compileComposition(projectDir: string, bundler: SceneBundler): Promise<CompiledComposition> {
  const manifest = await readManifest(projectDir);
  if (manifest.engine === "hyperframes") {
    throw new UnsupportedEngineError(
      "HyperFrames projects aren't rendered by the genmotion CLI yet — open the folder in the GenMotion app (`genmotion .`) to preview and export it.",
    );
  }

  const scenes: CompiledComposition["scenes"] = [];
  const errors: CompiledComposition["errors"] = [];
  let startFrame = 0;
  await Promise.all(
    manifest.scenes.map(async (scene, index) => {
      const id = sceneId(scene.file, index);
      const name = scene.name ?? path.basename(scene.file).replace(/\.[^.]+$/, "");
      if (!existsSync(path.resolve(projectDir, scene.file))) {
        errors.push({ scene: name, file: scene.file, message: `${scene.file} is listed in project.json but doesn't exist` });
        return;
      }
      const built = await bundler.bundle(scene.file);
      if (!built.ok) {
        errors.push({ scene: name, file: scene.file, message: formatCompileError(built.error) });
        return;
      }
      scenes[index] = { id, name, file: scene.file, durationInFrames: scene.durationInFrames, compiledCode: built.code, startFrame: 0 };
    }),
  );

  const ordered = scenes.filter(Boolean);
  for (const scene of ordered) {
    scene.startFrame = startFrame;
    startFrame += scene.durationInFrames;
  }

  return {
    name: manifest.name,
    engine: manifest.engine,
    fps: manifest.fps,
    width: manifest.width,
    height: manifest.height,
    totalFrames: manifest.scenes.reduce((sum, s) => sum + s.durationInFrames, 0),
    scenes: ordered,
    errors,
    manifest,
  };
}

export function createProjectBundler(projectDir: string): SceneBundler {
  return createSceneBundler({ projectDir, assetUrlPrefix: FILES_PREFIX, sourcemap: true });
}

function sceneId(file: string, index: number): string {
  return `${index}-${path.basename(file).replace(/\.[^.]+$/, "")}`;
}
