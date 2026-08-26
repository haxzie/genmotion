"use client";

import {
  FrameContext,
  SequenceDurationContext,
  useCurrentFrame,
} from "../context";
import { AbsoluteFill } from "./layout";

export interface SequenceProps {
  /** Frame (relative to the parent) at which this sequence starts. */
  from?: number;
  /** How long the sequence is mounted; defaults to forever. */
  durationInFrames?: number;
  /** "absolute-fill" wraps children in <AbsoluteFill>; "none" renders in place. */
  layout?: "absolute-fill" | "none";
  children: React.ReactNode;
}

/**
 * Time-shifts children: inside the sequence, useCurrentFrame() starts at 0
 * when the parent reaches `from`. Children unmount outside the window.
 */
export function Sequence({
  from = 0,
  durationInFrames = Infinity,
  layout = "absolute-fill",
  children,
}: SequenceProps) {
  const frame = useCurrentFrame();

  if (frame < from || frame >= from + durationInFrames) return null;

  const content =
    layout === "absolute-fill" ? <AbsoluteFill>{children}</AbsoluteFill> : children;

  return (
    <SequenceDurationContext.Provider value={durationInFrames}>
      <FrameContext.Provider value={frame - from}>
        {content}
      </FrameContext.Provider>
    </SequenceDurationContext.Provider>
  );
}
