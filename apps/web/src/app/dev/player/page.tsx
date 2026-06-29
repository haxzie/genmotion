"use client";

import { Player, usePlaybackStore } from "@genmotion/player";
import { framesToTimecode } from "@genmotion/shared";
import { Button } from "@/components/ui";
import { demoScenes } from "./demo-scenes";

const FPS = 30;

function Transport() {
  const frame = usePlaybackStore((s) => s.frame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const totalFrames = usePlaybackStore((s) => s.totalFrames);
  const toggle = usePlaybackStore((s) => s.toggle);
  const seek = usePlaybackStore((s) => s.seek);

  return (
    <div className="flex items-center gap-4 border-t border-border bg-surface px-4 py-3">
      <Button variant="primary" size="sm" onClick={toggle}>
        {isPlaying ? "Pause" : "Play"}
      </Button>
      <input
        type="range"
        min={0}
        max={Math.max(0, totalFrames - 1)}
        value={frame}
        onChange={(e) => seek(Number(e.target.value))}
        className="flex-1 accent-accent"
      />
      <span className="font-mono text-text-secondary">
        {framesToTimecode(frame, FPS)} / {framesToTimecode(totalFrames, FPS)}
      </span>
    </div>
  );
}

export default function PlayerDevPage() {
  return (
    <main className="flex h-screen flex-col">
      <div className="min-h-0 flex-1 bg-background p-6">
        <Player scenes={demoScenes} fps={FPS} width={1920} height={1080} />
      </div>
      <Transport />
    </main>
  );
}
