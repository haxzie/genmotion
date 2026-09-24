"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  mountThreeRenderHost,
  type ThreeCompiledScene,
  type ThreeObjectBox,
} from "@genmotion/three-engine";
import { usePlaybackStore, usePlaybackStoreApi, selectDisplayFrame } from "@genmotion/player";
import {
  Audio,
  FrameContext,
  VideoConfigContext,
  RenderModeContext,
  PlayingContext,
} from "@genmotion/motion";
import { globalToLocal, type AudioClipData } from "@genmotion/shared";
import { Spinner } from "@/components/ui";
import { PreviewTransport } from "../preview";
import { PreviewInspector } from "../preview-inspector";

/**
 * One project audio clip, mounted only while the playhead is inside its
 * [startFrame, startFrame+duration) range — the same component and the same
 * rule `@genmotion/player`'s `Composition` uses for a react-engine project,
 * since the audio side of a preview has nothing to do with how the picture
 * is drawn.
 */
function ProjectAudioClipLayer({
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
  const active = frame >= clip.startFrame && frame < clip.startFrame + clip.durationInFrames;
  if (!active) return null;
  return (
    <VideoConfigContext.Provider value={{ fps, width, height, durationInFrames: clip.durationInFrames }}>
      <FrameContext.Provider value={frame - clip.startFrame}>
        <Audio src={clip.url} volume={clip.volume} startFrom={clip.startFrom} />
      </FrameContext.Provider>
    </VideoConfigContext.Provider>
  );
}

/**
 * The scene graph, as elements.
 *
 * The preview's selection tools all read the DOM under the pointer — hover
 * highlight, marquee, the comment bubble, the Draw tool's "what did I
 * scribble on". A Three.js scene offers them one canvas and nothing else, so
 * they had nothing to find and the whole toolbar sat inert on a Three.js
 * project. Laying one empty, invisible element over each object's projected
 * box gives those tools exactly what they already know how to read, and the
 * rules they apply — snap to the nearest id'd element, never select something
 * that fills the frame, keep only the deepest hit inside a marquee — turn out
 * to mean the right thing for a scene graph too.
 *
 * Boxes are composition pixels and this layer is inside the same scaled box
 * as the canvas, so they line up at any zoom. `transparent`, never drawn: the
 * highlight the inspector paints is the only thing the user sees.
 */
function SceneOverlay({ objects }: { objects: ThreeObjectBox[] }) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {objects.map((object) => (
        <div
          key={`${object.id}:${object.left}:${object.top}`}
          id={object.id}
          data-three-type={object.type}
          style={{
            position: "absolute",
            left: object.left,
            top: object.top,
            width: object.width,
            height: object.height,
          }}
        />
      ))}
    </div>
  );
}

/**
 * The live canvas for a Three.js-engine project. Structurally the same idea
 * as `@genmotion/player`'s `Player` (scale-to-fit box, an anchored real-time
 * playback clock, the same shared playback store), but there is no React
 * tree to render into — scenes own a `WebGLRenderer`/canvas directly through
 * `mountThreeRenderHost`, so this component only has to keep that host's
 * `setFrame` in sync with the store.
 *
 * Reusing the export path's exact host (not a separate preview-only one)
 * means what is scrubbed here and what `capture_frames`/export produce are
 * provably the same code, not merely similar.
 *
 * Audio is a second, independent layer — plain `<audio>` elements driven by
 * the same frame, not something the Three.js scene graph knows about. A
 * scene's own voiceover and the project's music/SFX clips play here exactly
 * the way the react engine's `Composition` plays them, since the export
 * mixes both from `project.json` with ffmpeg either way; only the picture is
 * engine-specific.
 */
function ThreeCanvas({
  scenes,
  fps,
  width,
  height,
  audioClips,
}: {
  scenes: ThreeCompiledScene[];
  fps: number;
  width: number;
  height: number;
  audioClips?: AudioClipData[];
}) {
  const store = usePlaybackStoreApi();
  const frame = usePlaybackStore(selectDisplayFrame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);

  const totalFrames = scenes.reduce((n, s) => n + s.durationInFrames, 0);
  useEffect(() => {
    store.getState().setTotalFrames(totalFrames);
  }, [totalFrames, store]);

  // Anchored playback clock — the same shape as `Player`'s: jank skips
  // frames rather than letting the picture drift behind wall-clock time.
  useEffect(() => {
    if (!isPlaying) return;
    let anchor = performance.now() - (store.getState().frame / fps) * 1000;
    let lastSetFrame = store.getState().frame;
    let raf: number;

    const tick = () => {
      const { totalFrames: total, isPlaying: playing, frame: current } = store.getState();
      if (!playing) return;
      if (current !== lastSetFrame) {
        anchor = performance.now() - (current / fps) * 1000;
        lastSetFrame = current;
      }
      const next = Math.floor(((performance.now() - anchor) / 1000) * fps);
      if (next >= total - 1) {
        store.setState({ frame: 0, isPlaying: false });
        return;
      }
      if (next !== current) {
        store.setState({ frame: next });
        lastSetFrame = next;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, fps, store]);

  // Scale-to-fit, identical to `Player`'s.
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width: cw, height: ch } = entry.contentRect;
      setScale(Math.min(cw / width, ch / height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height]);

  // The host itself: one renderer for as long as the scene list and the
  // composition's own dimensions stay the same — rebuilt on those, never on a
  // frame change, which is what `setFrame` (below) is for.
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ReturnType<typeof mountThreeRenderHost> | null>(null);
  useLayoutEffect(() => {
    const container = canvasHostRef.current;
    if (!container || scenes.length === 0) {
      handleRef.current = null;
      return;
    }
    const host = mountThreeRenderHost({ container, scenes, fps, width, height });
    handleRef.current = host;
    return () => {
      handleRef.current = null;
      host.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, fps, width, height]);

  // What the scene is made of, as boxes over the canvas — see `SceneOverlay`.
  // Read after the frame is drawn, since the boxes describe that frame, and
  // only while paused: during playback they would be stale the moment they
  // were measured, and the inspector drops its selection on play anyway.
  const [objects, setObjects] = useState<ThreeObjectBox[]>([]);
  useEffect(() => {
    const host = handleRef.current;
    if (!host) return;
    let live = true;
    if (isPlaying) {
      setObjects([]);
      void host.setFrame(frame);
      return;
    }
    void host.setFrame(frame).then(() => {
      if (live && handleRef.current === host) setObjects(host.describeActiveScene());
    });
    return () => {
      live = false;
    };
  }, [frame, isPlaying]);

  // Which scene owns the current frame, for its own voiceover — the same
  // mapping the render host uses internally to pick a scene to draw.
  const mapping = globalToLocal(scenes, frame);
  const activeScene = mapping ? scenes[mapping.sceneIndex] : null;
  const sceneLocalFrame = mapping ? mapping.localFrame + (activeScene?.startFrom ?? 0) : 0;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "center",
          flexShrink: 0,
          visibility: scale === 0 ? "hidden" : "visible",
        }}
      >
        {/* The renderer appends its canvas here, so React owns no children of
            this element — the overlay is a sibling rather than a child. */}
        <div
          ref={canvasHostRef}
          style={{
            position: "absolute",
            inset: 0,
            background: "#000",
            borderRadius: scale ? 12 / scale : 0,
            overflow: "hidden",
          }}
        />
        <SceneOverlay objects={objects} />
      </div>
      <RenderModeContext.Provider value="preview">
        <PlayingContext.Provider value={isPlaying}>
          <div style={{ display: "none" }}>
            {activeScene?.audioUrl && (
              <VideoConfigContext.Provider
                value={{
                  fps,
                  width,
                  height,
                  durationInFrames: activeScene.durationInFrames,
                }}
              >
                <FrameContext.Provider value={sceneLocalFrame}>
                  <Audio
                    key={`audio-${activeScene.id}`}
                    src={activeScene.audioUrl}
                    volume={activeScene.audioVolume ?? 1}
                  />
                </FrameContext.Provider>
              </VideoConfigContext.Provider>
            )}
            {audioClips?.map((clip) => (
              <ProjectAudioClipLayer
                key={clip.id}
                clip={clip}
                frame={frame}
                fps={fps}
                width={width}
                height={height}
              />
            ))}
          </div>
        </PlayingContext.Provider>
      </RenderModeContext.Provider>
    </div>
  );
}

export function ThreeStage({
  projectId,
  scenes,
  fps,
  width,
  height,
  audioClips,
  initializing,
}: {
  projectId: string;
  scenes: ThreeCompiledScene[];
  fps: number;
  width: number;
  height: number;
  audioClips?: AudioClipData[];
  initializing: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 p-4">
        <div className="gm-dot-canvas relative h-full overflow-hidden rounded-xl border border-border p-6 shadow-[0_8px_40px_rgba(20,20,40,0.16)]">
          {initializing ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-text-tertiary">
                <Spinner />
                <span>Preparing compiler…</span>
              </div>
            </div>
          ) : scenes.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-text-tertiary">
                <p className="text-lg">No scenes yet</p>
                <p className="mt-1">
                  Ask the AI to create your first scene from the chat panel.
                </p>
              </div>
            </div>
          ) : (
            <PreviewInspector projectId={projectId} scenes={scenes} fps={fps} width={width} height={height}>
              <ThreeCanvas scenes={scenes} fps={fps} width={width} height={height} audioClips={audioClips} />
            </PreviewInspector>
          )}
        </div>
      </div>

      <PreviewTransport projectId={projectId} fps={fps} />
    </div>
  );
}
