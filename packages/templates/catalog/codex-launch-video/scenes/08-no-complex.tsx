import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { CodexBlob } from "../components/CodexBlob";
import { C, FONT, clamp } from "../components/brand";
import { mix } from "../components/BlurWord";
import { glide } from "../components/glide";

// 12.00–16.83s — the Codex blob "writes" the lines, then swells into the logo.
//
// Anti-jitter: the line is NOT re-centred by flexbox on every added/removed
// letter (that made the whole row hop sideways each frame). Instead its left
// edge is computed from a *continuous* width estimate, so the row glides while
// the blob steps along the text like a pen.

const FS = 115;
const GAP = 16;

type Ch = { ch: string; a: number; d: number };

/** Characters typed over [from, to]; removed right-to-left over [out0, out1]. */
function seg(text: string, from: number, to: number, out0: number, out1: number): Ch[] {
  const n = text.length;
  return text.split("").map((ch, i) => ({
    ch,
    a: from + (n > 1 ? (i / (n - 1)) * (to - from) : 0),
    d: out1 - (n > 1 ? (i / (n - 1)) * (out1 - out0) : 0),
  }));
}

// Each line now holds fully readable for ≥ 18 frames (0.6s) before it's unwritten.
const CHARS: Ch[] = [
  // "No complex syntax" — typed 8→30, held to 50, unwritten 50→58
  ...seg("No", 8, 10, 56, 58),
  ...seg(" complex", 12, 20, 53, 56),
  ...seg(" syntax", 22, 30, 50, 53),
  // "No learning" — typed 62→74, held to 84; "learning" unwritten 84→88
  ...seg("No", 62, 64, 112, 114),
  ...seg(" learning", 66, 74, 84, 88),
  // "No complex curve" — typed 89→97, held to 106, unwritten 106→114
  ...seg(" complex", 89, 93, 109, 112),
  ...seg(" curve", 94, 97, 106, 109),
];

// Approximate Inter advance widths (em) — only used to centre the line smoothly.
const W: Record<string, number> = {
  N: 0.74, o: 0.58, " ": 0.27, c: 0.54, m: 0.87, p: 0.59, l: 0.23, e: 0.56, x: 0.52, s: 0.5,
  y: 0.52, n: 0.58, t: 0.34, a: 0.54, r: 0.36, i: 0.23, g: 0.59, u: 0.58, v: 0.52,
};

export default function Scene() {
  const f = useCurrentFrame();

  // Continuous text width: each glyph's share eases in/out over 3 frames.
  const textWAt = (t: number) =>
    CHARS.reduce((sum, c) => {
      const v = interpolate(t, [c.a - 1, c.a + 2], [0, 1], clamp) * interpolate(t, [c.d - 2, c.d + 1], [1, 0], clamp);
      return sum + (W[c.ch] ?? 0.55) * FS * v;
    }, 0);
  const sizeAt = (t: number) =>
    glide(t, [0, 6, 114, 120, 128], [128, 118, 118, 260, 690]); // one continuous swell — no stop at 120
  // The blob's centre x = right end of the (centred) line, minus half its size.
  const blobXAt = (t: number) => {
    const w = textWAt(t);
    return 960 + (w + (w > 1 ? GAP : 0) - sizeAt(t)) / 2;
  };

  const textW = textWAt(f);
  const halo = interpolate(f, [0, 6], [1, 0], clamp);
  const size = sizeAt(f);

  // Horizontal motion blur for the writer blob: velocity (px/frame) from a
  // centred difference, turned into a left/right-only smear + slight stretch.
  const vx = (blobXAt(f + 1) - blobXAt(f - 1)) / 2;
  const speed = Math.abs(vx);
  const mBlur = Math.min(18, speed * 0.45);
  const stretch = 1 + Math.min(0.28, speed * 0.007);
  const hue = glide(f, [116, 120, 124, 128], [0, -35, -60, 0]); // smooth colour sweep, no pops at keys
  const glyph = interpolate(f, [124, 129], [0, 1], clamp);
  const morph = interpolate(f, [126, 133], [0, 1], { ...clamp, easing: Easing.outSmooth });
  const outBlur = interpolate(f, [136, 145], [0, 14], { ...clamp, easing: Easing.inCubic });

  // One slow, even spin (continues scene 07's ≈21°), settling upright for the logo.
  const spinAt = (t: number) => 21 + t * 0.35;
  const rot = f < 112 ? spinAt(f) : interpolate(f, [112, 128], [spinAt(112), 0], { ...clamp, easing: Easing.inOutCubic });

  const textGap = textW > 1 ? GAP : 0;
  const left = 960 - (textW + textGap + size) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div
        id="no-complex-line"
        style={{
          position: "absolute", left, top: 540, transform: "translateY(-50%)",
          display: "flex", alignItems: "center", gap: textGap, whiteSpace: "pre",
          fontFamily: FONT.sans, fontSize: FS, fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.2,
        }}
      >
        <div style={{ display: "flex" }}>
          {CHARS.map((c, i) => {
            if (f < c.a || f >= c.d) return null;
            const age = f - c.a;
            const settle = interpolate(age, [0, 10], [0, 1], { ...clamp, easing: Easing.outSmooth });
            const leaving = interpolate(f, [c.d - 6, c.d], [0, 1], clamp);
            return (
              <span
                key={i}
                style={{
                  filter: `blur(${interpolate(age, [0, 4], [4, 0], clamp) + leaving * 2}px)`,
                  opacity: interpolate(age, [0, 2], [0.35, 1], clamp) * (1 - leaving * 0.7),
                  color: mix(mix("#4d62c8", C.ink, settle), "#9a9aa2", leaving),
                }}
              >
                {c.ch}
              </span>
            );
          })}
        </div>
        <div id="codex-writer" style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
          <div
            style={{
              position: "absolute", left: -size * 0.5, top: -size * 0.5, width: size * 2, height: size * 2, borderRadius: "50%",
              backgroundColor: "#ffffff", opacity: halo, boxShadow: `0 16px 40px rgba(110,160,240,${0.35 * halo})`,
            }}
          />
          {/* Directional (x-only) motion blur, sized by the blob's horizontal speed */}
          <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
            <defs>
              <filter id="writer-mblur" x="-60%" y="-10%" width="220%" height="120%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation={`${mBlur} 0`} />
              </filter>
            </defs>
          </svg>
          <div
            style={{
              position: "relative", width: size, height: size,
              transform: `scaleX(${stretch})`,
              filter: mBlur > 0.3 ? "url(#writer-mblur)" : undefined,
            }}
          >
            <CodexBlob size={size} glyph={glyph} glyphMorph={morph} hue={hue} blur={outBlur} rotate={rot} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
