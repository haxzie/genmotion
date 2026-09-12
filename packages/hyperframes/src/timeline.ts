import { parseHTMLContent } from "@hyperframes/core/compiler";
import { readClipTiming, readMediaStart } from "@hyperframes/core";
import type {
  ClipKind,
  CompositionTimeline,
  TimelineAudio,
  TimelineClip,
  TimelineScene,
} from "./shared";

/**
 * Read the timeline out of a compiled document.
 *
 * The runtime posts the same shape to a preview over its bridge, but the main
 * process needs it with no page open: `project_overview` answers from it, and
 * the export mixes the `<audio>` it lists. Root time is what everything is
 * expressed in — a clip inside a mounted sub-composition starts at the host's
 * start plus its own, so the list reads like the video plays.
 */
export function readTimeline(html: string): CompositionTimeline {
  const doc = parseHTMLContent(html);
  const root = doc.querySelector("[data-composition-id]");
  const clips: TimelineClip[] = [];
  const scenes: TimelineScene[] = [];
  const audio: TimelineAudio[] = [];

  if (!root) return { durationSeconds: 0, clips, scenes, audio };

  const rootTiming = readClipTiming(root, { defaultStart: 0 });
  let generated = 0;

  const walk = (el: Element, offset: number, depth: number) => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      const isMedia = tag === "video" || tag === "audio";
      const isHost = child.hasAttribute("data-composition-id");
      const timed = child.hasAttribute("data-start") || child.hasAttribute("data-duration");

      // A `<template>` left in the document is inert markup, not a clip.
      if (tag === "template" || tag === "script" || tag === "style") continue;

      if (!timed && !isMedia && !isHost) {
        walk(child, offset, depth);
        continue;
      }

      const timing = readClipTiming(child, { defaultStart: 0 });
      const start = offset + (timing.start ?? 0);
      const id = child.getAttribute("id") || `clip-${++generated}`;
      const src = child.getAttribute("src");
      const compositionFile = child.getAttribute("data-composition-file");
      const kind: ClipKind = isHost
        ? "composition"
        : tag === "video"
          ? "video"
          : tag === "audio"
            ? "audio"
            : tag === "img"
              ? "image"
              : "element";

      clips.push({
        id,
        label: labelFor(child, id, compositionFile, src),
        kind,
        start,
        duration: timing.duration,
        track: timing.trackIndex,
        src,
        compositionFile,
        depth,
      });

      if (isHost && compositionFile) {
        scenes.push({
          id,
          label: labelFor(child, id, compositionFile, null),
          file: compositionFile,
          start,
          duration: timing.duration,
        });
      }

      if (tag === "audio" && src) {
        const volume = Number(child.getAttribute("data-volume"));
        audio.push({
          id,
          src,
          start,
          duration: timing.duration,
          mediaStart: readMediaStart(child),
          volume: Number.isFinite(volume) && volume >= 0 ? volume : 1,
        });
      }

      // A host's children are in the host's own time; a plain timed wrapper's
      // are still in root time, which is exactly the trap `lint` warns about
      // for nested video, so only compositions shift the offset.
      walk(child, isHost ? start : offset, depth + 1);
    }
  };

  walk(root, 0, 0);

  const declared = rootTiming.duration ?? 0;
  const inferred = Math.max(
    0,
    ...clips.map((c) => (c.duration === null ? 0 : c.start + c.duration)),
  );

  return {
    durationSeconds: declared > 0 ? declared : inferred,
    clips,
    scenes,
    audio,
  };
}

/** Something a person would recognise the clip by. */
function labelFor(
  el: Element,
  id: string,
  compositionFile: string | null,
  src: string | null,
): string {
  const explicit = el.getAttribute("data-label") ?? el.getAttribute("aria-label");
  if (explicit) return explicit;
  if (compositionFile) return titleFromFile(compositionFile);
  if (src) return src.split("/").pop() ?? src;
  return id;
}

/** "scenes/02-hero.html" → "Hero". Order prefixes are a sorting device, not a name. */
export function titleFromFile(file: string): string {
  const base = file.split("/").pop() ?? file;
  const stem = base.replace(/\.html?$/, "").replace(/^\d+[-_]/, "");
  return (
    stem
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || stem
  );
}
