/** Granularity at which text is broken up for staggering. */
export type SplitMode = "char" | "word" | "line" | "none";

export interface TextUnit {
  text: string;
  /** Whitespace renders but never animates or consumes a stagger slot. */
  animate: boolean;
  /** Index of the source line this unit belongs to. */
  line: number;
}

let segmenter: Intl.Segmenter | null | undefined;

/**
 * Grapheme clusters, so an emoji or a ZWJ sequence stays one unit. Spreading a
 * string splits those into their component code points, which renders as
 * garbage mid-animation.
 */
function graphemes(text: string): string[] {
  if (segmenter === undefined) {
    segmenter =
      typeof Intl !== "undefined" && "Segmenter" in Intl
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;
  }
  if (!segmenter) return [...text];
  return [...segmenter.segment(text)].map((s) => s.segment);
}

/** Lines come from an explicit array or from newlines — never from layout. */
export function toLines(text: string | string[]): string[] {
  if (Array.isArray(text)) return text;
  return text.split("\n");
}

/**
 * Breaks text into animatable units. Whitespace is preserved as its own
 * non-animating unit so word spacing survives `display: inline-block`.
 */
export function splitText(text: string | string[], by: SplitMode): TextUnit[] {
  const lines = toLines(text);
  const units: TextUnit[] = [];

  lines.forEach((line, lineIndex) => {
    if (by === "line" || by === "none") {
      units.push({ text: line, animate: line.trim().length > 0, line: lineIndex });
      return;
    }
    const pieces = by === "word" ? line.split(/(\s+)/) : graphemes(line);
    for (const piece of pieces) {
      if (piece === "") continue;
      units.push({
        text: piece,
        animate: !/^\s+$/.test(piece),
        line: lineIndex,
      });
    }
  });

  return units;
}

/** How many units actually take part in the stagger. */
export function animatableCount(units: TextUnit[]): number {
  let n = 0;
  for (const u of units) if (u.animate) n++;
  return n;
}
