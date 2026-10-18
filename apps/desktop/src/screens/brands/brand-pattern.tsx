import { useMemo } from "react";
import { SimplexNoise } from "@paper-design/shaders-react";
import { cx } from "@/components/ui";

/**
 * A brand's palette, alive.
 *
 * Paper's simplex noise on its Bubblegum settings, fed the colours just read
 * off the company's website. It earns its place: the moment somebody pastes a URL,
 * the thing they get back is not a list of hex values but their brand moving,
 * which is both the fastest way to see whether the palette is right and a fair
 * promise of what the product does with it.
 *
 * `@paper-design/shaders-react` is already a dependency — the Create screen's
 * hero runs `GrainGradient` from it — so this is a component, not a WebGL
 * engine.
 */

/** The shader takes ten. A brand with more has its least useful ones dropped. */
const MAX_COLORS = 10;

/**
 * What it looks like before there is a palette: GenMotion's own.
 *
 * The URL step has no brand colours yet, and a blank panel there makes the
 * modal look broken. So it runs on ours — the logo's teal and lime, the accent
 * blue, and the app's own near-black and near-white as the dark and light
 * anchors. It is the same pattern the brand will get, which makes the swap the
 * moment the site is read feel like the brand arriving rather than a different
 * component loading.
 */
const GENMOTION = ["#08080a", "#16f5bd", "#3b6ef6", "#c6f91e", "#ededef"];

/** Rec. 601 luma, which is close enough for ordering by how light a colour reads. */
function luma(hex: string): number {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(n)) return 0;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/** How close two colours may be before the second one is not worth drawing. */
const TOO_CLOSE = 0.12;

/** Normalised RGB distance. Crude, and the job here only needs "these read as the same". */
function apart(a: string, b: string): number {
  const ch = (hex: string) => {
    const v = hex.replace("#", "");
    const full = v.length === 3 ? v.split("").map((c) => c + c).join("") : v;
    const n = Number.parseInt(full.slice(0, 6), 16);
    return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [0, 0, 0];
  };
  const [ar, ag, ab] = ch(a);
  const [br, bg, bb] = ch(b);
  return Math.hypot((ar ?? 0) - (br ?? 0), (ag ?? 0) - (bg ?? 0), (ab ?? 0) - (bb ?? 0)) / 441;
}

/**
 * Drop the colours that are already on screen.
 *
 * A site's palette is full of near-duplicates: Stripe reports `#ffffff`,
 * `#e8e9ff` and `#e5edf5`, which are one pale lavender as far as a shader is
 * concerned. Feeding all three spends three of the pattern's few regions on
 * the same wash and squeezes the actual blurple into a corner, which is how
 * Bubblegum's soft blend turned Stripe's panel almost white.
 *
 * First seen wins, and the caller passes them in role order, so the colour
 * that survives is the one the brand gave a job to rather than whichever
 * happened to sort first. The list the user ticks is untouched: this is only
 * about what the pattern can usefully show.
 */
function distinct(colors: string[]): string[] {
  const kept: string[] = [];
  for (const c of colors) {
    if (kept.every((k) => apart(k, c) > TOO_CLOSE)) kept.push(c);
  }
  return kept;
}

/**
 * Order the palette light to dark.
 *
 * Neighbouring colours blend into each other, so the ordering decides what the
 * blends are made of. Alternating dark and light for contrast was the first
 * instinct and it was wrong: on Stripe's palette it put black next to white
 * and filled half the panel with the greys in between. Sorted by brightness,
 * every blend stays inside the brand — Stripe runs black through navy,
 * blurple and periwinkle to white, and each step belongs.
 *
 * It matters less now the look is Bubblegum's soft one than it did with hard
 * bands, but a smooth ramp through grey is still grey.
 */
function byBrightness(colors: string[]): string[] {
  return [...colors].sort((a, b) => luma(a) - luma(b));
}

export function BrandPattern({
  colors,
  className,
}: {
  /** Hex values, in any order. Fewer than two falls back to the resting state. */
  colors: string[];
  className?: string;
}) {
  const palette = useMemo(() => {
    const unique = [...new Set(colors.map((c) => c.trim().toLowerCase()).filter(Boolean))];
    // One colour is a flat fill, not a pattern, and the shader needs two to
    // have anything to band between.
    if (unique.length < 2) return GENMOTION;
    // A brand whose colours are all within a shade of each other keeps them
    // all: a flat panel is still honest, and GenMotion's green would not be.
    const spread = distinct(unique);
    return byBrightness(spread.length >= 2 ? spread : unique).slice(0, MAX_COLORS);
  }, [colors]);

  const resting = palette === GENMOTION;

  return (
    // No `position` in the base string. `cx` is a plain join, so a `relative`
    // here beat the `absolute inset-0` the caller passed and left the canvas
    // with no height at all. Positioning is the caller's; this only fills it.
    <div className={cx("overflow-hidden bg-background", className)} aria-hidden>
      <SimplexNoise
        className="absolute inset-0 h-full w-full"
        colors={palette}
        // Paper's Bubblegum preset, on the brand's colours rather than its
        // own: one step per colour and full softness, so the palette melts
        // through itself instead of banding. Big and loose at 1.6.
        stepsPerColor={1}
        softness={1}
        scale={1.6}
        // The preset runs at 2, which is right for a page you came to look at.
        // Behind a form it is a lot, so the resting state idles well under it
        // while there is nothing to show yet.
        speed={resting ? 0.6 : 2}
        // `none`, as every one of the library's own presets uses. `cover`
        // sizes against `worldWidth`/`worldHeight`, which default to 0, and
        // the result is a canvas that has a GL context and draws nothing.
        fit="none"
      />
    </div>
  );
}
