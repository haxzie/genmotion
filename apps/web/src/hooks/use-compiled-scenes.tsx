"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { CompileError, SceneData } from "@genmotion/shared";
import type { CompiledScene } from "@genmotion/player";
import { compileScene, ensureCompilerReady } from "@genmotion/compiler/browser";
import { hashSource } from "@genmotion/compiler";

function CompileErrorCard({ error, name }: { error: CompileError; name: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        background: "#16090b",
        color: "#eb5757",
        fontFamily: "ui-monospace, monospace",
        padding: 80,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 600 }}>
        Scene “{name}” failed to compile
      </div>
      <div style={{ fontSize: 26, opacity: 0.85, maxWidth: "85%" }}>
        {error.message}
        {error.line !== undefined && ` (line ${error.line})`}
      </div>
      {error.snippet && (
        <pre style={{ fontSize: 22, opacity: 0.6 }}>{error.snippet}</pre>
      )}
    </div>
  );
}

interface CompiledEntry {
  hash: string;
  component: ComponentType;
  error: CompileError | null;
}

export interface UseCompiledScenesResult {
  compiled: CompiledScene[];
  /** sceneId → compile error for scenes that failed. */
  errors: Record<string, CompileError>;
  /** True until the first compile pass (incl. wasm init) finishes. */
  initializing: boolean;
}

/**
 * Compiles scene TSX into React components as scene code changes.
 * Unchanged scenes (by content hash) are never recompiled.
 */
export function useCompiledScenes(
  scenes: SceneData[] | undefined,
): UseCompiledScenesResult {
  const [entries, setEntries] = useState<Record<string, CompiledEntry>>({});
  const [initializing, setInitializing] = useState(true);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    if (!scenes) return;
    let cancelled = false;

    (async () => {
      await ensureCompilerReady();
      const updates: Record<string, CompiledEntry> = {};
      for (const scene of scenes) {
        const hash = hashSource(scene.code);
        const existing = entriesRef.current[scene.id];
        if (existing && existing.hash === hash) continue;
        const result = await compileScene(scene.code);
        if (cancelled) return;
        updates[scene.id] = result.ok
          ? { hash, component: result.component, error: null }
          : {
              hash,
              component: () => (
                <CompileErrorCard error={result.error} name={scene.name} />
              ),
              error: result.error,
            };
      }
      if (!cancelled) {
        if (Object.keys(updates).length > 0) {
          setEntries((prev) => ({ ...prev, ...updates }));
        }
        setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scenes]);

  const compiled: CompiledScene[] = (scenes ?? [])
    .filter((scene) => entries[scene.id])
    .map((scene) => ({
      id: scene.id,
      name: scene.name,
      durationInFrames: scene.durationInFrames,
      component: entries[scene.id]!.component,
      audioUrl: scene.audioUrl,
      audioVolume: scene.audioVolume,
    }));

  const errors: Record<string, CompileError> = {};
  for (const scene of scenes ?? []) {
    const entry = entries[scene.id];
    if (entry?.error) errors[scene.id] = entry.error;
  }

  return { compiled, errors, initializing };
}
