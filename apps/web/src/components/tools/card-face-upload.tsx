"use client";

/**
 * One face of the badge: a drop target that becomes a thumbnail, with the size
 * it wants printed on it and the size it got reported back.
 *
 * Nothing is uploaded; the file is read into an object URL and decoded in the
 * tab. The field says so, because "upload" is the word for this interaction
 * everywhere else on the web and it is the one thing people reasonably worry
 * about when the image is their employee badge.
 */

import { useId, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { adviseArt, uploadHint } from "@/lib/video-tools/lanyard/guidance";
import { ACCEPTED_ART_TYPES, type CardArt, type CardShapeId } from "@/lib/video-tools/lanyard/types";

export function CardFaceUpload({
  label,
  optional = false,
  art,
  shape,
  error,
  onPick,
  onClear,
}: {
  label: string;
  optional?: boolean;
  art: CardArt | null;
  shape: CardShapeId;
  /** Why the last attempt was rejected, if it was. */
  error: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const advice = art ? adviseArt(art, shape) : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-[0.857rem] text-text-secondary">
          {label}
          {optional && <span className="text-text-tertiary"> (optional)</span>}
        </label>
        {art && (
          <button
            type="button"
            onClick={onClear}
            className="text-[0.786rem] text-text-tertiary transition-colors hover:text-text-secondary"
          >
            Remove
          </button>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) onPick(file);
        }}
        className={cx(
          "relative flex min-h-[7.5rem] items-center gap-3.5 rounded-lg border border-dashed p-3.5 transition-colors duration-150",
          dragging
            ? "border-accent/70 bg-accent/5"
            : "border-border bg-surface hover:border-border-strong",
        )}
      >
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art.url}
            alt=""
            className="h-24 w-auto max-w-[5.5rem] shrink-0 rounded border border-border object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-24 w-[3.75rem] shrink-0 items-center justify-center rounded border border-border bg-surface-raised text-text-tertiary"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M8 8l4-4 4 4" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          </span>
        )}

        <div className="flex min-w-0 flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="self-start text-[0.9rem] text-text-primary underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-text-secondary"
          >
            {art ? "Replace image" : "Choose an image"}
          </button>
          {art && (
            <span className="truncate text-[0.786rem] text-text-tertiary" title={art.name}>
              {art.name}
            </span>
          )}
          <p className="text-[0.786rem] leading-relaxed text-text-tertiary">
            {art ? null : <>Drop it here. {uploadHint(shape)}</>}
          </p>
          {advice.map((item) => (
            <p
              key={item.message}
              className={cx(
                "text-[0.786rem] leading-relaxed",
                item.tone === "warn" ? "text-warning" : "text-text-tertiary",
              )}
            >
              {item.message}
            </p>
          ))}
          {error && (
            <p role="alert" className="text-[0.786rem] leading-relaxed text-danger">
              {error}
            </p>
          )}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_ART_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            // Reset, so picking the same file twice in a row still fires.
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
