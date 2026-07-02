"use client";

import { useMemo } from "react";
import {
  Audio,
  FrameContext,
  VideoConfigContext,
  RenderModeContext,
  PlayingContext,
  type RenderMode,
} from "@genmotion/motion";
import { globalToLocal, type AudioClipData } from "@genmotion/shared";
import type { CompiledScene } from "./types";
import { SceneErrorBoundary, type SceneRuntimeError } from "./scene-boundary";

export interface CompositionProps {
  scenes: CompiledScene[];
  /** Global timeline frame. */
  frame: number;
  fps: number;
  width: number;
  height: number;
  mode?: RenderMode;
  playing?: boolean;
  /** Project-level audio (music/ambience/sfx) placed on the global timeline. */
  audioClips?: AudioClipData[];
  onSceneError?: (error: SceneRuntimeError) => void;
}

/**
 * One project audio clip, mounted only while the playhead is inside its
 * [startFrame, startFrame+duration) range, with a clip-local frame context so
 * <Audio> seeks to `startFrom + localFrame/fps`. Preview only — exports mux
 * these tracks with ffmpeg instead (see the renderer's mixAudio).
 */
function AudioClipLayer({
  clip,
  frame,
  fps,
  width,
  height,
}: {
  clip: AudioClipData;
  frame: number;
  fps: number;
  width: number;
  height: number;
}) {
  const active =
    frame >= clip.startFrame &&
    frame < clip.startFrame + clip.durationInFrames;
  if (!active) return null;
  return (
    <VideoConfigContext.Provider
      value={{ fps, width, height, durationInFrames: clip.durationInFrames }}
    >
      <FrameContext.Provider value={frame - clip.startFrame}>
        <Audio src={clip.url} volume={clip.volume} startFrom={clip.startFrom} />
      </FrameContext.Provider>
    </VideoConfigContext.Provider>
  );
}

/**
 * Renders the scene that owns the given global frame, providing the local
 * frame context. The same tree drives the editor preview and the export
 * renderer — what you see is what you render.
 */
export function Composition({
  scenes,
  frame,
  fps,
  width,
  height,
  mode = "preview",
  playing = false,
  audioClips,
  onSceneError,
}: CompositionProps) {
  const mapping = globalToLocal(scenes, frame);
  const scene = mapping ? scenes[mapping.sceneIndex] : null;

  const config = useMemo(
    () =>
      scene
        ? { fps, width, height, durationInFrames: scene.durationInFrames }
        : null,
    [fps, width, height, scene],
  );

  const SceneComponent = scene?.component;

  // Project-level audio plays across the whole timeline (preview only; exports
  // mux it via ffmpeg), so it lives outside the active scene's frame context.
  const clipLayer =
    mode === "preview" && audioClips && audioClips.length > 0 ? (
      <div style={{ display: "none" }}>
        {audioClips.map((clip) => (
          <AudioClipLayer
            key={clip.id}
            clip={clip}
            frame={frame}
            fps={fps}
            width={width}
            height={height}
          />
        ))}
      </div>
    ) : null;

  return (
    <RenderModeContext.Provider value={mode}>
      <PlayingContext.Provider value={playing}>
        {scene && mapping && config && SceneComponent ? (
          <VideoConfigContext.Provider value={config}>
            <FrameContext.Provider value={mapping.localFrame}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#000",
                  overflow: "hidden",
                }}
              >
                <SceneErrorBoundary
                  sceneId={scene.id}
                  sceneName={scene.name}
                  onError={onSceneError}
                >
                  <SceneComponent key={scene.id} />
                </SceneErrorBoundary>
                {/* Scene voiceover: audible in preview; export mixes it with ffmpeg instead. */}
                {mode === "preview" && scene.audioUrl && (
                  <Audio
                    key={`audio-${scene.id}`}
                    src={scene.audioUrl}
                    volume={scene.audioVolume ?? 1}
                  />
                )}
              </div>
            </FrameContext.Provider>
          </VideoConfigContext.Provider>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "#0a0a0c" }} />
        )}
        {clipLayer}
      </PlayingContext.Provider>
    </RenderModeContext.Provider>
  );
}
