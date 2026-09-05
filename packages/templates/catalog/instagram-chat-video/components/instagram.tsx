import React from "react";
import { Img, interpolate, useCurrentFrame } from "@genmotion/motion";
import ogImage from "../assets/genmotion-og.png";
import mayaAvatar from "../assets/maya-avatar.png";

/**
 * Instagram Direct (iOS, light mode) design tokens.
 *
 * Instagram's DM palette is genuinely light — #FFFFFF chrome, #EFEFEF incoming
 * bubbles, #DBDBDB hairlines — so this deliberately inverts the usual dark
 * house style. Brand accuracy wins.
 */
export const IG = {
  bg: "#FFFFFF",
  chrome: "#FFFFFF",
  hairline: "#DBDBDB",
  bubbleIn: "#EFEFEF",
  text: "#000000",
  // 4.74:1 on white — the dimmest grey Instagram uses that still clears AA.
  muted: "#737373",
  accent: "#0095F6",
  // The sent-bubble gradient. Instagram anchors this to the VIEWPORT, not to
  // the bubble: a message near the top of the thread is violet, one near the
  // composer is indigo, and a bubble's colour shifts as the thread scrolls.
  // `gradientFor` below samples this ramp at a bubble's actual y position.
  gradTop: "#A22BE8",
  gradBottom: "#4E5BE8",
  font: '"SF Pro Text", Inter, -apple-system, system-ui, sans-serif',
};

export const CHAT = {
  pad: 32,
  bubbleMaxW: 820,
  fontSize: 46,
  lineHeight: 62,
  padY: 24,
  padX: 34,
  // Instagram bubbles are near-pill: 22pt at 1x, so a single-line bubble
  // (110px tall here) reads as fully rounded.
  radius: 44,
  radiusTight: 12,
  avatar: 56,
  avatarGap: 14,
  typingH: 96,
  cardW: 720,
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const GRAD_A = hexToRgb(IG.gradTop);
const GRAD_B = hexToRgb(IG.gradBottom);

/** Samples the screen-wide sent-bubble ramp at `t` (0 = top of thread, 1 = bottom). */
export function gradAt(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const [r, g, b] = GRAD_A.map((a, i) => Math.round(a + (GRAD_B[i] - a) * c));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * The slice of the screen ramp a bubble occupies, as a CSS gradient.
 * `top`/`bottom` are the bubble's edges in 0..1 thread coordinates.
 */
export function gradientFor(top: number, bottom: number): string {
  return `linear-gradient(180deg, ${gradAt(top)} 0%, ${gradAt(bottom)} 100%)`;
}

/** Maya's profile photo, circle-cropped the way Instagram renders it. */
export function Avatar({
  size,
  id,
  style,
}: {
  size: number;
  id?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      id={id}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        flexShrink: 0,
        backgroundColor: "#DBDBDB",
        ...style,
      }}
    >
      <Img
        src={mayaAvatar}
        style={{ display: "block", width: size, height: size, objectFit: "cover" }}
      />
    </div>
  );
}

/**
 * The composer field typing itself out, with a real iOS caret.
 *
 * Hand-rolled rather than using <Typewriter> because that component draws its
 * caret as a text glyph (default "▌", a terminal block) and only exposes the
 * glyph and its colour. An iOS caret is a shaped element — a ~4px rounded bar
 * in the tint colour — and it does NOT blink while you are actively typing;
 * it goes solid on keypress and only resumes blinking once you stop. Both of
 * those are impossible to express as a character.
 *
 * Typing rate matches Typewriter exactly: floor(elapsed / speed), so `speed`
 * is still frames-per-character and the timings in COMPOSE stay valid.
 */
export function ComposerInput({
  text,
  from,
  speed,
  id,
}: {
  text: string;
  from: number;
  speed: number;
  id?: string;
}) {
  const frame = useCurrentFrame();
  const chars = Array.from(text);
  const elapsed = frame - from;
  const typed = Math.max(
    0,
    Math.min(chars.length, Math.floor(elapsed / Math.max(1, speed))),
  );
  const done = typed >= chars.length;
  // iOS blinks at roughly a 1s cycle — 16 frames lit, 16 dark at 30fps — and
  // only once typing has stopped.
  const idleFor = elapsed - chars.length * speed;
  const caretLit = !done || Math.floor(Math.max(0, idleFor) / 16) % 2 === 0;

  return (
    <span
      id={id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "pre",
        fontSize: 40,
        color: IG.text,
        letterSpacing: "-0.01em",
      }}
    >
      <span>{chars.slice(0, typed).join("")}</span>
      <span
        style={{
          display: "inline-block",
          width: 4,
          height: 46,
          marginLeft: 3,
          borderRadius: 2,
          backgroundColor: IG.accent,
          // Toggled invisible rather than unmounted, so nothing reflows.
          opacity: caretLit ? 1 : 0,
        }}
      />
      {/* Reserves the full line width so the field never reflows as it types. */}
      <span style={{ visibility: "hidden" }}>{chars.slice(typed).join("")}</span>
    </span>
  );
}

/** Three pulsing dots in an Instagram grey pill. Frame-driven, never wall-clock. */
export function TypingDots() {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: 158,
        height: CHAT.typingH,
        borderRadius: CHAT.typingH / 2,
        backgroundColor: IG.bubbleIn,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      {[0, 1, 2].map((i) => {
        const t = frame * 0.2 - i * 0.7;
        const wave = (Math.sin(t) + 1) / 2;
        return (
          <div
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: "#8E8E8E",
              opacity: 0.5 + wave * 0.5,
              transform: `translateY(${-wave * 5}px) scale(${0.82 + wave * 0.24})`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * The genmotion.dev link preview: real OG image + real title.
 * On Instagram a sent link's card footer takes the bubble gradient, so the
 * caller passes the same gradient slice the attached text bubble uses.
 */
export function LinkPreview({ gradient }: { gradient: string }) {
  return (
    <div
      style={{
        width: CHAT.cardW,
        borderRadius: CHAT.radius,
        borderBottomLeftRadius: CHAT.radiusTight,
        borderBottomRightRadius: CHAT.radiusTight,
        overflow: "hidden",
        backgroundImage: gradient,
      }}
    >
      <Img
        src={ogImage}
        style={{
          display: "block",
          width: CHAT.cardW,
          height: Math.round((CHAT.cardW * 630) / 1200),
          objectFit: "cover",
        }}
      />
      <div
        style={{
          padding: "26px 30px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          fontFamily: IG.font,
        }}
      >
        <span
          style={{
            fontSize: 28,
            lineHeight: "36px",
            color: "rgba(255,255,255,0.82)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          genmotion.dev
        </span>
        <span
          style={{
            fontSize: 40,
            lineHeight: "50px",
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
            // `pre`, not `pre-line`: the break is explicit, so the title can
            // never rewrap and change the card's fixed height.
            whiteSpace: "pre",
          }}
        >
          {"AI Product Launch\nVideo Generator"}
        </span>
      </div>
    </div>
  );
}

/** Opacity/scale presence for a chat element that appears and optionally collapses. */
export function presence(frame: number, at: number, out?: number) {
  const enter = interpolate(frame, [at, at + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit =
    out == null
      ? 0
      : interpolate(frame, [out, out + 7], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  return enter * (1 - exit);
}
