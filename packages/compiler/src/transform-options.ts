import type { CompileError } from "@genmotion/shared";

/** Shared esbuild transform options — keep browser (wasm) and node (native) identical. */
export const SCENE_TRANSFORM_OPTIONS = {
  loader: "tsx",
  format: "cjs",
  target: "es2022",
  jsx: "automatic",
  jsxImportSource: "react",
} as const;

interface EsbuildMessage {
  text: string;
  location?: {
    line: number;
    column: number;
    lineText: string;
  } | null;
}

/** Normalize an esbuild failure (or any thrown error) to the structured shape fed back to the LLM. */
export function toCompileError(err: unknown): CompileError {
  const maybe = err as { errors?: EsbuildMessage[]; message?: string };
  const first = maybe.errors?.[0];
  if (first) {
    return {
      message: first.text,
      line: first.location?.line,
      column: first.location?.column,
      snippet: first.location?.lineText?.trim(),
    };
  }
  return { message: maybe.message ?? String(err) };
}
