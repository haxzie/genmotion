import React from "react";
import { Img, interpolate, useCurrentFrame } from "@genmotion/motion";
import ogImage from "../assets/genmotion-og.png";
import mayaAvatar from "../assets/maya-avatar.png";

/**
 * WhatsApp (dark theme) design tokens — the real palette.
 *   #0B141A  chat wallpaper base      #202C33  incoming bubble
 *   #1F2C34  top bar / chrome         #005C4B  outgoing bubble
 *   #2A3942  composer field           #00A884  brand teal (send, icons)
 *   #E9EDEF  primary text             #8696A0  secondary text
 *   #53BDEB  read ticks
 */
export const W = {
  bg: "#0B141A",
  chrome: "#1F2C34",
  hairline: "rgba(255,255,255,0.08)",
  bubbleIn: "#202C33",
  bubbleOut: "#005C4B",
  panel: "#182229",
  field: "#2A3942",
  text: "#E9EDEF",
  muted: "#8696A0",
  metaOut: "#C6D5D0",
  accent: "#00A884",
  ticks: "#53BDEB",
  font: '"Helvetica Neue", "SF Pro Text", Inter, -apple-system, system-ui, sans-serif',
};

export const CHAT = {
  pad: 34,
  // Ceiling only — bubbles are sized by their content, and the line breaks in
  // the script are explicit so nothing ever rewraps mid-animation.
  bubbleMaxW: 820,
  fontSize: 44,
  lineHeight: 60,
  padY: 20,
  padX: 28,
  // WhatsApp iOS bubbles are properly rounded — ~12pt, which at this
  // composition's 2.6x type scale is ~32. (The 7.5px figure is WhatsApp Web,
  // which is a much boxier bubble than the phone app.)
  radius: 32,
  metaSize: 28,
  metaH: 30,
  typingH: 84,
  cardW: 660,
};

/**
 * The WhatsApp doodle wallpaper.
 *
 * Drawn as a tiling SVG rather than a bitmap so it stays crisp at any zoom and
 * adds nothing to the project's asset weight. Doodles are kept inside the tile
 * margins so the repeat never slices one in half.
 */
const DOODLE_TILE = 420;
const DOODLES = `
<circle cx="54" cy="56" r="22"/>
<path d="M46 52v-5M62 52v-5M45 62c5 6 13 6 18 0"/>
<path d="M172 78c-15-10-23-17-23-25a9.5 9.5 0 0 1 18-4.5 9.5 9.5 0 0 1 18 4.5c0 8-8 15-23 25z"/>
<path d="M258 36h46a9 9 0 0 1 9 9v27a9 9 0 0 1-9 9h-28l-16 13v-13a9 9 0 0 1-9-9V45a9 9 0 0 1 9-9z"/>
<path d="M344 48h11l6-9h20l6 9h11a7 7 0 0 1 7 7v29a7 7 0 0 1-7 7h-54a7 7 0 0 1-7-7V55a7 7 0 0 1 7-7z"/>
<circle cx="381" cy="70" r="13"/>
<path d="M60 196v-44l30-8v44"/>
<circle cx="52" cy="198" r="9"/>
<circle cx="82" cy="190" r="9"/>
<path d="M168 152l7 21h22l-18 13 7 21-18-13-18 13 7-21-18-13h22z"/>
<path d="M244 190l72-32-30 70-10-27z"/>
<path d="M286 158l-24 31"/>
<circle cx="378" cy="180" r="17"/>
<path d="M378 150v-12M378 222v-12M348 180h-12M420 180h-12M357 159l-8-8M407 209l-8-8M399 159l8-8M349 209l8-8"/>
<path d="M44 280h44v26a22 22 0 0 1-22 22 22 22 0 0 1-22-22z"/>
<path d="M88 288h10a10 10 0 0 1 0 20h-10M40 342h52"/>
<path d="M150 344v-34M128 310a22 22 0 0 1 44 0"/>
<path d="M150 344a10 10 0 0 0 20 0"/>
<path d="M128 310c0-30 44-30 44 0"/>
<path d="M246 300a52 52 0 0 0 52 52v-14a14 14 0 0 0-14-14l-10 6a40 40 0 0 1-6-6l6-10a14 14 0 0 0-14-14z"/>
<circle cx="352" cy="330" r="16"/>
<circle cx="404" cy="330" r="16"/>
<path d="M352 330l14-30h16M368 330h22"/>
<path d="M104 366l-22 34h20l-6 26 24-34h-20z"/>
<path d="M196 378h56v34h-56zM192 366h64v14h-64zM224 366v46"/>
<path d="M224 366c-8-14-26-10-22 0 3 7 22 0 22 0zM224 366c8-14 26-10 22 0-3 7-22 0-22 0z"/>
<path d="M318 400a18 18 0 0 1 2-36 26 26 0 0 1 48-6 16 16 0 0 1 2 42z"/>
`;

export function Wallpaper({ opacity = 1 }: { opacity?: number }) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${DOODLE_TILE}" height="${DOODLE_TILE}" viewBox="0 0 ${DOODLE_TILE} ${DOODLE_TILE}">` +
    `<g fill="none" stroke="rgba(233,237,239,0.055)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">` +
    DOODLES +
    `</g></svg>`;
  return (
    <div
      id="chat-wallpaper"
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: W.bg,
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
        backgroundRepeat: "repeat",
        backgroundSize: `${DOODLE_TILE}px ${DOODLE_TILE}px`,
        opacity,
      }}
    />
  );
}

/** Maya's profile photo, circle-cropped. In a 1:1 chat WhatsApp only shows it in the header. */
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
        backgroundColor: "#3a4a52",
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
 * The bubble tail: WhatsApp hangs it off the TOP outer corner of the first
 * message in a run, and the corner it attaches to is squared off.
 */
export function Tail({ side, color }: { side: "left" | "right"; color: string }) {
  const d =
    side === "left"
      ? "M1.533 2.568L8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"
      : "M6.467 2.568L0 11.193V0h5.188c1.77 0 2.34 1.156 1.28 2.568z";
  return (
    <svg
      width={24}
      height={39}
      viewBox="0 0 8 13"
      style={{
        position: "absolute",
        top: 0,
        left: side === "left" ? -23 : undefined,
        right: side === "right" ? -23 : undefined,
      }}
    >
      <path d={d} fill={color} />
    </svg>
  );
}

/**
 * Delivery ticks on an outgoing message: one grey tick on send, a second grey
 * tick on delivery, then both turn blue when read. Two stacked glyphs cross-
 * faded, because SVG stroke colour can't be interpolated frame by frame.
 */
export function Ticks({ sentAt }: { sentAt: number }) {
  const frame = useCurrentFrame();
  const ease = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
  const second = interpolate(frame, [sentAt + 10, sentAt + 14], [0, 1], ease);
  const read = interpolate(frame, [sentAt + 22, sentAt + 27], [0, 1], ease);

  const glyph = (color: string, o: number) => (
    <svg
      width={34}
      height={24}
      viewBox="0 0 20 14"
      fill="none"
      style={{ position: "absolute", inset: 0, opacity: o }}
    >
      <path
        d="M1 7.5L4.8 11.3L11.6 3.2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.6 7.5L11.4 11.3L18.6 3.2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={second}
      />
    </svg>
  );

  return (
    <span style={{ position: "relative", width: 34, height: 24, flexShrink: 0 }}>
      {glyph(W.metaOut, 1 - read)}
      {glyph(W.ticks, read)}
    </span>
  );
}

/**
 * Width the timestamp needs, so the last line of text can reserve room for it.
 *
 * WhatsApp does NOT put the time on its own row — it sits on the baseline of
 * the last line, at the bubble's bottom-right, and the text flows around it.
 * That's reproduced here by pairing this measurement (an inline spacer at the
 * end of the text) with an absolutely positioned <Meta>. Digits are measured
 * rather than laid out, so the bubble's height is knowable in advance and the
 * thread's slot arithmetic stays exact.
 */
export function metaReserve(time: string, out: boolean) {
  const digits = (time.match(/\d/g) || []).length;
  const colons = time.length - digits;
  // Helvetica at 28px: digits advance ~0.556em, colon ~0.28em.
  const label = digits * 15.6 + colons * 7.9;
  return Math.round(label + (out ? 8 + 34 : 0) + 18);
}

/** Timestamp (+ ticks on outgoing), pinned to the bottom-right inside a bubble. */
export function Meta({
  time,
  out = false,
  sentAt,
  right = CHAT.padX,
  bottom = CHAT.padY - 6,
}: {
  time: string;
  out?: boolean;
  sentAt?: number;
  right?: number;
  bottom?: number;
}) {
  return (
    <span
      style={{
        position: "absolute",
        right,
        bottom,
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: CHAT.metaH,
        fontSize: CHAT.metaSize,
        lineHeight: `${CHAT.metaH}px`,
        color: out ? W.metaOut : W.muted,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
    >
      {time}
      {out && sentAt != null ? <Ticks sentAt={sentAt} /> : null}
    </span>
  );
}

/**
 * The composer field typing itself out, with a real iOS caret in WhatsApp's
 * teal tint.
 *
 * Hand-rolled rather than using <Typewriter> because that component draws its
 * caret as a text glyph (default "▌", a terminal block) and only exposes the
 * glyph and its colour. An iOS caret is a shaped element — a ~4px rounded bar
 * in the tint colour — and it does NOT blink while you are actively typing;
 * it goes solid on keypress and only resumes blinking once you stop.
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
        color: W.text,
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
          backgroundColor: W.accent,
          // Toggled invisible rather than unmounted, so nothing reflows.
          opacity: caretLit ? 1 : 0,
        }}
      />
      {/* Reserves the full line width so the field never reflows as it types. */}
      <span style={{ visibility: "hidden" }}>{chars.slice(typed).join("")}</span>
    </span>
  );
}

/** Three pulsing dots in a WhatsApp incoming bubble. Frame-driven, never wall-clock. */
export function TypingDots() {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "relative",
        width: 138,
        height: CHAT.typingH,
        borderRadius: CHAT.radius,
        borderTopLeftRadius: 0,
        backgroundColor: W.bubbleIn,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      <Tail side="left" color={W.bubbleIn} />
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
              backgroundColor: W.muted,
              opacity: 0.45 + wave * 0.5,
              transform: `translateY(${-wave * 5}px) scale(${0.82 + wave * 0.24})`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * The genmotion.dev link preview, in WhatsApp's style: a darkened panel inset
 * inside the outgoing bubble, image on top, title and host beneath.
 */
export function LinkPreview() {
  return (
    <div
      style={{
        width: CHAT.cardW,
        // Concentric with the bubble: the outer radius minus the 8px inset.
        borderRadius: CHAT.radius - 8,
        overflow: "hidden",
        backgroundColor: "rgba(0,0,0,0.22)",
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
          padding: "18px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontFamily: W.font,
        }}
      >
        <span
          style={{
            fontSize: 34,
            lineHeight: "44px",
            color: W.text,
            letterSpacing: "-0.01em",
            // `pre`, not `pre-line`: the break is explicit, so the title can
            // never rewrap and change the card's fixed height.
            whiteSpace: "pre",
          }}
        >
          {"AI Product Launch\nVideo Generator"}
        </span>
        <span style={{ fontSize: 28, lineHeight: "32px", color: W.muted }}>genmotion.dev</span>
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
