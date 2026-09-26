"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * The shared machinery behind the marketing sections that animate small
 * replicas of the editor: "How it works" and the capabilities bento.
 *
 * A mock is laid out once at a fixed pixel size and scaled into whatever box
 * it is given, so an 8px label keeps its proportion to the chrome around it at
 * every breakpoint instead of the boxes growing while the type stays put. A
 * container query would express the scale without JS, but the factor is a
 * length divided by a length, which calc() will not do.
 *
 * Animation is plain CSS (`app-anim` plus a keyframe name, defined in
 * globals.css). Everything stays paused until its section scrolls into view,
 * so the first loop a visitor sees starts at its beginning rather than
 * halfway through.
 */

/**
 * Pauses a section's mocks until it has been seen, then leaves them running.
 * Spread the returned props onto the element wrapping the mocks.
 */
export function usePlayOnView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Latch on: once the loops have started there is nothing to gain from
    // stopping them again, and someone scrolling back up to re-read a card
    // should not find the panels frozen.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPlay(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, "data-anim-play": play } as const;
}

/**
 * A window onto a mock drawn at `w` x `h`.
 *
 * `fit: "width"` sizes the window from the mock's aspect ratio, which suits a
 * mock that should always be seen whole. `fit: "cover"` fills whatever box the
 * caller gives it, cropping whichever axis is over, which suits the bento:
 * above lg every cell is exactly its mock's size, and the smaller breakpoints
 * lose a little off an edge rather than leaving a gap.
 */
export function Mock({
  w,
  h,
  fit = "width",
  camera,
  className,
  children,
}: {
  w: number;
  h: number;
  fit?: "width" | "cover";
  /** Name of the keyframes that move the camera over this mock, if any. */
  camera?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setScale(
        fit === "width"
          ? rect.width / w
          : Math.max(rect.width / w, rect.height / h),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit, w, h]);

  return (
    <div
      ref={box}
      aria-hidden
      className={`relative overflow-hidden bg-background ${className ?? ""}`}
      style={fit === "width" ? { aspectRatio: `${w} / ${h}` } : undefined}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: w,
          height: h,
          transform: `scale(${scale})`,
          // Nothing to show until the first measurement, which lands before
          // paint; without this the mock flashes at full size on hydration.
          opacity: scale ? 1 : 0,
        }}
      >
        {camera ? (
          // The camera: one transform between the window and the mock, so the
          // shot can move without anything inside the mock knowing.
          <div
            className="app-anim size-full origin-top-left"
            style={{ animationName: camera }}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/** The macOS-style pointer the cursor animations carry. */
export function Cursor({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 12 18"
      className={className}
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))", ...style }}
    >
      <path
        d="M1 1l9.5 7.2H6.1l2.4 5.4-1.9.9-2.5-5.5L1 12.6z"
        fill="#ffffff"
        stroke="#08080a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * A waveform the way the timeline draws one: a filled area anchored to the
 * bottom of the clip, not a row of bars.
 *
 * The shape comes from a fixed sum of sines, so it is identical on the server,
 * in the browser and in any screenshot of either, and `preserveAspectRatio:
 * none` lets one path stretch to whatever width the clip ends up at.
 */
export function Waveform({
  className,
  style,
  /** Number of samples across. More reads as a longer, denser take. */
  samples = 72,
  /** Changes the shape of the run without changing its determinism. */
  seed = 1,
  /** 0 to 1: how much of the clip's height a peak may use. */
  peak = 0.92,
  /** Speech has near-silent gaps; a music bed does not. */
  gaps = true,
}: {
  className?: string;
  style?: React.CSSProperties;
  samples?: number;
  seed?: number;
  peak?: number;
  gaps?: boolean;
}) {
  const points: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * 100;
    const t = i / samples;
    // Speech comes in phrases with near-silent joins between them; a bed is a
    // continuous band that only breathes. Both are sums of sines, so the shape
    // is identical on the server, in the browser, and in any render of either.
    const envelope = gaps
      ? 0.18 + 0.82 * Math.abs(Math.sin(t * 9.4 * seed + seed))
      : 0.84 + 0.16 * Math.sin(t * 17 * seed);
    const ripple = gaps
      ? 0.62 + 0.38 * Math.sin(t * 61 * seed + 1.1)
      : 0.9 + 0.1 * Math.sin(t * 83 + 0.4);
    const y = 40 - Math.min(1, envelope * ripple * peak) * 40;
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className={className}
      style={style}
      aria-hidden
    >
      <polygon points={`0,40 ${points.join(" ")} 100,40`} fill="currentColor" />
    </svg>
  );
}

/** The tones the timeline gives its audio lanes. */
const CLIP_TONES = {
  voice: {
    box: "border-[#8a4a1c] bg-[#1d1108]",
    text: "text-[#d98a45]",
    wave: "text-[#c2702c]",
  },
  music: {
    box: "border-[#1c6b47] bg-[#07150f]",
    text: "text-[#3fbd7e]",
    wave: "text-[#1fa463]",
  },
  sfx: {
    box: "border-[#8d3f6b] bg-[#1b0f18]",
    text: "text-[#e06fb0]",
    wave: "text-[#c04f92]",
  },
} as const;

/**
 * An audio clip as the timeline draws it: a bordered, tinted box with the file
 * name along the top and its waveform filling the bottom.
 */
export function AudioClip({
  name,
  tone,
  className,
  waveClassName,
  waveStyle,
  samples,
  seed,
  gaps,
  children,
}: {
  name?: string;
  tone: keyof typeof CLIP_TONES;
  className?: string;
  /** Height and any animation classes for the waveform itself. */
  waveClassName?: string;
  /** Inline style for the waveform, e.g. the keyframes that draw it in. */
  waveStyle?: React.CSSProperties;
  samples?: number;
  seed?: number;
  gaps?: boolean;
  children?: React.ReactNode;
}) {
  const t = CLIP_TONES[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-[3px] border ${t.box} ${className ?? ""}`}
    >
      {name && (
        <span
          className={`absolute inset-x-1.5 top-[3px] z-10 flex items-center gap-1 text-[8px] leading-none ${t.text}`}
        >
          <svg viewBox="0 0 24 24" className="size-2 shrink-0" fill="currentColor">
            <path d="M9 18V6l10-2v12h-2V6.6l-6 1.2V18z" />
            <circle cx="7" cy="18" r="2.4" />
            <circle cx="17" cy="16" r="2.4" />
          </svg>
          {/* Narrow clips ellipsize rather than running under the clip's edge,
              which is what the lane does with a long file name. */}
          <span className="min-w-0 truncate">{name}</span>
        </span>
      )}
      <Waveform
        className={`absolute inset-x-0 bottom-0 w-full ${t.wave} ${waveClassName ?? "h-[62%]"}`}
        style={waveStyle}
        samples={samples}
        seed={seed}
        gaps={gaps}
      />
      {children}
    </div>
  );
}
