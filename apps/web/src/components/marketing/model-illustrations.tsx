import type { ModelCategory } from "@/lib/marketing/integrations";

/**
 * One illustration per "bring your own generative models" card.
 *
 * Drawn here as SVG rather than shipped as images: each is a handful of
 * shapes in the card's own tint, and drawing them keeps the tint a single
 * prop. All four share a 320×120 stage and the same vocabulary — thin strokes,
 * translucent fills, one bright accent — so the row reads as a set, and each
 * one shows the thing it stands for: a picture, a voice, a hit, a clip.
 */

type Props = { color: string; className?: string };

const stage = {
  viewBox: "0 0 320 120",
  // Fill the box, cropping the stage's edges if the box is wider — never
  // letterbox: the card wants the drawing flush with its top and sides.
  preserveAspectRatio: "xMidYMid slice",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/**
 * The tint behind the drawing: a wash over the whole stage that fades to
 * nothing at the bottom, and a brighter pool behind the subject. Both end at
 * the card's own background, so the header needs no border to finish it.
 */
function Glow({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id} cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Oversized so the wash still reaches the edges once the stage is cropped. */}
      <rect x="-200" y="0" width="720" height="120" fill={`url(#${id}-wash)`} stroke="none" />
      <rect x="0" y="0" width="320" height="120" fill={`url(#${id})`} stroke="none" />
    </>
  );
}

/** Two photos fanned behind a third, the front one still being drawn in. */
function ImageIllustration({ color, className }: Props) {
  return (
    <svg {...stage} className={className} style={{ color }}>
      <Glow id="ill-image" />
      {/* Back cards, tilted. */}
      <g opacity="0.35" transform="rotate(-8 160 64)">
        <rect x="112" y="24" width="96" height="72" rx="6" fill="currentColor" fillOpacity="0.08" />
      </g>
      <g opacity="0.55" transform="rotate(5 160 64)">
        <rect x="112" y="24" width="96" height="72" rx="6" fill="currentColor" fillOpacity="0.08" />
      </g>
      {/* Front card. */}
      <rect x="112" y="24" width="96" height="72" rx="6" fill="currentColor" fillOpacity="0.12" />
      <circle cx="138" cy="46" r="7" fill="currentColor" fillOpacity="0.5" />
      <path d="M118 88l24-26 16 17 12-12 22 21" fill="currentColor" fillOpacity="0.28" />
      {/* Generation cursor: the lower-right of the picture is still arriving. */}
      <path d="M170 96V72h38" strokeDasharray="3 4" opacity="0.7" />
      {/* Sparkles. */}
      <path d="M226 30l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z" fill="currentColor" stroke="none" />
      <path d="M238 52l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z" fill="currentColor" fillOpacity="0.6" stroke="none" />
      <path d="M92 40l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z" fill="currentColor" fillOpacity="0.45" stroke="none" />
    </svg>
  );
}

/** A microphone and the waveform it's picking up, with a note riding the tail. */
function AudioIllustration({ color, className }: Props) {
  // Bar heights in a shape that reads as speech: a swell, a pause, a swell.
  const bars = [10, 22, 38, 54, 44, 28, 16, 8, 14, 30, 48, 62, 50, 34, 20, 12, 26, 40, 30, 18, 10];
  return (
    <svg {...stage} className={className} style={{ color }}>
      <Glow id="ill-audio" />
      {/* Mic. */}
      <rect x="60" y="30" width="20" height="36" rx="10" fill="currentColor" fillOpacity="0.2" />
      <path d="M52 56a18 18 0 0 0 36 0M70 74v12M60 86h20" />
      {/* Waveform. */}
      {bars.map((h, i) => (
        <rect
          key={i}
          x={112 + i * 7}
          y={60 - h / 2}
          width="3.5"
          height={h}
          rx="1.75"
          fill="currentColor"
          fillOpacity={i === 11 ? 1 : 0.35 + (h / 62) * 0.45}
          stroke="none"
        />
      ))}
      {/* Note. */}
      <path d="M262 36v28" />
      <circle cx="256" cy="66" r="6" fill="currentColor" fillOpacity="0.6" />
      <path d="M262 36c6 2 10 6 10 12" />
    </svg>
  );
}

/** A speaker throwing rings, and the burst of a hit landing. */
function SfxIllustration({ color, className }: Props) {
  return (
    <svg {...stage} className={className} style={{ color }}>
      <Glow id="ill-sfx" />
      {/* Speaker. */}
      <path d="M80 48h-14a4 4 0 0 0-4 4v16a4 4 0 0 0 4 4h14l22 16V32z" fill="currentColor" fillOpacity="0.2" />
      {/* Rings, fading out. */}
      <path d="M116 48a18 18 0 0 1 0 24" opacity="0.9" />
      <path d="M126 40a30 30 0 0 1 0 40" opacity="0.6" />
      <path d="M136 32a42 42 0 0 1 0 56" opacity="0.35" />
      {/* Impact burst. */}
      <g transform="translate(226 60)">
        <path d="M0-30l6-14M0 30l-6 14M-30 0l-14-6M30 0l14 6M-21-21l-10-10M21 21l10 10M-21 21l-10 10M21-21l10-10" opacity="0.7" />
        <path d="M0-16l4 11 12 1-9 7 3 12-10-7-10 7 3-12-9-7 12-1z" fill="currentColor" fillOpacity="0.85" stroke="none" />
      </g>
      {/* Stray particles. */}
      <circle cx="184" cy="30" r="2" fill="currentColor" stroke="none" opacity="0.6" />
      <circle cx="270" cy="94" r="2.5" fill="currentColor" stroke="none" opacity="0.5" />
      <circle cx="196" cy="98" r="1.5" fill="currentColor" stroke="none" opacity="0.5" />
    </svg>
  );
}

/** A strip of frames with one lit and playing. */
function VideoIllustration({ color, className }: Props) {
  const frames = [40, 108, 176, 244];
  return (
    <svg {...stage} className={className} style={{ color }}>
      <Glow id="ill-video" />
      {/* Filmstrip band with sprocket holes. */}
      <rect x="28" y="28" width="264" height="64" rx="4" fill="currentColor" fillOpacity="0.08" />
      {Array.from({ length: 22 }, (_, i) => (
        <g key={i}>
          <rect x={34 + i * 12} y="31" width="6" height="4" rx="1" fill="currentColor" fillOpacity="0.5" stroke="none" />
          <rect x={34 + i * 12} y="85" width="6" height="4" rx="1" fill="currentColor" fillOpacity="0.5" stroke="none" />
        </g>
      ))}
      {/* Frames; the second is the one playing. */}
      {frames.map((x, i) => (
        <rect
          key={x}
          x={x}
          y="40"
          width="56"
          height="40"
          rx="3"
          fill="currentColor"
          fillOpacity={i === 1 ? 0.35 : 0.14}
          stroke={i === 1 ? "currentColor" : "none"}
        />
      ))}
      <path d="M130 51v18l15-9z" fill="currentColor" stroke="none" />
      {/* Progress under the strip. */}
      <path d="M40 104h240" opacity="0.3" />
      <path d="M40 104h96" strokeWidth="2.5" />
      <circle cx="136" cy="104" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

const BY_CATEGORY: Record<ModelCategory["id"], (props: Props) => React.ReactElement> = {
  image: ImageIllustration,
  audio: AudioIllustration,
  sfx: SfxIllustration,
  video: VideoIllustration,
};

export function ModelIllustration({ id, ...props }: Props & { id: ModelCategory["id"] }) {
  const Cmp = BY_CATEGORY[id];
  return <Cmp {...props} />;
}
