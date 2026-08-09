"use client";

import Link from "next/link";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";

export type ExportPhase = "rendering" | "done" | "error";

/**
 * Shown while a free-tool video renders, and again once it has downloaded.
 *
 * The render takes a few seconds, so the wait is the natural place to make the
 * pitch — the modal opens on click, counts the render out, then turns into the
 * call to action. It never gates the download: the file saves on its own either
 * way, because "free, no sign-up" is the promise the whole /tools section is
 * built on.
 */
export function UpsellModal({
  open,
  phase,
  progress,
  error,
  filename,
  onClose,
}: {
  open: boolean;
  phase: ExportPhase;
  /** 0..1, only meaningful while rendering. */
  progress: number;
  error: string | null;
  filename: string | null;
  onClose: () => void;
}) {
  const rendering = phase === "rendering";

  return (
    <Modal
      open={open}
      onClose={onClose}
      // Closing mid-render would leave the export running with nothing showing
      // its progress, so the modal holds until the file is saved or it fails.
      dismissible={!rendering}
      labelledBy="tool-upsell-title"
    >
      {/* The marketing hero's palette (lime / mint / yellow over the dark
          background), scaled from a full-bleed hero to a 144px card header.
          Opacities run higher than the hero's because the box is small and the
          blobs have far less room to bloom. */}
      <div aria-hidden className="relative h-36 overflow-hidden bg-background">
        <div
          className="hue-blob absolute -left-[12%] top-[-30%] size-56 rounded-full blur-[46px] animate-[drift-1_14s_ease-in-out_infinite]"
          style={{ background: "#C6F91E", opacity: 0.5 }}
        />
        <div
          className="hue-blob absolute -right-[10%] top-[-14%] size-60 rounded-full blur-[48px] animate-[drift-2_18s_ease-in-out_infinite]"
          style={{ background: "#16F5BD", opacity: 0.46 }}
        />
        <div
          className="hue-blob absolute bottom-[-46%] left-[34%] size-48 rounded-full blur-[44px] animate-[drift-3_16s_ease-in-out_infinite]"
          style={{ background: "#FFD60A", opacity: 0.38 }}
        />
        {/* Fade into the panel so the heading below sits on solid surface. */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-surface" />

        <div className="relative flex h-full flex-col items-center justify-center gap-3">
          <div className="rounded-2xl border border-border bg-background p-3.5 shadow-[0_10px_32px_rgba(0,0,0,0.45)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="size-9 rounded-[7px]" />
          </div>
          <span className="font-logo text-[1.3rem] tracking-tight text-text-primary">
            GenMotion
          </span>
        </div>
      </div>

      <div className="px-7 pb-7 pt-1 text-center">
        <h2 id="tool-upsell-title" className="font-display text-[1.35rem] font-semibold tracking-tight">
          Create product launch videos with GenMotion
        </h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-text-secondary">
          Get a free account and create product and feature launch videos simply
          by prompting.
        </p>

        <div className="mt-6" aria-live="polite">
          {rendering && (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-150"
                  style={{ width: `${Math.max(4, progress * 100)}%` }}
                />
              </div>
              <p className="mt-2.5 text-[0.857rem] text-text-tertiary">
                Rendering your video… {Math.round(progress * 100)}%
              </p>
            </>
          )}

          {phase === "done" && (
            // Composed as one string: JSX collapses the whitespace between an
            // expression and the text that follows it, which ran the filename
            // straight into the dash.
            <p className="text-[0.9rem] text-green">
              {filename ? `Downloaded ${filename} — it's yours, free.` : "Downloaded — it's yours, free."}
            </p>
          )}

          {phase === "error" && (
            <p role="alert" className="text-[0.9rem] text-danger">
              {error ?? "The export failed."}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/signup"
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-cta px-5 font-medium text-background outline-none transition-colors duration-150 hover:bg-cta-hover focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Create More Videos
          </Link>
          <Button onClick={onClose} disabled={rendering} className="h-9 w-full">
            {rendering ? "Rendering…" : "Maybe later"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
