import React from "react";
import { Img, interpolate, useCurrentFrame } from "@genmotion/motion";
import ogImage from "../assets/genmotion-og.png";
import mayaAvatar from "../assets/maya-avatar.png";

/**
 * Facebook Messenger (iOS, dark mode) design tokens.
 * Blues are nudged very slightly darker than #0084FF so white text on the
 * outgoing bubble clears WCAG AA (4.56:1 at the top of the gradient).
 */
export const M = {
  bg: "#000000",
  chrome: "#000000",
  hairline: "rgba(255,255,255,0.11)",
  bubbleIn: "#303030",
  outTop: "#0A6CFF",
  outBottom: "#0A55E8",
  cardMeta: "#242526",
  text: "#FFFFFF",
  muted: "#9AA0A6",
  accent: "#0A84FF",
  font: '"SF Pro Text", Inter, -apple-system, system-ui, sans-serif',
};

export const CHAT = {
  pad: 36,
  // 820 puts the incoming bubble's right edge at 928 — a 14% gutter, which is
  // where Messenger sits. Bubbles are sized by their content though, so this
  // is only a ceiling: width comes from where the lines are broken below.
  bubbleMaxW: 820,
  fontSize: 46,
  lineHeight: 62,
  padY: 24,
  padX: 34,
  radius: 44,
  radiusTight: 14,
  avatar: 56,
  avatarGap: 16,
  typingH: 96,
  cardW: 720,
};

/** Maya's profile photo, circle-cropped the way Messenger renders it. */
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
        backgroundColor: "#3a3b3c",
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
        color: M.text,
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
          backgroundColor: M.accent,
          // Toggled invisible rather than unmounted, so nothing reflows.
          opacity: caretLit ? 1 : 0,
        }}
      />
      {/* Reserves the full line width so the field never reflows as it types. */}
      <span style={{ visibility: "hidden" }}>{chars.slice(typed).join("")}</span>
    </span>
  );
}

/** Three pulsing dots in a Messenger grey pill. Frame-driven, never wall-clock. */
export function TypingDots() {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: 158,
        height: CHAT.typingH,
        borderRadius: CHAT.typingH / 2,
        backgroundColor: M.bubbleIn,
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
              backgroundColor: M.muted,
              opacity: 0.45 + wave * 0.5,
              transform: `translateY(${-wave * 5}px) scale(${0.82 + wave * 0.24})`,
            }}
          />
        );
      })}
    </div>
  );
}

/** The genmotion.dev link preview: real OG image + real title, Messenger card chrome. */
export function LinkPreview() {
  return (
    <div
      style={{
        width: CHAT.cardW,
        borderRadius: CHAT.radius,
        borderTopRightRadius: CHAT.radiusTight,
        overflow: "hidden",
        backgroundColor: M.cardMeta,
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
          fontFamily: M.font,
        }}
      >
        <span
          style={{
            fontSize: 28,
            lineHeight: "36px",
            color: M.muted,
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
            color: M.text,
            letterSpacing: "-0.01em",
            // `pre`, not `pre-line`: the break is explicit, so the title can
            // never rewrap and change the card's fixed 692px height.
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
