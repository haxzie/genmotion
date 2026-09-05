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
  ChevronRight,
  Phone,
  Video,
  Plus,
  Mic,
  Sticker,
  Camera,
  Image as ImageIcon,
  Signal,
  Wifi,
  BatteryFull,
} from "lucide-react";
import {
  IG,
  CHAT,
  Avatar,
  TypingDots,
  LinkPreview,
  ComposerInput,
  gradientFor,
} from "../components/instagram";

const STATUS_H = 64;
const HEADER_H = 158;
const COMPOSER_H = 158;
const HOME_H = 48;
const TOP = STATUS_H + HEADER_H;
const BOTTOM = COMPOSER_H + HOME_H;
const THREAD_H = 1920 - TOP - BOTTOM;

type Msg = {
  id: string;
  // "emoji" is Instagram's emoji-only message: up to three glyphs, rendered
  // large with no bubble behind them.
  kind: "divider" | "in" | "out" | "link" | "emoji";
  text?: string;
  at: number;
  h: number;
  gap: number;
};

// Point size for a bubble-less emoji reply, and the line box it occupies.
const EMOJI_SIZE = 112;
const EMOJI_LINE = 132;

// Conversational pacing: ~1.5-2s between messages, so each one lands and is
// read before the next arrives.
const SCRIPT: Msg[] = [
  { id: "divider", kind: "divider", text: "Today 9:41", at: 0, h: 56, gap: 0 },
  { id: "msg-1", kind: "in", text: "Ok so we're launching\non Tuesday 🚀", at: 42, h: 172, gap: 26 },
  { id: "msg-2", kind: "in", text: "and I still don't have a\nlaunch video 😭", at: 88, h: 172, gap: 8 },
  { id: "msg-3", kind: "in", text: "what's the best tool for\nmaking one??", at: 136, h: 172, gap: 8 },
  { id: "msg-4", kind: "out", text: "say less", at: 176, h: 110, gap: 26 },
  { id: "msg-5", kind: "link", text: "genmotion.dev", at: 230, h: 692, gap: 8 },
  { id: "msg-6", kind: "in", text: "wait it writes the scenes\nitself??", at: 288, h: 172, gap: 30 },
  { id: "msg-7", kind: "out", text: "and exports a real MP4", at: 344, h: 110, gap: 26 },
  // gap 46 rather than the usual 26: the "Seen" receipt hangs below msg-7.
  { id: "msg-8", kind: "emoji", text: "🤯🤯🤯", at: 390, h: 150, gap: 46 },
  { id: "msg-9", kind: "in", text: "ok I'm never opening After\nEffects again", at: 440, h: 172, gap: 24 },
];

// Typing indicator windows — always pinned to the bottom of the thread. Each
// one dwells 1-1.4s so you actually watch Maya compose the reply.
const TYPING: { at: number; out?: number }[] = [
  { at: 12, out: 42 },
  { at: 54, out: 88 },
  { at: 100, out: 136 },
  { at: 248, out: 288 },
  { at: 356, out: 390 },
  { at: 402, out: 440 },
  { at: 476 },
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
// "Seen" lands under the last sent message once Maya starts typing her reply.
const SEEN_AT = 360;

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

  // Composer switches to compose mode (the inline pill icons collapse and
  // Instagram's blue "Send" label slides in) for EVERY outgoing message, then
  // snaps back as it sends.
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
    <AbsoluteFill style={{ backgroundColor: IG.bg, fontFamily: IG.font }}>
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
        <span style={{ fontSize: 32, color: IG.text, fontWeight: 600, letterSpacing: "-0.01em" }}>
          9:41
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Signal size={30} color={IG.text} strokeWidth={2.2} />
          <Wifi size={30} color={IG.text} strokeWidth={2.2} />
          <BatteryFull size={34} color={IG.text} strokeWidth={2} />
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
          gap: 18,
          padding: "0 30px",
          borderBottom: `1px solid ${IG.hairline}`,
          backgroundColor: IG.chrome,
          opacity: chromeIn,
          transform: `translateY(${(1 - chromeIn) * -14}px)`,
        }}
      >
        <ChevronLeft size={54} color={IG.text} strokeWidth={2.2} />
        <Avatar size={86} id="header-avatar" />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 42,
                fontWeight: 600,
                color: IG.text,
                letterSpacing: "-0.015em",
              }}
            >
              Maya Rivera
            </span>
            <ChevronRight size={30} color={IG.muted} strokeWidth={2.6} />
          </div>
          <span style={{ fontSize: 30, color: IG.muted }}>mayabuilds</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Phone size={48} color={IG.text} strokeWidth={1.9} />
          <Video size={52} color={IG.text} strokeWidth={1.9} />
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
          height: THREAD_H,
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

          // Where this bubble currently sits on screen, 0..1 down the thread —
          // this is what makes the sent gradient viewport-anchored: a bubble
          // recolours as the conversation pushes it upward.
          const gradient = gradientFor(
            (THREAD_H - bottom - m.h) / THREAD_H,
            (THREAD_H - bottom) / THREAD_H,
          );

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
                <span style={{ fontSize: 28, color: IG.muted, letterSpacing: "0.01em" }}>
                  {m.text}
                </span>
              </div>
            );
          }

          const next = SCRIPT[i + 1];
          const prev = SCRIPT[i - 1];

          // Emoji-only reply: no bubble, no padding — just the glyphs, popped
          // in with more overshoot than a bubble gets. Instagram treats it as
          // part of the incoming run, so the avatar still belongs to whichever
          // incoming message is lowest.
          if (m.kind === "emoji") {
            const emojiPop = spring({
              frame,
              fps,
              delay: impact,
              durationInFrames: 20,
              config: { mass: 0.7, stiffness: 190, damping: 13 },
            });
            const runContinues = next && (next.kind === "in" || next.kind === "emoji");
            return (
              <div
                key={m.id}
                id={m.id}
                style={{
                  position: "absolute",
                  bottom,
                  left: CHAT.pad,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: CHAT.avatarGap,
                  opacity,
                }}
              >
                <Avatar
                  size={CHAT.avatar}
                  style={{
                    opacity: runContinues ? 1 - layout[i + 1] : 1,
                    marginBottom: 2,
                  }}
                />
                <div
                  style={{
                    fontSize: EMOJI_SIZE,
                    lineHeight: `${EMOJI_LINE}px`,
                    letterSpacing: "0.02em",
                    whiteSpace: "pre",
                    transform: `scale(${0.72 + emojiPop * 0.28})`,
                    transformOrigin: "left bottom",
                  }}
                >
                  {m.text}
                </div>
              </div>
            );
          }

          const isIn = m.kind === "in";
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
                <div id="link-preview-card">
                  <LinkPreview gradient={gradient} />
                </div>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      padding: `${CHAT.padY}px ${CHAT.padX}px`,
                      borderRadius: CHAT.radius,
                      borderTopRightRadius: CHAT.radiusTight,
                      borderTopLeftRadius: CHAT.radiusTight,
                      backgroundImage: gradient,
                      fontSize: CHAT.fontSize,
                      lineHeight: `${CHAT.lineHeight}px`,
                      color: "#FFFFFF",
                    }}
                  >
                    {m.text}
                  </div>
                  <div
                    id="reaction-heart"
                    style={{
                      position: "absolute",
                      left: 22,
                      bottom: -26,
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: "#FFFFFF",
                      boxShadow: "0 3px 12px rgba(0,0,0,0.16)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 32,
                      lineHeight: "36px",
                      transform: `scale(${reaction})`,
                      transformOrigin: "center bottom",
                      opacity: Math.min(1, reaction * 3),
                    }}
                  >
                    ❤️
                  </div>
                </div>
              </div>
            );
          }

          // "Seen" receipt under the newest outgoing message.
          const isLastOut = m.id === "msg-7";
          const seen = isLastOut
            ? interpolate(frame, [SEEN_AT, SEEN_AT + 8], [0, 1], ease)
            : 0;

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
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    maxWidth: CHAT.bubbleMaxW,
                    padding: `${CHAT.padY}px ${CHAT.padX}px`,
                    borderRadius: CHAT.radius,
                    borderTopLeftRadius: isIn && samePrev ? CHAT.radiusTight : CHAT.radius,
                    borderBottomLeftRadius: isIn && sameNext ? CHAT.radiusTight : CHAT.radius,
                    borderTopRightRadius: !isIn && samePrev ? CHAT.radiusTight : CHAT.radius,
                    borderBottomRightRadius: !isIn && sameNext ? CHAT.radiusTight : CHAT.radius,
                    ...(isIn
                      ? { backgroundColor: IG.bubbleIn }
                      : { backgroundImage: gradient }),
                    fontSize: CHAT.fontSize,
                    lineHeight: `${CHAT.lineHeight}px`,
                    color: isIn ? IG.text : "#FFFFFF",
                    whiteSpace: "pre",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {m.text}
                </div>
                {isLastOut && seen > 0.001 && (
                  <span
                    id="seen-receipt"
                    style={{
                      position: "absolute",
                      right: 8,
                      bottom: -40,
                      fontSize: 28,
                      color: IG.muted,
                      opacity: seen,
                      whiteSpace: "pre",
                    }}
                  >
                    Seen
                  </span>
                )}
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
          gap: 22,
          padding: "0 30px",
          backgroundColor: IG.chrome,
          opacity: chromeIn,
        }}
      >
        {/* Instagram's gradient camera button */}
        <div
          id="composer-camera"
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            flexShrink: 0,
            backgroundImage: "linear-gradient(135deg, #3B54E8 0%, #8A2BE8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Camera size={48} color="#FFFFFF" strokeWidth={2} />
        </div>

        <div
          id="composer-input"
          style={{
            flex: 1,
            height: 88,
            borderRadius: 44,
            border: `1px solid ${IG.hairline}`,
            backgroundColor: IG.chrome,
            display: "flex",
            alignItems: "center",
            padding: "0 30px",
            gap: 20,
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflow: "hidden" }}>
            {composing ? (
              <ComposerInput
                key={composing.id}
                id={composing.id}
                text={composing.text}
                from={composing.from}
                speed={composing.speed}
              />
            ) : (
              <span style={{ fontSize: 40, color: IG.muted }}>Message...</span>
            )}
          </div>

          {/* Inline pill icons collapse away the moment you start typing */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              width: (48 * 3 + 48) * (1 - typingUI),
              opacity: 1 - typingUI,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <Mic size={48} color={IG.text} strokeWidth={1.9} style={{ flexShrink: 0 }} />
            <ImageIcon size={48} color={IG.text} strokeWidth={1.9} style={{ flexShrink: 0 }} />
            <Sticker size={48} color={IG.text} strokeWidth={1.9} style={{ flexShrink: 0 }} />
          </div>
        </div>

        {/* "+" outside the pill, replaced by the blue Send label while typing */}
        <div
          style={{
            position: "relative",
            width: 78 * (1 - typingUI) + 128 * typingUI,
            height: 78,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 72,
              height: 72,
              borderRadius: 36,
              border: `2px solid ${IG.text}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 1 - typingUI,
              transform: `scale(${0.7 + (1 - typingUI) * 0.3})`,
            }}
          >
            <Plus size={44} color={IG.text} strokeWidth={2.2} />
          </div>
          <span
            style={{
              position: "absolute",
              fontSize: 38,
              fontWeight: 600,
              color: IG.accent,
              opacity: typingUI,
              transform: `scale(${0.7 + typingUI * 0.3})`,
              whiteSpace: "pre",
            }}
          >
            Send
          </span>
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
          backgroundColor: "rgba(0,0,0,0.32)",
          opacity: chromeIn,
        }}
      />
    </AbsoluteFill>
  );
}
