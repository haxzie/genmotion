import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";
import * as Motion from "@genmotion/motion";
import * as Lucide from "lucide-react";
import type { ComponentType } from "react";
import type { CompileSceneResult } from "./types";

// gsap is re-exported by @genmotion/motion so there is exactly one instance.
const gsapModule = { default: Motion.gsap, gsap: Motion.gsap };

const MODULES: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": JsxRuntime,
  "@genmotion/motion": Motion,
  gsap: gsapModule,
  "lucide-react": Lucide,
};

function requireShim(id: string): unknown {
  const mod = MODULES[id];
  if (!mod) {
    throw new Error(
      `Module "${id}" is not available in scenes. Allowed imports: react, @genmotion/motion, gsap, lucide-react`,
    );
  }
  return mod;
}

/**
 * Evaluate compiled (CJS) scene code in a scoped module environment.
 * The scene must default-export a React component.
 */
export function evaluateScene(compiledCode: string): CompileSceneResult {
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

  const exported =
    (moduleObj.exports as { default?: unknown }).default ?? moduleObj.exports;

  if (typeof exported !== "function") {
    return {
      ok: false,
      error: {
        message:
          "Scene must default-export a React component, e.g. `export default function Scene() { ... }`",
      },
    };
  }

  return { ok: true, component: exported as ComponentType };
}

/** Stable content hash for compile caching. */
export function hashSource(source: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < source.length; i++) {
    const ch = source.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}
