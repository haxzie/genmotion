import { useMemo, useRef } from "react";
import type { CompileError, SceneData } from "@genmotion/shared";
import type { ThreeCompiledScene, ThreeSceneBuilder } from "@genmotion/three-engine";
import { evaluateThreeScene } from "@genmotion/compiler/evaluate-three";
import { useProjectBundles } from "../../lib/project-bundles";

/**
 * The Three.js engine's counterpart of `useCompiledScenes`: evaluates each
 * scene's bundle (built by the main process's native esbuild) into a scene
 * builder function, directly in the renderer's JS context — same place and
 * same trust boundary the React engine's scenes already evaluate in.
 *
 * A scene that fails to build gets a no-op builder (an empty `THREE.Scene`)
 * rather than a canvas-drawn error card — the editor already banners the
 * first build error above the stage; this only has to not crash.
 */
export interface UseCompiledThreeScenesResult {
  compiled: ThreeCompiledScene[];
  /** sceneId → build error for scenes that failed. */
  errors: Record<string, CompileError>;
  /** True until the first payload arrives. */
  initializing: boolean;
}

const NOOP_BUILDER: ThreeSceneBuilder = () => {};

export function useCompiledThreeScenes(
  scenes: SceneData[] | undefined,
): UseCompiledThreeScenesResult {
  const { bundles, ready } = useProjectBundles();

  // Same cache-by-bundle-text idea as `useCompiledScenes`: evaluating fresh
  // produces a fresh function identity, which the host would treat as a scene
  // change and rebuild for no reason.
  const cache = useRef(new Map<string, ThreeSceneBuilder>());

  return useMemo(() => {
    const next = new Map<string, ThreeSceneBuilder>();
    const compiled: ThreeCompiledScene[] = [];
    const errors: Record<string, CompileError> = {};

    for (const scene of scenes ?? []) {
      const bundle = bundles[scene.id];
      if (!bundle) continue;

      const key = `${scene.id} ${bundle.code ?? bundle.error ?? ""}`;
      let build = cache.current.get(key);
      if (!build) {
        if (bundle.code) {
          const evaluated = evaluateThreeScene(bundle.code);
          build = evaluated.ok ? evaluated.build : NOOP_BUILDER;
          if (!evaluated.ok) errors[scene.id] = evaluated.error;
        } else {
          build = NOOP_BUILDER;
        }
      }
      if (bundle.error) errors[scene.id] = { message: bundle.error };
      next.set(key, build);

      compiled.push({
        id: scene.id,
        name: scene.name,
        durationInFrames: scene.durationInFrames,
        build,
        audioUrl: scene.audioUrl,
        audioVolume: scene.audioVolume,
        startFrom: scene.startFrom,
      });
    }

    cache.current = next;
    return { compiled, errors, initializing: !ready };
  }, [scenes, bundles, ready]);
}
