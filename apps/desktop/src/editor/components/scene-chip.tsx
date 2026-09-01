"use client";

import { AnimatePresence, motion } from "motion/react";
import type { AssetData, ChatPlugin, ChatPluginId } from "@genmotion/shared";
import { useEditorStore } from "@/stores/editor-store";
import { cx } from "@/components/ui";
import { laneTheme } from "./audio-lane-theme";
import { SceneIcon } from "./scene-icon";
import { AssetIcon } from "./asset-icon";
import { PluginIcon } from "./plugin-icon";

/** Slide-up on add, slide-down on remove; siblings reflow via layout. */
const CHIP_ANIM = {
  layout: true,
  initial: { opacity: 0, y: 8, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.9 },
  transition: {
    duration: 0.18,
    ease: [0.25, 1, 0.5, 1] as [number, number, number, number],
  },
};

const removeButton =
  "flex size-4 items-center justify-center rounded-full transition-colors";

function RemoveX() {
  return (
    <svg viewBox="0 0 12 12" className="size-2.5" stroke="currentColor" strokeWidth="1.5" fill="none">
      <path d="M3 3l6 6M9 3l-6 6" strokeLinecap="round" />
    </svg>
  );
}

/** Context snapshot attached to a sent user message (read-only, for display). */
export interface MessageContextData {
  scenes?: { name: string }[];
  assets?: { filename: string }[];
  /** `track` is the lane, and the colour with it. Absent on older messages. */
  audioClips?: { name: string; track?: number }[];
  elements?: { label: string; sceneName: string; timecode: string }[];
  /** Chat plugins the message was sent with. Absent on older messages. */
  plugins?: { id: ChatPluginId; label: string }[];
}

/**
 * Plugin chips are an instruction, not context, so they take a hue no selection
 * pill uses. One glance separates "about these scenes" from "and generate a
 * voiceover" — which matters most in a sent message, where both appear together.
 */
const PLUGIN_PILL = "border-green/40 bg-green-muted text-green";

const ClipGlyph = () => (
  <svg viewBox="0 0 24 24" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8.5 12.3 17.2a4 4 0 0 1-5.6-5.6l8.1-8.1a2.5 2.5 0 0 1 3.5 3.5l-8.1 8.1a1 1 0 0 1-1.4-1.4l7.4-7.4" />
  </svg>
);
const MusicGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className ?? "size-3 shrink-0"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);
const CursorGlyph = () => (
  <svg viewBox="0 0 24 24" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3l15 9-6 1.5L11 20z" />
  </svg>
);

/** The pills shown inside a user message, snapshotting the attached context. */
export function MessageContextPills({ ctx }: { ctx: MessageContextData }) {
  const scenes = ctx.scenes ?? [];
  const assets = ctx.assets ?? [];
  const audioClips = ctx.audioClips ?? [];
  const elements = ctx.elements ?? [];
  const plugins = ctx.plugins ?? [];
  if (
    !scenes.length &&
    !assets.length &&
    !audioClips.length &&
    !elements.length &&
    !plugins.length
  )
    return null;

  const pill = "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.75rem]";
  return (
    <div className="mb-1.5 flex flex-wrap gap-1">
      {scenes.map((s, i) => (
        <span key={`s${i}`} className={cx(pill, "border-purple/40 bg-purple-muted text-purple")}>
          <SceneIcon className="size-3 shrink-0" />
          <span className="max-w-[140px] truncate">{s.name}</span>
        </span>
      ))}
      {assets.map((a, i) => (
        <span key={`a${i}`} className={cx(pill, "border-accent/40 bg-accent-muted text-accent")}>
          <ClipGlyph />
          <span className="max-w-[140px] truncate">{a.filename}</span>
        </span>
      ))}
      {audioClips.map((a, i) => (
        <span key={`m${i}`} className={cx(pill, laneTheme(a.track).chip)}>
          <MusicGlyph />
          <span className="max-w-[140px] truncate">{a.name}</span>
        </span>
      ))}
      {plugins.map((p, i) => (
        <span key={`p${i}`} className={cx(pill, PLUGIN_PILL)}>
          <PluginIcon id={p.id} className="size-3 shrink-0" />
          <span className="max-w-[140px] truncate">{p.label}</span>
        </span>
      ))}
      {elements.map((e, i) => (
        <span key={`e${i}`} className={cx(pill, "border-[#a855f7]/50 bg-[#a855f7]/15 text-[#cba3f5]")}>
          <CursorGlyph />
          <span className="max-w-[160px] truncate">
            {e.label}
            <span className="text-[#a855f7]/70"> · {e.timecode}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

export function ElementChips() {
  const elements = useEditorStore((s) => s.selectedElements);
  const removeElement = useEditorStore((s) => s.removeElement);

  return (
    <div className="relative flex flex-wrap gap-1.5 px-1 [&:not(:empty)]:pb-2">
      <AnimatePresence mode="popLayout">
        {elements.map((el) => (
          <motion.span
            key={el.id}
            {...CHIP_ANIM}
            className="inline-flex items-center gap-1 rounded-full border border-[#a855f7]/50 bg-[#a855f7]/15 py-0.5 pl-2 pr-1 text-[0.857rem] text-[#cba3f5] backdrop-blur-md"
          >
            <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3l15 9-6 1.5L11 20z" />
            </svg>
            <span className="max-w-[200px] truncate">
              {el.label}
              <span className="text-[#a855f7]/70">
                {" "}
                · {el.sceneName} · {el.timecode}
              </span>
            </span>
            <button
              onClick={() => removeElement(el.id)}
              className={cx(removeButton, "hover:bg-[#a855f7]/30")}
              title="Remove from context"
            >
              <RemoveX />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function SceneChips({
  scenes,
}: {
  scenes: { id: string; name: string }[];
}) {
  const selectedSceneIds = useEditorStore((s) => s.selectedSceneIds);
  const deselectScene = useEditorStore((s) => s.deselectScene);

  const selected = scenes.filter((s) => selectedSceneIds.includes(s.id));

  return (
    <div className="relative flex flex-wrap gap-1.5 px-1 [&:not(:empty)]:pb-2">
      <AnimatePresence mode="popLayout">
        {selected.map((scene) => (
          <motion.span
            key={scene.id}
            {...CHIP_ANIM}
            className="inline-flex items-center gap-1 rounded-full border border-purple/40 bg-purple-muted py-0.5 pl-2 pr-1 text-[0.857rem] text-purple backdrop-blur-md"
          >
            <SceneIcon className="size-3.5 shrink-0" />
            {scene.name}
            <button
              onClick={() => deselectScene(scene.id)}
              className={cx(removeButton, "hover:bg-purple/25")}
              title="Remove from context"
            >
              <RemoveX />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AudioClipChips({
  clips,
}: {
  clips: { id: string; name: string; track: number }[];
}) {
  const selectedAudioClipIds = useEditorStore((s) => s.selectedAudioClipIds);
  const deselectAudioClip = useEditorStore((s) => s.deselectAudioClip);

  const selected = clips.filter((c) => selectedAudioClipIds.includes(c.id));

  return (
    <div className="relative flex flex-wrap gap-1.5 px-1 [&:not(:empty)]:pb-2">
      <AnimatePresence mode="popLayout">
        {selected.map((clip) => (
          <motion.span
            key={clip.id}
            {...CHIP_ANIM}
            className={cx(
              "inline-flex items-center gap-1 rounded-full border py-0.5 pl-2 pr-1 text-[0.857rem] backdrop-blur-md",
              laneTheme(clip.track).chip,
            )}
          >
            <MusicGlyph className="size-3.5 shrink-0" />
            <span className="max-w-[140px] truncate">{clip.name}</span>
            <button
              onClick={() => deselectAudioClip(clip.id)}
              className={cx(removeButton, laneTheme(clip.track).chipHover)}
              title="Remove from context"
            >
              <RemoveX />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AssetChips({
  assets,
}: {
  assets: { id: string; filename: string; kind: AssetData["kind"] }[];
}) {
  const selectedAssetIds = useEditorStore((s) => s.selectedAssetIds);
  const deselectAsset = useEditorStore((s) => s.deselectAsset);

  const selected = assets.filter((a) => selectedAssetIds.includes(a.id));

  return (
    <div className="relative flex flex-wrap gap-1.5 px-1 [&:not(:empty)]:pb-2">
      <AnimatePresence mode="popLayout">
        {selected.map((asset) => (
          <motion.span
            key={asset.id}
            {...CHIP_ANIM}
            className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-muted py-0.5 pl-2 pr-1 text-[0.857rem] text-accent backdrop-blur-md"
          >
            <AssetIcon kind={asset.kind} className="size-3.5 shrink-0" />
            <span className="max-w-[140px] truncate">{asset.filename}</span>
            <button
              onClick={() => deselectAsset(asset.id)}
              className={cx(removeButton, "hover:bg-accent/25")}
              title="Remove from context"
            >
              <RemoveX />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * The plugins attached to the message being written.
 *
 * Unlike every other chip here, these render *inside* the composer's border:
 * a plugin is part of the message, not context selected from another panel.
 * The vocabulary is shared with the rest of this file so the two rows still
 * look like siblings across that boundary.
 */
export function PluginChips({
  plugins,
  onRemove,
}: {
  plugins: ChatPlugin[];
  onRemove: (id: ChatPluginId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 px-1 [&:not(:empty)]:pb-1.5">
      <AnimatePresence mode="popLayout">
        {plugins.map((plugin) => (
          <motion.span
            key={plugin.id}
            {...CHIP_ANIM}
            className={cx(
              "inline-flex items-center gap-1 rounded-full border py-0.5 pl-2 pr-1 text-[0.857rem]",
              PLUGIN_PILL,
            )}
          >
            <PluginIcon id={plugin.id} className="size-3.5 shrink-0" />
            {plugin.label}
            <button
              type="button"
              onClick={() => onRemove(plugin.id)}
              className={cx(removeButton, "hover:bg-green/25")}
              title="Remove"
            >
              <RemoveX />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
