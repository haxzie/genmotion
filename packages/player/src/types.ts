import type { ComponentType } from "react";

/** A scene whose code has already been compiled to a React component. */
export interface CompiledScene {
  id: string;
  name: string;
  durationInFrames: number;
  component: ComponentType;
  /** Scene-level voiceover/music, played from the scene's first frame (preview only; export mixes it via ffmpeg). */
  audioUrl?: string | null;
  audioVolume?: number;
}
