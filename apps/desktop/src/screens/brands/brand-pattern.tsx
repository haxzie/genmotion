import { useMemo } from "react";
import { SimplexNoise } from "@paper-design/shaders-react";
import { cx } from "@/components/ui";

/**
 * A brand's palette, alive.
 *
 * The same banded simplex noise Paper publishes, fed the colours just read off
 * the company's website. It earns its place: the moment somebody pastes a URL,
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

/**
 * Order the palette light to dark.
 *
 * The shader puts `stepsPerColor` blended bands between each neighbouring
 * pair, so the ordering decides what those blends are made of. Alternating
 * dark and light for contrast was the first instinct and it was wrong: on
 * Stripe's palette it put black next to white and filled half the panel with
 * the greys in between. Sorted by brightness, every blend stays inside the
 * brand — Stripe runs black through navy, blurple and periwinkle to white,
 * and each step belongs.
 *
 * Paper's own default looks like it alternates, but its colours are a warm
 * hue progression where the blends happen to land on salmon and orange. A
 * brand palette is usually tonal rather than hue-varied, so brightness is the
 * ordering that generalises.
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
    return byBrightness(unique).slice(0, MAX_COLORS);
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
        // Two bands per colour, so each pair of neighbours gets a blend
        // between them: the salmons and oranges in Paper's own default are
        // these, not palette entries.
        stepsPerColor={2}
        // Hard edges. The whole look is the banding; softening it turns the
        // pattern back into the gradient every other product already has.
        softness={0}
        // Slow enough to read as ambient rather than as something demanding to
        // be watched, and slower still while there is nothing to show.
        speed={resting ? 0.12 : 0.35}
        scale={0.75}
        // `none`, as every one of the library's own presets uses. `cover`
        // sizes against `worldWidth`/`worldHeight`, which default to 0, and
        // the result is a canvas that has a GL context and draws nothing.
        fit="none"
      />
    </div>
  );
}
