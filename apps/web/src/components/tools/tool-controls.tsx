"use client";

/**
 * The two controls every free video generator has: a row of chips to pick an
 * option, and the transport under the preview.
 *
 * Shared by `video-tool` (the metric generators) and `lanyard-tool`, which have
 * almost nothing else in common: one looks a number up and renders a DOM
 * template, the other reads two images off disk and renders a 3D scene.
 */

import type { ComponentType } from "react";
import { usePlaybackStore } from "@genmotion/player";
import { Button, cx } from "@/components/ui";
import { DURATION_IN_FRAMES, FPS } from "@/lib/video-tools/types";

export interface TransportProps {
  /** Composition length. The lanyard tool's is not the shared six seconds. */
  durationInFrames?: number;
  fps?: number;
}

export interface ChipOption {
  value: string;
  label: string;
  Icon?: ComponentType<{ className?: string }>;
  /** A colour swatch instead of a glyph, for the strap picker. */
  swatch?: string;
  title?: string;
}

export function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[0.857rem] text-text-secondary">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            title={option.title}
            className={cx(
              "flex h-8 items-center gap-1.5 rounded-md border px-3 text-[0.9rem] transition-colors duration-150",
              value === option.value
                ? "border-border-strong bg-surface-raised text-text-primary"
                : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
            )}
          >
            {option.Icon && <option.Icon className="size-4 shrink-0" />}
            {option.swatch && (
              <span
                aria-hidden
                className="size-3.5 shrink-0 rounded-full border border-white/20"
                style={{ background: option.swatch }}
              />
            )}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Transport({
  durationInFrames = DURATION_IN_FRAMES,
  fps = FPS,
}: TransportProps = {}) {
  const frame = usePlaybackStore((s) => s.frame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const toggle = usePlaybackStore((s) => s.toggle);
  const seek = usePlaybackStore((s) => s.seek);

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" onClick={toggle} aria-label={isPlaying ? "Pause" : "Play"}>
        {isPlaying ? "Pause" : "Play"}
      </Button>
      <input
        type="range"
        min={0}
        max={durationInFrames - 1}
        value={frame}
        aria-label="Timeline"
        onChange={(e) => seek(Number(e.target.value))}
        className="flex-1 accent-accent"
      />
      <span className="w-14 text-right font-mono text-[0.857rem] text-text-tertiary tabular-nums">
        {(frame / fps).toFixed(1)}s
      </span>
    </div>
  );
}
