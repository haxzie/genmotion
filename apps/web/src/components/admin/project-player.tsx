"use client";

import { useEffect, useState } from "react";
import { Player, usePlaybackStore } from "@genmotion/player";
import { framesToTimecode } from "@genmotion/shared";
import { Spinner } from "@/components/ui";
import { useCompiledScenes } from "@/hooks/use-compiled-scenes";
import type { ProjectDetail } from "@/lib/admin/types";

/**
 * Plays the project's own composition in the admin console — the scenes as the
 * editor renders them, not a finished export.
 *
 * Mounting is deferred behind the thumbnail: compiling scene TSX pulls in the
 * wasm compiler and runs every scene's code, which is far too much to do just
 * because someone opened a project to read its stats.
 */
export function ProjectPlayer({ project }: { project: ProjectDetail }) {
  const [started, setStarted] = useState(false);

  // The playback clock is a module-level store shared with the editor, so it
  // survives this component. Reset it on unmount, or reopening a project would
  // resume at another project's frame — or keep playing audio after close.
  useEffect(() => {
    return () => {
      usePlaybackStore.getState().pause();
      usePlaybackStore.getState().seek(0);
    };
  }, []);

  if (!started) {
    return (
      <button
        onClick={() => setStarted(true)}
        aria-label="Play project"
        className="group relative block aspect-video w-full overflow-hidden rounded-lg border border-border bg-surface-raised"
      >
        {project.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.thumbnailUrl}
            alt=""
            className="size-full object-cover"
          />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/45">
          <span className="flex size-12 items-center justify-center rounded-full bg-black/60 text-text-primary backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="ml-0.5 size-6" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </button>
    );
  }

  return <LivePreview project={project} />;
}

/** Split out so the compiler only ever loads once the admin opts in. */
function LivePreview({ project }: { project: ProjectDetail }) {
  const { compiled, initializing } = useCompiledScenes(project.scenes);

  if (initializing) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-surface-raised">
        <Spinner className="size-5 text-text-tertiary" />
      </div>
    );
  }

  if (!compiled.length) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-surface-raised text-[0.85rem] text-text-tertiary">
        This project has no scenes to play.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-black">
      <Player
        scenes={compiled}
        fps={project.fps}
        width={project.width}
        height={project.height}
        audioClips={project.audioClips}
      />
      <Transport fps={project.fps} />
    </div>
  );
}

function Transport({ fps }: { fps: number }) {
  const frame = usePlaybackStore((s) => s.frame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const totalFrames = usePlaybackStore((s) => s.totalFrames);
  const toggle = usePlaybackStore((s) => s.toggle);
  const seek = usePlaybackStore((s) => s.seek);

  // Start playing as soon as the composition is ready — the admin already
  // clicked play on the poster to get here.
  useEffect(() => {
    if (totalFrames > 0) usePlaybackStore.getState().play();
  }, [totalFrames]);

  return (
    <div className="flex items-center gap-3 border-t border-border bg-surface px-3 py-2">
      <button
        onClick={toggle}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-primary transition-colors hover:bg-surface-hover"
      >
        {isPlaying ? (
          <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
            <path d="M4.5 2.7a1 1 0 0 1 1.53-.85l8 5.3a1 1 0 0 1 0 1.7l-8 5.3a1 1 0 0 1-1.53-.85V2.7Z" />
          </svg>
        )}
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(0, totalFrames - 1)}
        value={frame}
        onChange={(e) => seek(Number(e.target.value))}
        className="min-w-0 flex-1 accent-accent"
        aria-label="Seek"
      />
      <span className="shrink-0 font-mono text-[0.72rem] tabular-nums text-text-tertiary">
        {framesToTimecode(frame, fps)} / {framesToTimecode(totalFrames, fps)}
      </span>
    </div>
  );
}
