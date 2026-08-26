/**
 * Ambient motion that keeps text alive between its entrance and its exit.
 *
 * A held headline that is perfectly still reads as a frozen frame — the design
 * standards call for something always resolving. These are deliberately tiny:
 * a few pixels, a percent of scale. If you can clearly see it, it's too much.
 */
export type HoldBehaviour = "none" | "float" | "breathe" | "wave" | "shimmer" | "glow";

export interface HoldResult {
  transforms: string[];
  blur?: number;
  opacityFactor?: number;
  textShadow?: string;
}

const EMPTY: HoldResult = { transforms: [] };

export interface HoldOptions {
  frame: number;
  fps: number;
  /** Animatable index, so units can be phase-offset against each other. */
  index: number;
  /** 0..1 — ramped down during enter and exit so hold never fights them. */
  amplitude: number;
}

const round = (n: number) => Math.round(n * 10000) / 10000;
const wave = (t: number, hz: number, phase: number) =>
  Math.sin(2 * Math.PI * hz * t + phase);

export function holdStyle(
  behaviour: HoldBehaviour,
  { frame, fps, index, amplitude }: HoldOptions,
): HoldResult {
  if (behaviour === "none" || amplitude <= 0) return EMPTY;
  const t = frame / Math.max(1, fps);
  const a = Math.min(1, Math.max(0, amplitude));

  switch (behaviour) {
    case "float":
      return { transforms: [`translateY(${round(wave(t, 0.25, 0) * 4 * a)}px)`] };
    case "breathe":
      return { transforms: [`scale(${round(1 + wave(t, 0.2, 0) * 0.012 * a)})`] };
    case "wave":
      return {
        transforms: [
          `translateY(${round(wave(t, 0.5, -index * 0.6) * 6 * a)}px)`,
        ],
      };
    case "shimmer":
      return {
        transforms: [],
        opacityFactor: round(1 - (0.5 + 0.5 * wave(t, 0.6, -index * 0.4)) * 0.14 * a),
      };
    case "glow":
      return {
        transforms: [],
        // currentColor so the glow always matches the text it belongs to.
        textShadow: `0 0 ${round((6 + 6 * wave(t, 0.3, 0)) * a)}px currentColor`,
      };
    default:
      return EMPTY;
  }
}
