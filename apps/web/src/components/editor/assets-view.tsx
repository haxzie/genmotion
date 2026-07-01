"use client";

import { useRef, useState } from "react";
import type { AssetData } from "@genmotion/shared";
import {
  useDeleteAsset,
  useProjectAssets,
  useUploadAsset,
} from "@/hooks/use-assets";
import { useEditorStore } from "@/stores/editor-store";
import { Spinner, cx } from "@/components/ui";

function formatBytes(n: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Force a download (the proxy is cross-origin, so the `download` attr alone won't). */
async function downloadAsset(asset: AssetData) {
  try {
    const res = await fetch(asset.url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = asset.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(asset.url, "_blank");
  }
}

type IconProps = { className?: string };

function ImageGlyph({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="M21 15l-5-4-9 7" />
    </svg>
  );
}
function VideoGlyph({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M10 9l5 3-5 3z" />
    </svg>
  );
}
function AudioGlyph({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17V5l10-2v12" />
      <circle cx="6.5" cy="17" r="2.5" />
      <circle cx="16.5" cy="15" r="2.5" />
    </svg>
  );
}
function FileGlyph({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
      <path d="M13 3v6h6" />
    </svg>
  );
}

function DownloadIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

function TrashIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" />
    </svg>
  );
}

function kindIcon(kind: AssetData["kind"]) {
  if (kind === "image") return ImageGlyph;
  if (kind === "video" || kind === "export") return VideoGlyph;
  if (kind === "audio") return AudioGlyph;
  return FileGlyph;
}

function AssetPreview({ asset }: { asset: AssetData }) {
  if (asset.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={asset.url}
        alt={asset.filename}
        className="max-h-full max-w-full rounded object-contain"
      />
    );
  }
  if (asset.kind === "video" || asset.kind === "export") {
    return (
      <video src={asset.url} controls className="max-h-full max-w-full rounded" />
    );
  }
  if (asset.kind === "audio") {
    return <audio src={asset.url} controls className="w-full max-w-md" />;
  }
  return (
    <a href={asset.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
      Open {asset.filename}
    </a>
  );
}

export function AssetsView({ projectId }: { projectId: string }) {
  const { data: assets, isLoading } = useProjectAssets(projectId);
  const uploadAsset = useUploadAsset(projectId);
  const deleteAsset = useDeleteAsset(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAssetIds = useEditorStore((s) => s.selectedAssetIds);
  const selectAsset = useEditorStore((s) => s.selectAsset);
  const deselectAsset = useEditorStore((s) => s.deselectAsset);

  const list = assets ?? [];
  const selected = list.find((a) => a.id === selectedId) ?? list[0] ?? null;

  function handleDelete(asset: AssetData) {
    if (selectedId === asset.id) setSelectedId(null);
    deselectAsset(asset.id); // drop it from chat context if attached
    deleteAsset.mutate(asset.id);
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* Left: file explorer */}
      <div className="flex w-64 shrink-0 flex-col border-r border-border">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
          <span className="text-[0.857rem] font-medium">Files</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAsset.mutate(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAsset.isPending}
            className="text-[0.786rem] text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
          >
            {uploadAsset.isPending
              ? `Uploading… ${uploadAsset.progress ?? 0}%`
              : uploadAsset.isError
                ? "Upload failed — retry"
                : "Upload"}
          </button>
        </div>
        {uploadAsset.isPending && (
          <div className="h-0.5 w-full bg-surface-raised">
            <div
              className="h-full bg-accent transition-[width] duration-150"
              style={{ width: `${uploadAsset.progress ?? 0}%` }}
            />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : list.length === 0 ? (
            <p className="px-2 py-8 text-center text-[0.786rem] text-text-tertiary">
              No assets yet. Upload files or generate them from chat.
            </p>
          ) : (
            list.map((asset) => {
              const Glyph = kindIcon(asset.kind);
              const active = selectedAssetIds.includes(asset.id);
              return (
                <div key={asset.id} className="group relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      setSelectedId(asset.id);
                      selectAsset(asset.id, e.shiftKey);
                    }}
                    className={cx(
                      "flex w-full items-center gap-2 rounded-md py-1.5 pl-2 pr-8 text-left text-[0.857rem] transition-colors",
                      active
                        ? "bg-accent-muted text-accent"
                        : "text-text-secondary hover:bg-surface-raised/60 hover:text-text-primary",
                    )}
                  >
                    <Glyph className="size-4 shrink-0 text-text-tertiary" />
                    <span className="truncate">{asset.filename}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(asset);
                    }}
                    disabled={deleteAsset.isPending}
                    title="Delete asset"
                    aria-label={`Delete ${asset.filename}`}
                    className="pointer-events-none absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-text-tertiary opacity-0 transition-opacity hover:bg-danger/15 hover:text-danger disabled:opacity-50 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: preview */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selected && (
          <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border px-3">
            <span className="truncate text-[0.857rem] text-text-secondary">
              {selected.filename}
            </span>
            <button
              type="button"
              onClick={() => downloadAsset(selected)}
              title="Download"
              aria-label="Download"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <DownloadIcon className="size-4" />
            </button>
          </div>
        )}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#0b0b0d] p-6">
          {selected ? (
            <AssetPreview asset={selected} />
          ) : (
            <p className="text-text-tertiary">Select an asset to preview</p>
          )}
        </div>
        {selected && (
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2 text-[0.786rem] text-text-tertiary">
            <span className="capitalize">{selected.kind}</span>
            {selected.width && selected.height ? (
              <span>
                {selected.width}×{selected.height}
              </span>
            ) : null}
            {selected.durationSeconds ? (
              <span>{selected.durationSeconds.toFixed(1)}s</span>
            ) : null}
            {selected.sizeBytes ? <span>{formatBytes(selected.sizeBytes)}</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}
