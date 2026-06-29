import { transform } from "esbuild";
import { SCENE_TRANSFORM_OPTIONS, toCompileError } from "./transform-options";
import type { CompileToJsResult } from "./types";

/**
 * Server-side compile (native esbuild, same pinned version as the browser wasm).
 * Used by AI tool executors to validate scene code before persisting, and by
 * the render worker to precompile scenes for the headless page.
 */
export async function compileSceneToJs(
  source: string,
): Promise<CompileToJsResult> {
  try {
    const result = await transform(source, SCENE_TRANSFORM_OPTIONS);
    return { ok: true, code: result.code };
  } catch (err) {
    return { ok: false, error: toCompileError(err) };
  }
}
