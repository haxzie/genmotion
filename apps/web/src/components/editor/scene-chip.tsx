"use client";

import { useEditorStore } from "@/stores/editor-store";
import { SceneIcon } from "./scene-icon";

export function SceneChips({
  scenes,
}: {
  scenes: { id: string; name: string }[];
}) {
  const selectedSceneIds = useEditorStore((s) => s.selectedSceneIds);
  const deselectScene = useEditorStore((s) => s.deselectScene);

  const selected = scenes.filter((s) => selectedSceneIds.includes(s.id));
  if (selected.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-1 pb-2">
      {selected.map((scene) => (
        <span
          key={scene.id}
          className="inline-flex items-center gap-1 rounded-full border border-green/40 bg-green-muted py-0.5 pl-2 pr-1 text-[0.857rem] text-green"
        >
          <SceneIcon className="size-3.5 shrink-0" />
          {scene.name}
          <button
            onClick={() => deselectScene(scene.id)}
            className="flex size-4 items-center justify-center rounded-full transition-colors hover:bg-green/25"
            title="Remove from context"
          >
            <svg viewBox="0 0 12 12" className="size-2.5" stroke="currentColor" strokeWidth="1.5" fill="none">
              <path d="M3 3l6 6M9 3l-6 6" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      ))}
    </div>
  );
}

export function AssetChips({
  assets,
}: {
  assets: { id: string; filename: string }[];
}) {
  const selectedAssetIds = useEditorStore((s) => s.selectedAssetIds);
  const deselectAsset = useEditorStore((s) => s.deselectAsset);

  const selected = assets.filter((a) => selectedAssetIds.includes(a.id));
  if (selected.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-1 pb-2">
      {selected.map((asset) => (
        <span
          key={asset.id}
          className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-muted py-0.5 pl-2 pr-1 text-[0.857rem] text-accent"
        >
          <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8.5 12.3 17.2a4 4 0 0 1-5.6-5.6l8.1-8.1a2.5 2.5 0 0 1 3.5 3.5l-8.1 8.1a1 1 0 0 1-1.4-1.4l7.4-7.4" />
          </svg>
          <span className="max-w-[140px] truncate">{asset.filename}</span>
          <button
            onClick={() => deselectAsset(asset.id)}
            className="flex size-4 items-center justify-center rounded-full transition-colors hover:bg-accent/25"
            title="Remove from context"
          >
            <svg viewBox="0 0 12 12" className="size-2.5" stroke="currentColor" strokeWidth="1.5" fill="none">
              <path d="M3 3l6 6M9 3l-6 6" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      ))}
    </div>
  );
}
