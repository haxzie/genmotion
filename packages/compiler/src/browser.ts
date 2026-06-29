"use client";

import * as esbuild from "esbuild-wasm";
import type { ComponentType } from "react";
import { SCENE_TRANSFORM_OPTIONS, toCompileError } from "./transform-options";
import { evaluateScene, hashSource } from "./evaluate";
import type { CompileSceneResult, CompileToJsResult } from "./types";

let initPromise: Promise<void> | null = null;

/**
 * Initialize the esbuild wasm binary (~10MB, lazy, once per session).
 * `wasmURL` should point at the same esbuild-wasm version this package pins.
 */
export function ensureCompilerReady(wasmURL = "/esbuild.wasm"): Promise<void> {
  if (!initPromise) {
    initPromise = esbuild.initialize({ wasmURL }).catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export async function compileSceneToJs(
  source: string,
): Promise<CompileToJsResult> {
  await ensureCompilerReady();
  try {
    const result = await esbuild.transform(source, SCENE_TRANSFORM_OPTIONS);
    return { ok: true, code: result.code };
  } catch (err) {
    return { ok: false, error: toCompileError(err) };
  }
}

// Compiled components cached by source hash so unchanged scenes never recompile.
const componentCache = new Map<string, ComponentType>();

/** Compile TSX scene source into a ready-to-render React component (cached). */
export async function compileScene(
  source: string,
): Promise<CompileSceneResult> {
  const hash = hashSource(source);
  const cached = componentCache.get(hash);
  if (cached) return { ok: true, component: cached };

  const compiled = await compileSceneToJs(source);
  if (!compiled.ok) return compiled;

  const evaluated = evaluateScene(compiled.code);
  if (evaluated.ok) {
    componentCache.set(hash, evaluated.component);
  }
  return evaluated;
}
