import { gsap, useGsapTimeline } from "@genmotion/motion";
import { compactParts, fitSize, groupPositions } from "./shared";

/**
 * A number that spins into place, one wheel per digit.
 *
 * Declarative: it takes the *final* value and choreographs the arrival, rather
 * than being fed an interpolated value every frame. Each digit is a static
 * strip of glyphs ending on its target, and GSAP slides the strip — so the
 * easing is a real curve rather than a hand-rolled `interpolate`, and the
 * digits can be staggered so the number assembles left to right instead of
 * every column thrashing at once.
 *
 * It stays frame-exact because `useGsapTimeline` pauses the timeline and seeks
 * it to `frame / fps`, in the preview and in the export alike.
 */

/** Full revolutions a wheel makes before landing on its digit. */
const SPINS = 1;

/**
 * Height of one digit cell, as a multiple of the font size.
 *
 * Deliberately taller than the glyph: a digit's cap height is roughly 0.72em,
 * so at 1.45 the glyph occupies the middle ~50% of the cell and there is clear
 * space above and below for the fade to live in without touching it.
 */
const CELL = 1.45;

/**
 * Softens the slot's top and bottom so glyphs in transit fade rather than cut.
 * The opaque band (16%–84%) fully contains the glyph, so a settled digit is
 * untouched and only the parts of a moving digit near the edges fade out.
 */
const EDGE_FADE =
  "linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)";

/**
 * Glyph advances in em, measured in the browser against the app's Geist faces
 * with `font-variant-numeric: tabular-nums` and the -0.045em tracking below.
 *
 * They can be constants because none of them depend on which glyph is shown:
 * tabular figures all share the "0" advance (a digit slot is `width: 1ch`), and
 * the separators are the only other repeated characters. The sum reproduced a
 * measured 8-digit number's width exactly, so the fit is real rather than
 * approximate. `M` is the widest suffix at 0.763; 0.78 leaves a little margin.
 */
const DIGIT_EM = 0.608;
const SEPARATOR_EM = 0.164;
const SUFFIX_EM = 0.78;

/**
 * How a value breaks down into rendered glyphs. Shared by the component and by
 * `rollingNumberEm`, so the width a template fits to and the width the number
 * actually occupies are derived from one place and cannot drift apart.
 */
function glyphParts(value: number, compact: boolean) {
  const { divisor, decimals, suffix } = compact
    ? compactParts(value)
    : { divisor: 1, decimals: 0, suffix: "" };

  const shown = Math.abs(value) / divisor;
  const integerDigits = Math.max(1, Math.floor(shown).toString().length);

  // Digits come from one rounded integer rather than from `value / 10^e` per
  // place: 20.1 / 0.1 is 200.999… in binary floating point, which floors to the
  // wrong digit. Scaling once and reading the string can't drift.
  const digits = Math.round(shown * Math.pow(10, decimals))
    .toString()
    .padStart(integerDigits + decimals, "0")
    .split("")
    .map(Number);

  const separators = compact ? new Set<number>() : groupPositions(integerDigits);
  // Both the thousands commas and the decimal point are `Static` glyphs.
  const separatorCount = separators.size + (decimals > 0 ? 1 : 0);

  return { digits, decimals, integerDigits, separators, separatorCount, suffix };
}

/** Width of the rendered number in em — what `fitSize` needs to size it. */
export function rollingNumberEm(value: number, compact = false): number {
  const { digits, separatorCount, suffix } = glyphParts(value, compact);
  return (
    digits.length * DIGIT_EM +
    separatorCount * SEPARATOR_EM +
    (suffix ? SUFFIX_EM : 0)
  );
}

export interface RollingNumberProps {
  /** The final value. The component owns the animation to it. */
  value: number;
  /** Font size in px; also the height of one digit cell. */
  size: number;
  /**
   * Width the number must fit into. When the number would be wider, `size` is
   * scaled down until it fits — which is what stops long values being clipped
   * by the frame at 1:1 and 9:16.
   */
  maxWidth?: number;
  /** Render as 20.1M rather than 20,143,882. */
  compact?: boolean;
  /** Seconds before the spin starts. */
  delay?: number;
  /** Seconds for one wheel to land; the stagger adds to the total. */
  duration?: number;
  /**
   * Full revolutions before landing. Raise it for long animations — one
   * revolution stretched over several seconds barely appears to move.
   */
  spins?: number;
  /** GSAP ease for the spin. */
  ease?: string;
  color?: string;
}

export function RollingNumber({
  value,
  size,
  maxWidth,
  compact = false,
  delay = 0.25,
  duration = 1.25,
  spins = SPINS,
  ease = "power4.out",
  color = "#ffffff",
}: RollingNumberProps) {
  const { digits, decimals, integerDigits, separators, suffix } = glyphParts(value, compact);

  // Shrink to fit before anything else: `cell` and the GSAP travel distances
  // are both derived from the final size, so they stay in step.
  const fitted = fitSize(size, maxWidth ?? 0, rollingNumberEm(value, compact));
  const cell = fitted * CELL;

  const ref = useGsapTimeline<HTMLSpanElement>((container) => {
    const tl = gsap.timeline();
    const strips = container.querySelectorAll<HTMLElement>("[data-strip]");
    tl.to(strips, {
      // Every wheel starts at 0 and travels its own distance, so they all begin
      // on the same neutral digit and land at different moments — a fixed
      // distance would make each strip start on the very digit it ends on.
      y: (_i, el: HTMLElement) => -Number(el.dataset.travel) * cell,
      duration,
      ease,
      // DOM order is left to right, so the leading digits settle first and the
      // number reads as it assembles.
      stagger: 0.06,
    }, delay);
    return tl;
  });

  return (
    <span
      ref={ref}
      style={{
        display: "inline-flex",
        alignItems: "flex-start",
        fontSize: fitted,
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.045em",
        color,
      }}
    >
      {digits.map((digit, i) => {
        // Display position -> integer place, so the separator lands correctly.
        const place = integerDigits + decimals - 1 - i;
        return (
          <span key={i} style={{ display: "inline-flex" }}>
            {separators.has(place) && <Static char="," cell={cell} />}
            {decimals > 0 && place === decimals - 1 && <Static char="." cell={cell} />}
            <DigitStrip digit={digit} cell={cell} spins={spins} />
          </span>
        );
      })}
      {suffix && <Static char={suffix} cell={cell} />}
    </span>
  );
}

function Static({ char, cell }: { char: string; cell: number }) {
  return (
    <span style={{ display: "inline-block", height: cell, lineHeight: `${cell}px` }}>
      {char}
    </span>
  );
}

function DigitStrip({ digit, cell, spins }: { digit: number; cell: number; spins: number }) {
  // 0,1,2,… up to the target digit: the strip starts on 0 and its last cell is
  // the answer, so `travel` (in cells) differs per digit and each wheel lands
  // at its own moment.
  const travel = spins * 10 + digit;
  const glyphs = Array.from({ length: travel + 1 }, (_, i) => i % 10);

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        // `ch` is the advance of "0" — with tabular figures, exactly one digit.
        width: "1ch",
        height: cell,
        overflow: "hidden",
        // Fade the top and bottom of the window: a glyph part-way in or out is
        // a fragment of a digit, and fading it reads as a wheel turning rather
        // than as clipped text. This is the trick every polished odometer uses.
        maskImage: EDGE_FADE,
        WebkitMaskImage: EDGE_FADE,
      }}
    >
      <span
        data-strip
        data-travel={travel}
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
      >
        {glyphs.map((g, i) => (
          <span
            key={i}
            style={{
              display: "block",
              height: cell,
              lineHeight: `${cell}px`,
              textAlign: "center",
            }}
          >
            {g}
          </span>
        ))}
      </span>
    </span>
  );
}
