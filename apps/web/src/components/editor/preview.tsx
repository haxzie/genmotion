"use client";

import { useEffect } from "react";
import { Player, usePlaybackStore, type CompiledScene } from "@genmotion/player";
import { framesToTimecode, type AudioClipData } from "@genmotion/shared";
import { Spinner, cx } from "@/components/ui";
import { PreviewInspector } from "./preview-inspector";

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
        "flex items-center justify-center text-text-primary transition-colors hover:bg-surface-hover disabled:opacity-40",
        primary ? "size-11 rounded-full bg-surface-raised" : "size-9 rounded-md",
        active && "bg-accent-muted text-accent",
      )}
      title={title}
    >
      {children}
    </button>
  );
}

export function PreviewStage({
  scenes,
  fps,
  width,
  height,
  audioClips,
  initializing,
}: {
  scenes: CompiledScene[];
  fps: number;
  width: number;
  height: number;
  audioClips?: AudioClipData[];
  initializing: boolean;
}) {
  const frame = usePlaybackStore((s) => s.frame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const totalFrames = usePlaybackStore((s) => s.totalFrames);
  const toggle = usePlaybackStore((s) => s.toggle);
  const seek = usePlaybackStore((s) => s.seek);

  // Space toggles playback unless typing in an input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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
      if (e.code === "ArrowLeft") seek(usePlaybackStore.getState().frame - (e.shiftKey ? 10 : 1));
      if (e.code === "ArrowRight") seek(usePlaybackStore.getState().frame + (e.shiftKey ? 10 : 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, seek]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 p-4">
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
          <PreviewInspector scenes={scenes} fps={fps}>
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

      <div className="relative flex shrink-0 items-center justify-between bg-surface px-4 pt-1 pb-4">
        <span className="font-mono text-[0.857rem] text-text-secondary tabular-nums">
          {framesToTimecode(frame, fps)}{" "}
          <span className="text-text-tertiary">/ {framesToTimecode(totalFrames, fps)}</span>
        </span>
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
          <TransportButton
            title="Jump to start"
            onClick={() => seek(0)}
            disabled={scenes.length === 0}
          >
            <SkipStartIcon />
          </TransportButton>
          <TransportButton
            title="Play/Pause (Space)"
            onClick={toggle}
            disabled={scenes.length === 0}
            active={isPlaying}
            primary
          >
            <PlayIcon playing={isPlaying} />
          </TransportButton>
          <TransportButton
            title="Jump to end"
            onClick={() => seek(usePlaybackStore.getState().totalFrames - 1)}
            disabled={scenes.length === 0}
          >
            <SkipEndIcon />
          </TransportButton>
        </div>
        <span className="font-mono text-[0.786rem] text-text-tertiary">
          frame {frame} · {fps}fps
        </span>
      </div>
    </div>
  );
}
