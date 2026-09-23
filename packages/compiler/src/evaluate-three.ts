import * as THREE from "three";
import * as ThreeEngine from "@genmotion/three-engine";
import type { ThreeSceneBuilder } from "@genmotion/three-engine";
import type { CompileThreeSceneResult } from "./types";

const MODULES: Record<string, unknown> = {
  three: THREE,
  "@genmotion/three-engine": ThreeEngine,
};

/**
 * The modules the host injects for a three-engine scene. Deliberately narrow
 * next to `HOST_MODULE_IDS` (react scenes): no react, no gsap, no
 * lucide-react — a three-engine scene has none of those available.
 */
export const HOST_MODULE_IDS_THREE = Object.freeze(Object.keys(MODULES));

function requireShim(id: string): unknown {
  const mod = MODULES[id];
  if (!mod) {
    throw new Error(
      `Module "${id}" is not available in scenes. Allowed imports: three, @genmotion/three-engine`,
    );
  }
  return mod;
}

/**
 * Evaluate compiled (CJS) three-engine scene code in a scoped module
 * environment. The scene must default-export a function — the scene builder,
 * called once when the scene becomes active (see `ThreeSceneBuilder`).
 */
export function evaluateThreeScene(compiledCode: string): CompileThreeSceneResult {
  const moduleObj = { exports: {} as Record<string, unknown> };
  try {
    const fn = new Function("require", "module", "exports", compiledCode);
    fn(requireShim, moduleObj, moduleObj.exports);
  } catch (err) {
    return {
      ok: false,
      error: {
        message: `Scene code threw while initializing: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  const exported = (moduleObj.exports as { default?: unknown }).default ?? moduleObj.exports;

  if (typeof exported !== "function") {
    return {
      ok: false,
      error: {
        message:
          "Scene must default-export a builder function, e.g. `export default function buildScene(ctx) { ... }`",
      },
    };
  }

  return { ok: true, build: exported as ThreeSceneBuilder };
}
