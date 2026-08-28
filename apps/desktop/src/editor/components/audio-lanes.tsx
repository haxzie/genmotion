"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePlaybackStore } from "@genmotion/player";
import {
  clipsOverlap,
  resolveAudioPlacement,
  MAX_AUDIO_TRACKS,
  type AudioClipData,
} from "@genmotion/shared";
import { cx, Spinner } from "@/components/ui";
import { useEditorStore } from "@/stores/editor-store";
import { probeAudioDurationFromUrl, uploadProjectAsset } from "@/hooks/use-assets";
import { useWaveform } from "@/hooks/use-waveform";
import { Waveform } from "./waveform";

export interface AudioAssetOption {
  id: string;
  url: string;
  filename: string;
  durationSeconds?: number | null;
}

/** Height of one audio lane row, in px. Tall enough for a header + waveform. */
export const AUDIO_LANE_HEIGHT = 36;
/** Waveform strip inside a clip. Sized so header + strip fill the shorter row. */
const CLIP_WAVEFORM_HEIGHT = 14;

type DragMode = "move" | "resize-l" | "resize-r";

/** Every colour a clip needs, as literal classes — Tailwind can't build them. */
interface LaneTheme {
  /** Border + fill while selected. */
  selected: string;
  /** Border + fill at rest, and on hover. */
  idle: string;
  /** Icon and label. */
  text: string;
  textIdle: string;
  /** Waveform fill. */
  wave: string;
  waveIdle: string;
  /** Alt-drag copy badge and the upload ghost. */
  solid: string;
  /** Mute toggle. */
  button: string;
}

/**
 * One hue per lane.
 *
 * Every lane used to be orange, so four stacked clips read as one undivided
 * block and the only way to tell which lane a clip was on was to trace the row
 * it sat in. Lane 1 keeps the orange the timeline has always used for audio;
 * the rest are far enough apart in hue to separate at a glance and close enough
 * in brightness that none of them shouts.
 */
const LANE_THEMES: LaneTheme[] = [
  {
    selected: "border-orange bg-orange-muted",
    idle: "border-orange/25 bg-orange/[0.06] hover:border-orange/45 hover:bg-orange/12",
    text: "text-orange",
    textIdle: "text-orange/80",
    wave: "text-orange",
    waveIdle: "text-orange/55",
    solid: "bg-orange",
    button: "text-orange/70 hover:text-orange",
  },
  {
    selected: "border-mint bg-mint-muted",
    idle: "border-mint/25 bg-mint/[0.06] hover:border-mint/45 hover:bg-mint/12",
    text: "text-mint",
    textIdle: "text-mint/80",
    wave: "text-mint",
    waveIdle: "text-mint/55",
    solid: "bg-mint",
    button: "text-mint/70 hover:text-mint",
  },
  {
    selected: "border-pink bg-pink-muted",
    idle: "border-pink/25 bg-pink/[0.06] hover:border-pink/45 hover:bg-pink/12",
    text: "text-pink",
    textIdle: "text-pink/80",
    wave: "text-pink",
    waveIdle: "text-pink/55",
    solid: "bg-pink",
    button: "text-pink/70 hover:text-pink",
  },
  {
    selected: "border-sky bg-sky-muted",
    idle: "border-sky/25 bg-sky/[0.06] hover:border-sky/45 hover:bg-sky/12",
    text: "text-sky",
    textIdle: "text-sky/80",
    wave: "text-sky",
    waveIdle: "text-sky/55",
    solid: "bg-sky",
    button: "text-sky/70 hover:text-sky",
  },
];

/** The lane's colours. Wraps, so it survives MAX_AUDIO_TRACKS growing. */
function laneTheme(track: number): LaneTheme {
  return LANE_THEMES[track % LANE_THEMES.length]!;
}

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

/** Filled amplitude waveform along the bottom of a clip, mirroring the scene one. */
function ClipWaveform({
  url,
  widthPx,
  startSec,
  durationSec,
  muted,
  selected,
  theme,
}: {
  url: string;
  widthPx: number;
  /** Seconds into the source where the clip starts (its trim/startFrom). */
  startSec: number;
  /** Clip length in seconds — waveform maps to real time, flat past the audio. */
  durationSec: number;
  muted: boolean;
  selected: boolean;
  /** The lane's colours — the strip is tinted to the clip it sits in. */
  theme: LaneTheme;
}) {
  return (
    <Waveform
      url={url}
      widthPx={widthPx}
      startSec={startSec}
      durationSec={durationSec}
      heightPx={CLIP_WAVEFORM_HEIGHT}
      selected={selected}
      selectedClassName={theme.wave}
      inactiveClassName={theme.waveIdle}
      className={cx(
        "pointer-events-none mt-auto shrink-0",
        muted && "opacity-40",
      )}
    />
  );
}


/**
 * One clip on a lane: header, waveform, trim handles, mute.
 *
 * Its own component so it can hold the decoded source — the trim handles need
 * to know where the audio actually ends, and `useWaveform` is already decoding
 * this URL for the strip below, cached, so asking for it here costs nothing.
 */
function AudioClipBlock({
  clip,
  draft,
  selected,
  copyDrag,
  fps,
  pxPerFrame,
  padding,
  onBeginDrag,
  onUpdate,
}: {
  clip: AudioClipData;
  /** The live drag state for this clip, or null when it isn't being dragged. */
  draft: Draft | null;
  selected: boolean;
  copyDrag: boolean;
  fps: number;
  pxPerFrame: number;
  padding: number;
  onBeginDrag: (
    e: ReactPointerEvent<HTMLElement>,
    clip: AudioClipData,
    mode: DragMode,
    sourceFrames: number | null,
  ) => void;
  onUpdate: (input: { clipId: string; volume?: number }) => void;
}) {
  const { duration: sourceSeconds } = useWaveform(clip.url);
  const sourceFrames = sourceSeconds
    ? Math.max(1, Math.round(sourceSeconds * fps))
    : null;

  const startFrame = draft ? draft.startFrame : clip.startFrame;
  const duration = draft ? draft.durationInFrames : clip.durationInFrames;
  const startFrom = draft ? draft.startFrom : clip.startFrom;
  // The lane being dragged over, so the colour changes with the row under the
  // pointer rather than at the moment of the drop.
  const track = draft ? draft.track : clip.track;
  const theme = laneTheme(track);
  const muted = clip.volume <= 0;
  const left = padding + startFrame * pxPerFrame;
  const width = Math.max(6, duration * pxPerFrame);
  const top = track * AUDIO_LANE_HEIGHT + 2;
  const label = muted
    ? "text-text-tertiary"
    : selected
      ? theme.text
      : theme.textIdle;

  return (
    <div
      className={cx(
        "group absolute flex cursor-grab select-none flex-col overflow-hidden rounded-md border transition-colors duration-150 active:cursor-grabbing",
        selected ? theme.selected : theme.idle,
        draft && "z-20 shadow-lg",
      )}
      style={{ left, width, top, height: AUDIO_LANE_HEIGHT - 4 }}
      onPointerDown={(e) => onBeginDrag(e, clip, "move", sourceFrames)}
      title={clip.name}
    >
      {/* Copy affordance while alt-dragging this clip. */}
      {draft && copyDrag && (
        <span
          className={cx(
            "pointer-events-none absolute right-1 top-1 z-10 flex size-4 items-center justify-center rounded-full text-[0.7rem] font-bold leading-none text-white shadow",
            theme.solid,
          )}
        >
          +
        </span>
      )}
      {/* Header: music icon + name (mirrors the scene card) */}
      <div className="flex min-w-0 items-center gap-1 px-1.5 pt-0.5">
        <MusicIcon className={cx("size-3 shrink-0", label)} />
        <span
          className={cx(
            "truncate text-[0.72rem] font-medium leading-tight",
            label,
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
        theme={theme}
      />

      {/* Left trim handle */}
      <div
        className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize hover:bg-border-strong"
        onPointerDown={(e) => onBeginDrag(e, clip, "resize-l", sourceFrames)}
      />
      {/* Right trim handle */}
      <div
        className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-ew-resize hover:bg-border-strong"
        onPointerDown={(e) => onBeginDrag(e, clip, "resize-r", sourceFrames)}
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
          "absolute right-1 top-1 z-10 flex items-center rounded transition-opacity duration-150",
          theme.button,
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
}

/**
 * Project-level audio lanes below the scene track. Clips are movable (drag the
 * body — horizontally in time, vertically between lanes) and resizable (drag
 * either edge to trim). Scenes are never touched here. Optimistic edits are
 * committed through the passed callbacks; overlaps are rejected client-side so
 * the clip snaps back instead of round-tripping a 409.
 */
export function AudioLanes({
  projectId,
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
  projectId: string;
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
    startFrom?: number;
    volume?: number;
    track: number;
  }) => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  // True while an alt-drag is in progress (drop creates a copy, not a move).
  const [copyDrag, setCopyDrag] = useState(false);
  // A dropped audio FILE being uploaded before it lands as a clip (ghost shown).
  const [pendingDrop, setPendingDrop] = useState<{
    lane: number;
    left: number;
    name: string;
  } | null>(null);
  const [dropLane, setDropLane] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const lanesRef = useRef<HTMLDivElement>(null);

  const selectedIds = useEditorStore((s) => s.selectedAudioClipIds);
  const selectClip = useEditorStore((s) => s.selectAudioClip);
  const clearAllSelection = useEditorStore((s) => s.clearAllSelection);

  const clampFrame = (f: number) => Math.max(0, Math.round(f));

  /**
   * The source's own length in frames, or null when it can't be determined.
   *
   * A clip is supposed to arrive at its full length, so this is worth a round
   * trip when the asset row doesn't carry a duration: without it the server
   * falls back to a fixed default and a three-minute track lands as a stub.
   */
  async function naturalFrames(
    url: string,
    durationSeconds?: number | null,
  ): Promise<number | null> {
    const seconds = durationSeconds ?? (await probeAudioDurationFromUrl(url));
    return seconds ? Math.max(1, Math.round(seconds * fps)) : null;
  }

  /** Lane for a clip at [start, start+dur), matching how the server resolves it. */
  function pickLane(start: number, dur: number): number {
    const placement = resolveAudioPlacement(clips, start, dur);
    // Fall back to lane 0 — the server re-resolves / rejects overlaps.
    return placement ? placement.track : 0;
  }

  async function addFromAsset(asset: AudioAssetOption) {
    setMenuOpen(false);
    const start = Math.max(0, usePlaybackStore.getState().frame);
    const frames = await naturalFrames(asset.url, asset.durationSeconds);
    onAdd({
      url: asset.url,
      assetId: asset.id,
      name: asset.filename.replace(/\.[a-zA-Z0-9]+$/, ""),
      startFrame: start,
      durationInFrames: frames ?? undefined,
      track: pickLane(start, frames ?? fps * 8),
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
    /** The source's length in frames, or null while it's still unknown. */
    sourceFrames: number | null,
  ) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const shiftKey = e.shiftKey;
    const orig = { ...clip };

    // Trimming can only ever give back audio the clip already has. The left
    // edge stops where `startFrom` would go negative, and the right edge where
    // the source runs out — past either there is nothing to play, and the clip
    // would stretch into silence it draws as a flat line. Unknown source length
    // (still decoding, or a failed probe) means no ceiling rather than a
    // guessed one.
    const trimmedFrames = Math.round(orig.startFrom * fps);
    const minStart = Math.max(0, orig.startFrame - trimmedFrames);
    const maxFrames =
      sourceFrames != null
        ? Math.max(1, sourceFrames - trimmedFrames)
        : Number.POSITIVE_INFINITY;
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
      // Alt while moving = duplicate on drop (leave the original in place).
      setCopyDrag(ev.altKey && mode === "move");
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
          Math.max(minStart, clampFrame(orig.startFrame + dxFrames)),
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
          durationInFrames: Math.min(
            maxFrames,
            Math.max(1, orig.durationInFrames + dxFrames),
          ),
          startFrom: orig.startFrom,
          track: orig.track,
        };
      }
      setDraft(next);
    };

    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setCopyDrag(false);
      if (!moved) {
        // A plain click (no drag) selects the clip as chat context.
        selectClip(clip.id, shiftKey);
        return;
      }
      // Alt+drag on the body → drop a duplicate at the new spot, original stays.
      const copy = ev.altKey && mode === "move";
      setDraft((d) => {
        if (d) {
          // A copy is a brand-new clip, so it must clear ALL clips on the lane
          // (including the original); a move ignores the clip being dragged.
          const overlaps = clips.some(
            (c) =>
              (copy || c.id !== d.id) &&
              c.track === d.track &&
              clipsOverlap(c, {
                track: d.track,
                startFrame: d.startFrame,
                durationInFrames: d.durationInFrames,
              }),
          );
          if (overlaps) return null;
          if (copy) {
            onAdd({
              url: orig.url,
              name: orig.name,
              startFrame: d.startFrame,
              durationInFrames: d.durationInFrames,
              startFrom: Number(d.startFrom.toFixed(3)),
              volume: orig.volume,
              track: d.track,
            });
            return null;
          }
          const changed =
            d.startFrame !== orig.startFrame ||
            d.durationInFrames !== orig.durationInFrames ||
            d.startFrom !== orig.startFrom ||
            d.track !== orig.track;
          if (changed) {
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
    const el = lanesRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const startFrame = clampFrame((e.clientX - rect.left - padding) / pxPerFrame);

    // 1) An in-app audio asset dragged from the assets panel / picker.
    const raw = e.dataTransfer.getData("application/x-gm-audio");
    if (raw) {
      let payload: { url: string; assetId?: string; name?: string; durationSeconds?: number };
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      void naturalFrames(payload.url, payload.durationSeconds).then((frames) =>
        onAdd({
          url: payload.url,
          assetId: payload.assetId,
          name: payload.name,
          startFrame,
          durationInFrames: frames ?? undefined,
          track: lane,
        }),
      );
      return;
    }

    // 2) An OS audio FILE dropped straight onto the timeline → upload, then place
    //    it at the dropped position (a ghost clip shows while it uploads).
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.type.startsWith("audio/"),
    );
    if (!file) return;
    const name = file.name.replace(/\.[a-zA-Z0-9]+$/, "");
    setPendingDrop({ lane, left: padding + startFrame * pxPerFrame, name });
    uploadProjectAsset(projectId, file)
      .then(async (asset) => {
        queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
        onAdd({
          url: asset.url,
          assetId: asset.id,
          name,
          startFrame,
          durationInFrames:
            (await naturalFrames(asset.url, asset.durationSeconds)) ?? undefined,
          track: lane,
        });
      })
      .finally(() => setPendingDrop(null));
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
            const types = e.dataTransfer.types;
            // Accept an in-app audio asset OR any file drop (filtered to audio
            // on drop — the file's type isn't readable during dragover).
            if (
              types.includes("application/x-gm-audio") ||
              types.includes("Files")
            ) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
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

      {clips.map((clip) => (
        <AudioClipBlock
          key={clip.id}
          clip={clip}
          draft={draft && draft.id === clip.id ? draft : null}
          selected={selectedIds.includes(clip.id)}
          copyDrag={copyDrag}
          fps={fps}
          pxPerFrame={pxPerFrame}
          padding={padding}
          onBeginDrag={beginDrag}
          onUpdate={onUpdate}
        />
      ))}

      {/* Ghost clip while a dropped audio file uploads, at the drop position. */}
      {pendingDrop && (
        <div
          className={cx(
            "pointer-events-none absolute z-30 flex items-center gap-1.5 overflow-hidden rounded-md border px-2 text-[0.72rem]",
            laneTheme(pendingDrop.lane).selected,
            laneTheme(pendingDrop.lane).text,
          )}
          style={{
            left: pendingDrop.left,
            top: pendingDrop.lane * AUDIO_LANE_HEIGHT + 2,
            height: AUDIO_LANE_HEIGHT - 4,
            width: Math.max(90, 4 * fps * pxPerFrame),
          }}
        >
          <Spinner className="size-3 shrink-0" />
          <span className="truncate">Uploading {pendingDrop.name}…</span>
        </div>
      )}

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
                      onClick={() => void addFromAsset(a)}
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
