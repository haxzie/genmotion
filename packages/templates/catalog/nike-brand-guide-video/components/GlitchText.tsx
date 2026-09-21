import {
  Easing,
  interpolate,
  random,
  useCurrentFrame,
} from "@genmotion/motion";

// A flash glitch: presence stutters on and off like an unstable signal, the
// flashes getting denser until it holds solid, and breaking up again on exit.
// No slice tearing, no chromatic split — just presence flicker.
//
// Deterministic: every value comes from the frame and `random(seed)`.

/** Frames each on/off state is held for. 1 reads as noise, 2 reads as flashing. */
const STUTTER = 2;

export type FlashOpts = {
  from?: number;
  duration?: number;
  exitAt?: number;
  exitDuration?: number;
  /** Overall violence: how sparse the flashes are at peak instability. */
  amount?: number;
  seed?: string;
};

/** Opacity for a flash-glitch entrance and/or exit. */
export function useGlitchFlash({
  from = 0,
  duration = 18,
  exitAt,
  exitDuration = 9,
  amount = 1,
  seed = "g",
}: FlashOpts): number {
  const frame = useCurrentFrame();

  // Linear on purpose: an eased ramp stabilises the signal almost immediately
  // and the flashing collapses into the first few frames.
  // duration 0 means "already on" — for elements that only flash on the way out.
  const enter =
    duration <= 0
      ? 1
      : interpolate(frame, [from, from + duration], [0, 1], {
          easing: Easing.linear,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const exit =
    exitAt == null
      ? 0
      : interpolate(frame, [exitAt, exitAt + exitDuration], [0, 1], {
          easing: Easing.linear,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  // 1 = maximally unstable, 0 = locked solid. Peaks at both ends of the beat.
  const noise = Math.max(1 - enter, exit) * amount;
  const step = Math.floor(frame / STUTTER);

  if (duration > 0 && frame < from) return 0;
  // Gone for good, rather than flickering forever on the clamped exit tail.
  if (exitAt != null && frame >= exitAt + exitDuration) return 0;
  if (noise <= 0.001) return 1;

  // Odds of being lit this step climb as the signal stabilises.
  const lit = random(`${seed}f${step}`) < 1 - noise * 0.8;
  const weak = random(`${seed}w${step}`) < 0.22;
  return lit ? (weak ? 0.4 : 1) : 0;
}

/** Wraps anything — type, a logo, a group — in the flash. */
export function GlitchFlash({
  children,
  style,
  id,
  ...opts
}: FlashOpts & {
  children: React.ReactNode;
  style?: React.CSSProperties;
  id?: string;
}) {
  const opacity = useGlitchFlash(opts);
  return (
    <div id={id} style={{ ...style, opacity }}>
      {children}
    </div>
  );
}

export function GlitchText({
  text,
  color = "#101010",
  id,
  ...opts
}: FlashOpts & { text: string; color?: string; id?: string }) {
  const opacity = useGlitchFlash(opts);
  return (
    <span
      id={id}
      style={{ color, opacity, whiteSpace: "pre", display: "inline-block" }}
    >
      {text}
    </span>
  );
}
