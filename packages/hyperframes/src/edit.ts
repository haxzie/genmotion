import { parseHTMLContent } from "@hyperframes/core/compiler";
import { writeClipTiming } from "@hyperframes/core";

/** Everything before `<html`, preserved verbatim — the doctype, mainly. */
function preambleOf(html: string): string {
  const match = /^[\s\S]*?(?=<html)/i.exec(html);
  return match ? match[0] : "<!doctype html>\n";
}

function serialize(doc: Document, preamble: string): string {
  return `${preamble}${doc.documentElement.outerHTML}\n`;
}

function uniqueId(doc: Document, base: string): string {
  const taken = new Set(Array.from(doc.querySelectorAll("[id]"), (el) => el.getAttribute("id")));
  let n = 2;
  let candidate = `${base}-${n}`;
  while (taken.has(candidate)) candidate = `${base}-${++n}`;
  return candidate;
}

/**
 * Cut an `<audio id="clipId">` in two at `atSeconds` into its start.
 *
 * Same source, same lane and level as the "cut one source into multiple
 * ranges" pattern every other clip type uses: the second half is a sibling
 * `<audio>` on the same file, picking up `atSeconds` further into it via
 * `data-media-start` — nothing is re-encoded or duplicated on disk.
 *
 * `current` is the clip's already-resolved timing (start/duration/mediaStart
 * in seconds) — the caller's last-compiled `state.timeline.audio` entry.
 * Duration in particular can come from the source media rather than a
 * `data-duration` attribute, so re-deriving it from the DOM here would miss
 * that case; the compiled timeline already got it right.
 */
export function splitAudioClip(
  html: string,
  clipId: string,
  atSeconds: number,
  current: { start: number; duration: number; mediaStart: number },
): { html: string; newId: string } {
  const doc = parseHTMLContent(html);
  const el = doc.getElementById(clipId);
  if (!el || el.tagName.toLowerCase() !== "audio") {
    throw new Error(`No <audio id="${clipId}"> in the composition`);
  }
  if (!(atSeconds > 0) || atSeconds >= current.duration) {
    throw new Error("The cut has to fall inside the clip");
  }

  const newId = uniqueId(doc, clipId);

  const second = el.cloneNode(true) as typeof el;
  second.setAttribute("id", newId);
  writeClipTiming(second, {
    start: current.start + atSeconds,
    duration: current.duration - atSeconds,
  });
  second.setAttribute("data-media-start", String(current.mediaStart + atSeconds));
  el.after(second);

  writeClipTiming(el, { duration: atSeconds });

  return { html: serialize(doc, preambleOf(html)), newId };
}
