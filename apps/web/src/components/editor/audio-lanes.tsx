"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { usePlaybackStore } from "@genmotion/player";
import {
  clipsOverlap,
  MAX_AUDIO_TRACKS,
  type AudioClipData,
} from "@genmotion/shared";
import { cx } from "@/components/ui";
import { useEditorStore } from "@/stores/editor-store";
import { Waveform } from "./waveform";

export interface AudioAssetOption {
  id: string;
  url: string;
  filename: string;
  durationSeconds?: number | null;
}

/** Height of one audio lane row, in px. Tall enough for a header + waveform. */
export const AUDIO_LANE_HEIGHT = 48;

type DragMode = "move" | "resize-l" | "resize-r";

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

// Match the scene voiceover mute toggle's icons.
function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" />
    </svg>
  );
}
function SpeakerMutedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </svg>
  );
}

interface Draft {
  id: string;
  startFrame: number;
  durationInFrames: number;
  startFrom: number;
  track: number;
}

/** Amplitude strip along the bottom of a clip, mirroring the scene waveform. */
function ClipWaveform({
  url,
  widthPx,
  startSec,
  durationSec,
  muted,
  selected,
}: {
  url: string;
  widthPx: number;
  /** Seconds into the source where the clip starts (its trim/startFrom). */
  startSec: number;
  /** Clip length in seconds — waveform maps to real time, flat past the audio. */
  durationSec: number;
  muted: boolean;
  selected: boolean;
}) {
  return (
    <Waveform
      url={url}
      widthPx={widthPx}
      startSec={startSec}
      durationSec={durationSec}
      selected={selected}
      selectedClassName="bg-orange"
      inactiveClassName="bg-orange/55"
      className={cx(
        "pointer-events-none mt-auto shrink-0",
        muted && "opacity-40",
      )}
    />
  );
}

/**
 * Project-level audio lanes below the scene track. Clips are movable (drag the
 * body — horizontally in time, vertically between lanes) and resizable (drag
 * either edge to trim). Scenes are never touched here. Optimistic edits are
 * committed through the passed callbacks; overlaps are rejected client-side so
 * the clip snaps back instead of round-tripping a 409.
 */
export function AudioLanes({
  clips,
  laneCount,
  fps,
  pxPerFrame,
  padding,
  totalFrames,
  audioAssets,
  onUpdate,
  onAdd,
}: {
  clips: AudioClipData[];
  laneCount: number;
  fps: number;
  pxPerFrame: number;
  padding: number;
  totalFrames: number;
  audioAssets: AudioAssetOption[];
  onUpdate: (input: {
    clipId: string;
    startFrame?: number;
    durationInFrames?: number;
    startFrom?: number;
    volume?: number;
    track?: number;
  }) => void;
  onAdd: (input: {
    url: string;
    assetId?: string;
    name?: string;
    startFrame: number;
    durationInFrames?: number;
    track: number;
  }) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dropLane, setDropLane] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const lanesRef = useRef<HTMLDivElement>(null);

  const selectedIds = useEditorStore((s) => s.selectedAudioClipIds);
  const selectClip = useEditorStore((s) => s.selectAudioClip);
  const clearAllSelection = useEditorStore((s) => s.clearAllSelection);

  const clampFrame = (f: number) => Math.max(0, Math.round(f));

  /** First lane (0..laneCount-1) with room for a clip at [start, start+dur). */
  function pickLane(start: number, dur: number): number {
    for (let lane = 0; lane < laneCount; lane++) {
      const busy = clips.some(
        (c) =>
          c.track === lane &&
          clipsOverlap(c, { track: lane, startFrame: start, durationInFrames: dur }),
      );
      if (!busy) return lane;
    }
    return 0; // fall back to lane 0 — the server re-resolves / rejects overlaps.
  }

  function addFromAsset(asset: AudioAssetOption) {
    setMenuOpen(false);
    const start = Math.max(0, usePlaybackStore.getState().frame);
    const dur = asset.durationSeconds
      ? Math.max(1, Math.round(asset.durationSeconds * fps))
      : fps * 8;
    onAdd({
      url: asset.url,
      assetId: asset.id,
      name: asset.filename.replace(/\.[a-zA-Z0-9]+$/, ""),
      startFrame: start,
      durationInFrames: asset.durationSeconds ? dur : undefined,
      track: pickLane(start, dur),
    });
  }

  function laneFromClientY(clientY: number): number {
    const el = lanesRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const lane = Math.floor((clientY - rect.top) / AUDIO_LANE_HEIGHT);
    return Math.min(laneCount - 1, Math.max(0, lane));
  }

  function beginDrag(
    e: ReactPointerEvent<HTMLElement>,
    clip: AudioClipData,
    mode: DragMode,
  ) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const shiftKey = e.shiftKey;
    const orig = { ...clip };
    // Don't start a draft until the pointer actually moves — a click without
    // movement is a selection, not a drag.
    let moved = false;

    const move = (ev: PointerEvent) => {
      if (
        !moved &&
        Math.abs(ev.clientX - startX) < 3 &&
        Math.abs(ev.clientY - startY) < 3
      ) {
        return;
      }
      moved = true;
      const dxFrames = Math.round((ev.clientX - startX) / pxPerFrame);
      let next: Draft;
      if (mode === "move") {
        next = {
          id: orig.id,
          startFrame: clampFrame(orig.startFrame + dxFrames),
          durationInFrames: orig.durationInFrames,
          startFrom: orig.startFrom,
          track: laneFromClientY(ev.clientY),
        };
      } else if (mode === "resize-l") {
        const newStart = Math.min(
          clampFrame(orig.startFrame + dxFrames),
          orig.startFrame + orig.durationInFrames - 1,
        );
        const shift = newStart - orig.startFrame;
        next = {
          id: orig.id,
          startFrame: newStart,
          durationInFrames: orig.durationInFrames - shift,
          startFrom: Math.max(0, orig.startFrom + shift / fps),
          track: orig.track,
        };
      } else {
        next = {
          id: orig.id,
          startFrame: orig.startFrame,
          durationInFrames: Math.max(1, orig.durationInFrames + dxFrames),
          startFrom: orig.startFrom,
          track: orig.track,
        };
      }
      setDraft(next);
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!moved) {
        // A plain click (no drag) selects the clip as chat context.
        selectClip(clip.id, shiftKey);
        return;
      }
      setDraft((d) => {
        if (d) {
          const changed =
            d.startFrame !== orig.startFrame ||
            d.durationInFrames !== orig.durationInFrames ||
            d.startFrom !== orig.startFrom ||
            d.track !== orig.track;
          const overlaps = clips.some(
            (c) =>
              c.id !== d.id &&
              c.track === d.track &&
              clipsOverlap(c, {
                track: d.track,
                startFrame: d.startFrame,
                durationInFrames: d.durationInFrames,
              }),
          );
          if (changed && !overlaps) {
            onUpdate({
              clipId: d.id,
              startFrame: d.startFrame,
              durationInFrames: d.durationInFrames,
              startFrom: Number(d.startFrom.toFixed(3)),
              track: d.track,
            });
          }
        }
        return null;
      });
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function handleDrop(e: React.DragEvent, lane: number) {
    e.preventDefault();
    setDropLane(null);
    const raw = e.dataTransfer.getData("application/x-gm-audio");
    if (!raw) return;
    let payload: { url: string; assetId?: string; name?: string; durationSeconds?: number };
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const el = lanesRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const startFrame = clampFrame((e.clientX - rect.left - padding) / pxPerFrame);
    onAdd({
      url: payload.url,
      assetId: payload.assetId,
      name: payload.name,
      startFrame,
      durationInFrames: payload.durationSeconds
        ? Math.max(1, Math.round(payload.durationSeconds * fps))
        : undefined,
      track: lane,
    });
  }

  const isEmpty = clips.length === 0;

  return (
    <div
      ref={lanesRef}
      className="relative shrink-0 border-t border-border/60"
      style={{ height: laneCount * AUDIO_LANE_HEIGHT }}
    >
      {Array.from({ length: laneCount }, (_, lane) => (
        <div
          key={lane}
          className={cx(
            "relative border-b border-border/40",
            dropLane === lane && "bg-surface-hover",
          )}
          style={{ height: AUDIO_LANE_HEIGHT }}
          onPointerDown={(e) => {
            // Clicking empty lane space clears the clip selection.
            if (e.target === e.currentTarget) clearAllSelection();
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("application/x-gm-audio")) {
              e.preventDefault();
              setDropLane(lane);
            }
          }}
          onDragLeave={() => setDropLane((l) => (l === lane ? null : l))}
          onDrop={(e) => handleDrop(e, lane)}
        >
          {isEmpty && lane === 0 && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[0.72rem] text-text-tertiary/70">
              Drop an audio asset here, or ask the AI for music
            </span>
          )}
        </div>
      ))}

      {clips.map((clip) => {
        const d = draft && draft.id === clip.id ? draft : null;
        const startFrame = d ? d.startFrame : clip.startFrame;
        const duration = d ? d.durationInFrames : clip.durationInFrames;
        const startFrom = d ? d.startFrom : clip.startFrom;
        const track = d ? d.track : clip.track;
        const muted = clip.volume <= 0;
        const selected = selectedIds.includes(clip.id);
        const left = padding + startFrame * pxPerFrame;
        const width = Math.max(6, duration * pxPerFrame);
        const top = track * AUDIO_LANE_HEIGHT + 2;
        return (
          <div
            key={clip.id}
            className={cx(
              "group absolute flex cursor-grab select-none flex-col overflow-hidden rounded-md border transition-colors duration-150 active:cursor-grabbing",
              selected
                ? "border-orange bg-orange-muted"
                : "border-orange/25 bg-orange/[0.06] hover:border-orange/45 hover:bg-orange/12",
              d && "z-20 shadow-lg",
            )}
            style={{ left, width, top, height: AUDIO_LANE_HEIGHT - 4 }}
            onPointerDown={(e) => beginDrag(e, clip, "move")}
            title={clip.name}
          >
            {/* Header: music icon + name (mirrors the scene card) */}
            <div className="flex min-w-0 items-center gap-1 px-1.5 pt-1">
              <MusicIcon
                className={cx(
                  "size-3 shrink-0",
                  muted
                    ? "text-text-tertiary"
                    : selected
                      ? "text-orange"
                      : "text-orange/80",
                )}
              />
              <span
                className={cx(
                  "truncate text-[0.72rem] font-medium leading-tight",
                  muted
                    ? "text-text-tertiary"
                    : selected
                      ? "text-orange"
                      : "text-orange/80",
                )}
              >
                {clip.name}
              </span>
            </div>

            <ClipWaveform
              url={clip.url}
              widthPx={width}
              startSec={startFrom}
              durationSec={duration / fps}
              muted={muted}
              selected={selected}
            />

            {/* Left trim handle */}
            <div
              className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize hover:bg-border-strong"
              onPointerDown={(e) => beginDrag(e, clip, "resize-l")}
            />
            {/* Right trim handle */}
            <div
              className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-ew-resize hover:bg-border-strong"
              onPointerDown={(e) => beginDrag(e, clip, "resize-r")}
            />
            {/* Mute/unmute toggle — same treatment as the scene voiceover. */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ clipId: clip.id, volume: muted ? 1 : 0 });
              }}
              title={muted ? "Unmute" : "Mute"}
              className={cx(
                "absolute right-1 top-1 z-10 flex items-center rounded text-text-tertiary transition-opacity duration-150 hover:text-text-primary",
                muted ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              {muted ? (
                <SpeakerMutedIcon className="size-3.5" />
              ) : (
                <SpeakerIcon className="size-3.5" />
              )}
            </button>
          </div>
        );
      })}

      {/* Sticky add-audio picker: stays pinned to the left while the track scrolls. */}
      <div className="pointer-events-none sticky left-1 top-1 z-30 inline-block">
        <div className="pointer-events-auto relative">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMenuOpen((o) => !o)}
            title="Add audio to the timeline"
            className="flex items-center gap-1 rounded-md border border-border bg-surface-raised/95 px-1.5 py-0.5 text-[0.7rem] font-medium text-text-secondary shadow-sm backdrop-blur hover:text-text-primary"
          >
            <span className="text-[0.85rem] leading-none">＋</span> Audio
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute left-0 top-full z-40 mt-1 max-h-56 w-56 overflow-y-auto rounded-md border border-border bg-surface-raised p-1 shadow-lg">
                {audioAssets.length === 0 ? (
                  <p className="px-2 py-3 text-center text-[0.72rem] text-text-tertiary">
                    No audio assets yet. Upload one, or ask the AI for music.
                  </p>
                ) : (
                  audioAssets.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => addFromAsset(a)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[0.78rem] text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    >
                      <span className="truncate">{a.filename}</span>
                      {a.durationSeconds ? (
                        <span className="ml-auto shrink-0 font-mono text-[0.68rem] text-text-tertiary">
                          {a.durationSeconds.toFixed(1)}s
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
