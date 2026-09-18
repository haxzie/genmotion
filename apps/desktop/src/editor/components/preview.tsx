"use client";

import { useEffect } from "react";
import {
  Player,
  usePlaybackStore,
  usePlaybackStoreApi,
  selectDisplayFrame,
  type CompiledScene,
} from "@genmotion/player";
import { framesToTimecode, type AudioClipData } from "@genmotion/shared";
import { Spinner, cx } from "@/components/ui";
import { PreviewInspector } from "./preview-inspector";
import { PreviewTools } from "./preview-tools";
import { useTabActive } from "../../tabs/active-tab";

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 16 16" className="size-5" fill="currentColor">
      <rect x="3" y="2" width="4" height="12" rx="1" />
      <rect x="9" y="2" width="4" height="12" rx="1" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="size-5" fill="currentColor">
      <path d="M4.5 2.7a1 1 0 0 1 1.53-.85l8 5.3a1 1 0 0 1 0 1.7l-8 5.3a1 1 0 0 1-1.53-.85V2.7Z" />
    </svg>
  );
}

function SkipStartIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <rect x="2.5" y="2.5" width="1.8" height="11" rx="0.9" />
      <path d="M13.5 3.6a1 1 0 0 0-1.55-.83l-6.3 4.4a1 1 0 0 0 0 1.66l6.3 4.4a1 1 0 0 0 1.55-.83V3.6Z" />
    </svg>
  );
}

function SkipEndIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <rect x="11.7" y="2.5" width="1.8" height="11" rx="0.9" />
      <path d="M2.5 3.6a1 1 0 0 1 1.55-.83l6.3 4.4a1 1 0 0 1 0 1.66l-6.3 4.4a1 1 0 0 1-1.55-.83V3.6Z" />
    </svg>
  );
}

function TransportButton({
  title,
  onClick,
  disabled,
  active,
  primary,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex items-center justify-center transition-colors disabled:opacity-40",
        // Play is the one button that changes state: green at rest, white
        // while the video runs — the same signal as a live indicator. Raised
        // like a real key: a light edge on top, a darker one underneath, and
        // it sinks a pixel when pressed. No glow — the colour is the signal.
        primary
          ? cx(
              "size-11 rounded-full active:translate-y-px active:shadow-none",
              active
                ? "bg-[linear-gradient(180deg,#ffffff_0%,#e4e4e8_100%)] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_0_rgba(0,0,0,0.18)] hover:bg-[linear-gradient(180deg,#ffffff_0%,#f0f0f3_100%)]"
                : "bg-[linear-gradient(180deg,#22d37f_0%,#06b35e_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-2px_0_rgba(0,0,0,0.28)] hover:bg-[linear-gradient(180deg,#2fe08a_0%,#08bf65_100%)]",
            )
          : cx(
              "size-9 rounded-md text-text-primary hover:bg-surface-hover",
              active && "bg-accent-muted text-accent",
            ),
      )}
      title={title}
    >
      {children}
    </button>
  );
}

/**
 * The transport under a preview: timecode, jump/play/jump, frame readout, and
 * the keyboard shortcuts that drive them. Shared by the React stage and the
 * HyperFrames one — both run on the same playback store, so one set of
 * controls serves either.
 */
export function PreviewTransport({ projectId, fps }: { projectId: string; fps: number }) {
  // The readout describes the picture, so it follows a timeline hover along
  // with it — a timecode that disagreed with the frame on screen would be
  // worse than one that moves. The playhead itself stays put.
  const playback = usePlaybackStoreApi();
  const frame = usePlaybackStore(selectDisplayFrame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const totalFrames = usePlaybackStore((s) => s.totalFrames);
  const toggle = usePlaybackStore((s) => s.toggle);
  const seek = usePlaybackStore((s) => s.seek);
  const tabActive = useTabActive();
  const empty = totalFrames === 0;

  // Space toggles playback unless typing in an input — and only in the tab
  // in front, or one press would scrub every open project.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!tabActive) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      }
      if (e.code === "ArrowLeft") seek(playback.getState().frame - (e.shiftKey ? 10 : 1));
      if (e.code === "ArrowRight") seek(playback.getState().frame + (e.shiftKey ? 10 : 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, seek, playback, tabActive]);

  return (
    <div className="relative flex shrink-0 items-center justify-between bg-surface px-4 pt-1 pb-4">
      <span className="font-mono text-[0.857rem] text-text-secondary tabular-nums">
        {framesToTimecode(frame, fps)}{" "}
        <span className="text-text-tertiary">/ {framesToTimecode(totalFrames, fps)}</span>
      </span>
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
        <TransportButton title="Jump to start" onClick={() => seek(0)} disabled={empty}>
          <SkipStartIcon />
        </TransportButton>
        <TransportButton
          title="Play/Pause (Space)"
          onClick={toggle}
          disabled={empty}
          active={isPlaying}
          primary
        >
          <PlayIcon playing={isPlaying} />
        </TransportButton>
        <TransportButton
          title="Jump to end"
          onClick={() => seek(playback.getState().totalFrames - 1)}
          disabled={empty}
        >
          <SkipEndIcon />
        </TransportButton>
      </div>
      {/* The tool dock sits here, under the frame rather than over it, so
          nothing of the video is ever behind a button. */}
      <PreviewTools projectId={projectId} />
    </div>
  );
}

export function PreviewStage({
  projectId,
  scenes,
  fps,
  width,
  height,
  audioClips,
  initializing,
}: {
  projectId: string;
  scenes: CompiledScene[];
  fps: number;
  width: number;
  height: number;
  audioClips?: AudioClipData[];
  initializing: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 p-4">
        {/* The stage. The dotted canvas lives here, not on the inspector, so it
            backs every state — compiling, empty and playing alike — and fills
            whatever the window leaves rather than only the frame's footprint.
            Padded so the frame never touches the canvas's edge on either axis. */}
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
              <Player
                scenes={scenes}
                fps={fps}
                width={width}
                height={height}
                audioClips={audioClips}
              />
            </PreviewInspector>
          )}
        </div>
      </div>

      <PreviewTransport projectId={projectId} fps={fps} />
    </div>
  );
}
