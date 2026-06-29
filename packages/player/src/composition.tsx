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
import { globalToLocal } from "@genmotion/shared";
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
  onSceneError?: (error: SceneRuntimeError) => void;
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

  if (!scene || !mapping || !config) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#0a0a0c",
        }}
      />
    );
  }

  const SceneComponent = scene.component;

  return (
    <RenderModeContext.Provider value={mode}>
      <PlayingContext.Provider value={playing}>
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
      </PlayingContext.Provider>
    </RenderModeContext.Provider>
  );
}
