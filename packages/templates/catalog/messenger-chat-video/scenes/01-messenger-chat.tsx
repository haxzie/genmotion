import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "@genmotion/motion";
import {
  ChevronLeft,
  Phone,
  Video,
  Plus,
  Camera,
  Image as ImageIcon,
  Mic,
  ThumbsUp,
  Signal,
  Wifi,
  BatteryFull,
} from "lucide-react";
import { M, CHAT, Avatar, TypingDots, LinkPreview, ComposerInput } from "../components/messenger";

const STATUS_H = 64;
const HEADER_H = 150;
const COMPOSER_H = 150;
const HOME_H = 48;
const TOP = STATUS_H + HEADER_H;
const BOTTOM = COMPOSER_H + HOME_H;

type Msg = {
  id: string;
  kind: "divider" | "in" | "out" | "link";
  text?: string;
  at: number;
  h: number;
  gap: number;
};

// Conversational pacing: ~1.5-2s between messages, so each one lands and is
// read before the next arrives.
const SCRIPT: Msg[] = [
  { id: "divider", kind: "divider", text: "Today 9:41", at: 0, h: 56, gap: 0 },
  { id: "msg-1", kind: "in", text: "Ok so we're launching\non Tuesday 🚀", at: 42, h: 172, gap: 26 },
  { id: "msg-2", kind: "in", text: "and I still don't have a\nlaunch video 😭", at: 88, h: 172, gap: 8 },
  { id: "msg-3", kind: "in", text: "what's the best tool for\nmaking one??", at: 136, h: 172, gap: 8 },
  { id: "msg-4", kind: "out", text: "say less", at: 176, h: 110, gap: 26 },
  { id: "msg-5", kind: "link", text: "genmotion.dev", at: 230, h: 692, gap: 8 },
  { id: "msg-6", kind: "in", text: "wait it writes the scenes\nitself??", at: 288, h: 172, gap: 26 },
  { id: "msg-7", kind: "out", text: "and exports a real MP4", at: 344, h: 110, gap: 26 },
  { id: "msg-8", kind: "in", text: "ok I'm never opening After\nEffects again", at: 396, h: 172, gap: 26 },
];

// Typing indicator windows — always pinned to the bottom of the thread. Each
// one dwells 1-1.4s so you actually watch Maya compose the reply.
const TYPING: { at: number; out?: number }[] = [
  { at: 12, out: 42 },
  { at: 54, out: 88 },
  { at: 100, out: 136 },
  { at: 248, out: 288 },
  { at: 356, out: 396 },
  { at: 424 },
];

// The other half of the conversation: YOU composing in the input bar. Every
// outgoing message is typed out before it sends — `sendAt` is the frame the
// field clears, and matches the `at` of the message it becomes.
// `speed` is FRAMES PER CHARACTER, so a line takes text.length * speed
// frames; each finishes ~4 frames before it sends.
type Compose = { id: string; text: string; from: number; speed: number; sendAt: number };
const COMPOSE: Compose[] = [
  { id: "compose-1", text: "say less", from: 148, speed: 3, sendAt: 176 },
  { id: "compose-2", text: "genmotion.dev", from: 187, speed: 3, sendAt: 230 },
  { id: "compose-3", text: "and exports a real MP4", from: 296, speed: 2, sendAt: 344 },
];

const REACTION_AT = 414;

// Frames the slot gets to open before its bubble starts materialising into it.
const BUBBLE_DELAY = 6;
const SLOT_FRAMES = 12;

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slot progress: the space a message reserves in the thread. Monotonic and
  // eased so the thread never jitters. The slot always opens AHEAD of the
  // bubble that fills it (see BUBBLE_DELAY) — otherwise a bubble rendering at
  // its 0.80 scale floor is taller than the gap it has pushed open, and it
  // overlaps whatever sits above it.
  const layout = SCRIPT.map((m) =>
    interpolate(frame, [m.at, m.at + SLOT_FRAMES], [0, 1], {
      easing: Easing.outCubic,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  // Same split for the typing chip: its slot closes over 8 frames, but the chip
  // itself shrinks away in 5, so it is gone before the space beneath it does.
  const typing = TYPING.reduce(
    (best, w) => {
      const ease = { easing: Easing.outCubic, extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
      const slotIn = interpolate(frame, [w.at, w.at + 10], [0, 1], ease);
      const slotOut = w.out == null ? 0 : interpolate(frame, [w.out, w.out + 8], [0, 1], ease);
      const p = slotIn * (1 - slotOut);
      if (p <= best.p) return best;
      const chipIn = interpolate(frame, [w.at + 4, w.at + 14], [0, 1], ease);
      const chipOut = w.out == null ? 0 : interpolate(frame, [w.out, w.out + 5], [0, 1], ease);
      return {
        p,
        scale: (0.8 + 0.2 * chipIn) * (1 - chipOut),
        opacity: Math.min(1, chipIn * 2.5) * (1 - chipOut),
      };
    },
    { p: 0, scale: 0, opacity: 0 },
  );
  const base = typing.p * (CHAT.typingH + 26);

  const bottomOf = (i: number) =>
    base +
    SCRIPT.slice(i + 1).reduce((acc, m, k) => acc + layout[i + 1 + k] * (m.h + m.gap), 0);

  // Composer switches to compose mode (icons collapse, thumbs-up becomes a
  // send arrow) for EVERY outgoing message, then snaps back as it sends.
  const ease = {
    easing: Easing.outCubic,
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  };
  const typingUI = COMPOSE.reduce((acc, c) => {
    const on = interpolate(frame, [c.from - 6, c.from], [0, 1], ease);
    const off = interpolate(frame, [c.sendAt - 1, c.sendAt + 5], [0, 1], ease);
    return Math.max(acc, on * (1 - off));
  }, 0);
  const composing = COMPOSE.find((c) => frame >= c.from && frame < c.sendAt);

  const chromeIn = interpolate(frame, [0, 14], [0, 1], {
    easing: Easing.outCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: M.bg, fontFamily: M.font }}>
      {/* ---------------- status bar ---------------- */}
      <div
        id="status-bar"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: STATUS_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 52px",
          opacity: chromeIn,
        }}
      >
        <span style={{ fontSize: 32, color: M.text, letterSpacing: "-0.01em" }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Signal size={30} color={M.text} strokeWidth={2.2} />
          <Wifi size={30} color={M.text} strokeWidth={2.2} />
          <BatteryFull size={34} color={M.text} strokeWidth={2} />
        </div>
      </div>

      {/* ---------------- header ---------------- */}
      <div
        id="chat-header"
        style={{
          position: "absolute",
          top: STATUS_H,
          left: 0,
          right: 0,
          height: HEADER_H,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "0 32px",
          borderBottom: `1px solid ${M.hairline}`,
          backgroundColor: M.chrome,
          opacity: chromeIn,
          transform: `translateY(${(1 - chromeIn) * -14}px)`,
        }}
      >
        <ChevronLeft size={52} color={M.accent} strokeWidth={2.4} />
        <Avatar size={86} id="header-avatar" />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <span style={{ fontSize: 42, color: M.text, letterSpacing: "-0.01em" }}>Maya</span>
          <span style={{ fontSize: 30, color: M.muted }}>Active now</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          <Phone size={46} color={M.accent} strokeWidth={2} />
          <Video size={50} color={M.accent} strokeWidth={2} />
        </div>
      </div>

      {/* ---------------- thread ---------------- */}
      <div
        id="thread"
        style={{
          position: "absolute",
          top: TOP,
          left: 0,
          right: 0,
          height: 1920 - TOP - BOTTOM,
          overflow: "hidden",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,1) 64px, rgba(0,0,0,1) 100%)",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,1) 64px, rgba(0,0,0,1) 100%)",
        }}
      >
        {SCRIPT.map((m, i) => {
          if (layout[i] <= 0) return null;
          // IMPACT is the exact frame the bubble's first visible pixel lands,
          // and the frame its SFX is placed on in project.json. Opacity is
          // driven by an explicit interpolate rather than the spring so that
          // frame is knowable — a spring-derived fade makes the visual onset
          // depend on the easing curve, which is what put the sound early.
          const impact = m.at + BUBBLE_DELAY;
          const pop = spring({
            frame,
            fps,
            delay: impact,
            durationInFrames: 16,
            config: { mass: 0.8, stiffness: 165, damping: 17 },
          });
          const bottom = bottomOf(i);
          const opacity = interpolate(frame, [impact, impact + 3], [0, 1], {
            easing: Easing.outCubic,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          if (m.kind === "divider") {
            return (
              <div
                key={m.id}
                id={m.id}
                style={{
                  position: "absolute",
                  bottom,
                  left: 0,
                  right: 0,
                  height: m.h,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity,
                }}
              >
                <span style={{ fontSize: 28, color: M.muted, letterSpacing: "0.01em" }}>
                  {m.text}
                </span>
              </div>
            );
          }

          const isIn = m.kind === "in";
          const next = SCRIPT[i + 1];
          const prev = SCRIPT[i - 1];
          const sameNext = next && next.kind === m.kind;
          const samePrev = prev && prev.kind === m.kind;

          // Avatar rides the last incoming bubble of a run; it fades out the
          // moment the next bubble in that run lands underneath it.
          const avatarOp = isIn ? (sameNext ? 1 - layout[i + 1] : 1) : 0;

          const bubbleStyle: React.CSSProperties = {
            transform: `scale(${0.8 + pop * 0.2})`,
            transformOrigin: isIn ? "left bottom" : "right bottom",
            opacity,
          };

          if (m.kind === "link") {
            const reaction = spring({
              frame,
              fps,
              delay: REACTION_AT,
              durationInFrames: 18,
              config: { mass: 0.6, stiffness: 200, damping: 14 },
            });
            return (
              <div
                key={m.id}
                id={m.id}
                style={{
                  position: "absolute",
                  bottom,
                  right: CHAT.pad,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 6,
                  ...bubbleStyle,
                }}
              >
                <div
                  style={{
                    padding: `${CHAT.padY}px ${CHAT.padX}px`,
                    borderRadius: CHAT.radius,
                    borderBottomRightRadius: CHAT.radiusTight,
                    background: `linear-gradient(180deg, ${M.outTop} 0%, ${M.outBottom} 100%)`,
                    fontSize: CHAT.fontSize,
                    lineHeight: `${CHAT.lineHeight}px`,
                    color: M.text,
                  }}
                >
                  {m.text}
                </div>
                <div id="link-preview-card" style={{ position: "relative" }}>
                  <LinkPreview />
                  <div
                    id="reaction-fire"
                    style={{
                      position: "absolute",
                      left: 26,
                      bottom: -24,
                      padding: "8px 18px",
                      borderRadius: 999,
                      backgroundColor: "#1c1c1e",
                      border: "4px solid #000000",
                      fontSize: 34,
                      lineHeight: "40px",
                      transform: `scale(${reaction})`,
                      transformOrigin: "center bottom",
                      opacity: Math.min(1, reaction * 3),
                    }}
                  >
                    🔥
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={m.id}
              id={m.id}
              style={{
                position: "absolute",
                bottom,
                left: isIn ? CHAT.pad : undefined,
                right: isIn ? undefined : CHAT.pad,
                display: "flex",
                alignItems: "flex-end",
                gap: CHAT.avatarGap,
                ...bubbleStyle,
              }}
            >
              {isIn && (
                <Avatar size={CHAT.avatar} style={{ opacity: avatarOp, marginBottom: 2 }} />
              )}
              <div
                style={{
                  maxWidth: CHAT.bubbleMaxW,
                  padding: `${CHAT.padY}px ${CHAT.padX}px`,
                  borderRadius: CHAT.radius,
                  borderTopLeftRadius: isIn && samePrev ? CHAT.radiusTight : CHAT.radius,
                  borderBottomLeftRadius: isIn && sameNext ? CHAT.radiusTight : CHAT.radius,
                  borderTopRightRadius: !isIn && samePrev ? CHAT.radiusTight : CHAT.radius,
                  borderBottomRightRadius: !isIn && sameNext ? CHAT.radiusTight : CHAT.radius,
                  background: isIn
                    ? M.bubbleIn
                    : `linear-gradient(180deg, ${M.outTop} 0%, ${M.outBottom} 100%)`,
                  fontSize: CHAT.fontSize,
                  lineHeight: `${CHAT.lineHeight}px`,
                  color: M.text,
                  whiteSpace: "pre",
                  letterSpacing: "-0.005em",
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}

        {/* typing indicator — always the bottom-most element in the thread */}
        {typing.p > 0.001 && (
          <div
            id="typing-indicator"
            style={{
              position: "absolute",
              bottom: 0,
              left: CHAT.pad,
              display: "flex",
              alignItems: "flex-end",
              gap: CHAT.avatarGap,
              opacity: typing.opacity,
              transform: `scale(${typing.scale})`,
              transformOrigin: "left bottom",
            }}
          >
            <Avatar size={CHAT.avatar} style={{ marginBottom: 2 }} />
            <TypingDots />
          </div>
        )}
      </div>

      {/* ---------------- composer ---------------- */}
      <div
        id="composer"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: HOME_H,
          height: COMPOSER_H,
          display: "flex",
          alignItems: "center",
          gap: 26,
          padding: "0 36px",
          borderTop: `1px solid ${M.hairline}`,
          backgroundColor: M.chrome,
          opacity: chromeIn,
        }}
      >
        <Plus size={54} color={M.accent} strokeWidth={2.2} style={{ flexShrink: 0 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 26,
            width: (54 * 3 + 52) * (1 - typingUI),
            opacity: 1 - typingUI,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <Camera size={54} color={M.accent} strokeWidth={2.2} style={{ flexShrink: 0 }} />
          <ImageIcon size={54} color={M.accent} strokeWidth={2.2} style={{ flexShrink: 0 }} />
          <Mic size={54} color={M.accent} strokeWidth={2.2} style={{ flexShrink: 0 }} />
        </div>

        <div
          id="composer-input"
          style={{
            flex: 1,
            height: 88,
            borderRadius: 44,
            backgroundColor: M.bubbleIn,
            display: "flex",
            alignItems: "center",
            padding: "0 32px",
            overflow: "hidden",
          }}
        >
          {composing ? (
            <ComposerInput
              key={composing.id}
              id={composing.id}
              text={composing.text}
              from={composing.from}
              speed={composing.speed}
            />
          ) : (
            <span style={{ fontSize: 40, color: M.muted, opacity: 1 - typingUI }}>Aa</span>
          )}
        </div>

        <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
          <ThumbsUp
            size={54}
            color={M.accent}
            strokeWidth={2.2}
            style={{ position: "absolute", inset: 0, opacity: 1 - typingUI }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: typingUI,
              transform: `scale(${0.7 + typingUI * 0.3})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="54" height="54" viewBox="0 0 24 24" fill={M.accent}>
              <path d="M2.5 12 21 3.5 12.5 21.5 11 13.5 2.5 12Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* home indicator */}
      <div
        id="home-indicator"
        style={{
          position: "absolute",
          bottom: 18,
          left: "50%",
          marginLeft: -140,
          width: 280,
          height: 10,
          borderRadius: 5,
          backgroundColor: "rgba(255,255,255,0.38)",
          opacity: chromeIn,
        }}
      />
    </AbsoluteFill>
  );
}
