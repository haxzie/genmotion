"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/modal";
import { Spinner, cx } from "@/components/ui";
import { useUploadAsset } from "@/hooks/use-assets";
import { useEditorStore } from "@/stores/editor-store";

function UploadGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

/**
 * Attach-a-file modal for the chat: click the drop zone to choose a file, or
 * drag one onto it. The uploaded asset is auto-selected so it lands as a
 * context pill.
 */
export function UploadModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const upload = useUploadAsset(projectId);
  const selectAsset = useEditorStore((s) => s.selectAsset);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || upload.isPending) return;
    setError(null);
    try {
      const asset = await upload.mutateAsync(file);
      selectAsset(asset.id, true); // add to chat context as a pill
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!upload.isPending}
      labelledBy="upload-title"
    >
      <div className="p-6">
        <h2 id="upload-title" className="font-display text-lg font-semibold tracking-tight">
          Attach a file
        </h2>
        <p className="mt-1 text-[0.9rem] text-text-secondary">
          Add an image, video, or audio clip to use in your video.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => !upload.isPending && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !upload.isPending) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cx(
            "mt-5 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center outline-none transition-colors",
            upload.isPending
              ? "cursor-default border-border"
              : dragOver
                ? "cursor-copy border-accent bg-accent-muted"
                : "cursor-pointer border-border hover:border-border-strong hover:bg-surface-raised/40",
          )}
        >
          {upload.isPending ? (
            <>
              <Spinner className="size-5" />
              <p className="text-[0.95rem] text-text-secondary">
                Uploading… {upload.progress ?? 0}%
              </p>
              <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-surface-raised">
                <div
                  className="h-full bg-accent transition-[width] duration-150"
                  style={{ width: `${upload.progress ?? 0}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <UploadGlyph className="size-7 text-text-tertiary" />
              <p className="text-[0.95rem] text-text-primary">
                Click to choose a file, or drag &amp; drop
              </p>
              <p className="text-[0.786rem] text-text-tertiary">
                Images, video, or audio · up to 200MB
              </p>
            </>
          )}
        </div>

        {error && <p className="mt-3 text-[0.857rem] text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
