"use client";

import { cx } from "@/components/ui";
import { useWaveform, sampleBars } from "@/hooks/use-waveform";

/**
 * One shared amplitude-bar strip so every waveform in the editor — scene
 * voiceovers and project audio clips alike — renders with identical geometry
 * (bar width, gap, density, min height). Only the selection tint differs per
 * context (purple for scenes, orange for audio), passed via `selectedClassName`.
 *
 * Callers own the surrounding container (its height, padding, mute button); this
 * component fills it with `flex-1` bars mapped to real time via `sampleBars`.
 */
export function Waveform({
  url,
  widthPx,
  startSec = 0,
  durationSec,
  selected,
  selectedClassName,
  inactiveClassName = "bg-text-tertiary",
  className,
}: {
  url: string;
  /** Card width in px — drives bar count so wider cards show more detail. */
  widthPx: number;
  /** Seconds into the source where the card begins (0 for scenes; clip trim). */
  startSec?: number;
  /** Card length in seconds — waveform maps to real time, flat past the audio. */
  durationSec: number;
  selected: boolean;
  /** Bar color when selected (e.g. "bg-green" / "bg-orange"). */
  selectedClassName: string;
  /** Bar color when NOT selected — tints the waveform to the card's theme. */
  inactiveClassName?: string;
  /** Extra container classes (flex sizing, muted opacity). */
  className?: string;
}) {
  // ~one bar per 2.5px of card width (minus the 12px of horizontal padding).
  const barCount = Math.max(8, Math.min(200, Math.floor((widthPx - 12) / 2.5)));
  const data = useWaveform(url);
  const bars = sampleBars(data, barCount, startSec, durationSec);
  return (
    // Fixed height + padding live HERE (not the callers) so every waveform —
    // scene or audio — is the exact same strip. items-stretch is essential: it
    // gives each bar wrapper the strip's full height so the spans' percentage
    // heights resolve (items-center would collapse them to zero — invisible).
    <div className={cx("flex h-[18px] items-stretch gap-px px-1.5 pb-1", className)}>
      {bars.map((p, i) => (
        <div key={i} className="flex flex-1 items-center justify-center">
          <span
            className={cx(
              "w-full max-w-[2px] rounded-full",
              selected ? selectedClassName : inactiveClassName,
            )}
            style={{ height: `${Math.max(8, p * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
