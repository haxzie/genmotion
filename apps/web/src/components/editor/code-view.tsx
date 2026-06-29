"use client";

import { useState } from "react";
import type { SceneData } from "@genmotion/shared";
import { cx } from "@/components/ui";
import { SceneIcon } from "./scene-icon";
import CodeBlock from "./code-block";

export function CodeView({ scenes }: { scenes: SceneData[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = scenes.find((s) => s.id === selectedId) ?? scenes[0] ?? null;

  return (
    <div className="flex min-h-0 flex-1">
      {/* Left: scene list */}
      <div className="flex w-64 shrink-0 flex-col border-r border-border">
        <div className="flex h-10 shrink-0 items-center border-b border-border px-3">
          <span className="text-[0.857rem] font-medium">Scenes</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {scenes.length === 0 ? (
            <p className="px-2 py-8 text-center text-[0.786rem] text-text-tertiary">
              No scenes yet.
            </p>
          ) : (
            scenes.map((scene) => {
              const active = selected?.id === scene.id;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setSelectedId(scene.id)}
                  className={cx(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.857rem] transition-colors",
                    active
                      ? "bg-surface-raised text-text-primary"
                      : "text-text-secondary hover:bg-surface-raised/60 hover:text-text-primary",
                  )}
                >
                  <SceneIcon className="size-4 shrink-0" />
                  <span className="truncate">{scene.name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right: code */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
              <SceneIcon className="size-4 shrink-0 text-text-tertiary" />
              <span className="truncate text-[0.857rem] text-text-secondary">
                {selected.name}
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <CodeBlock code={selected.code} fill />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-text-tertiary">
            Select a scene to view its code
          </div>
        )}
      </div>
    </div>
  );
}
