import type { ComponentType } from "react";
import type { CompileError } from "@genmotion/shared";

export type CompileToJsResult =
  | { ok: true; code: string }
  | { ok: false; error: CompileError };

export type CompileSceneResult =
  | { ok: true; component: ComponentType }
  | { ok: false; error: CompileError };

/** Render a compile error the way it will be shown to the LLM for self-correction. */
export function formatCompileError(error: CompileError): string {
  const location =
    error.line !== undefined
      ? ` at line ${error.line}${error.column !== undefined ? `, column ${error.column}` : ""}`
      : "";
  const snippet = error.snippet ? `\n\n  ${error.snippet}` : "";
  return `${error.message}${location}${snippet}`;
}
