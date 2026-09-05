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
  Smile,
  Paperclip,
  Camera,
  Mic,
  Signal,
  Wifi,
  BatteryFull,
} from "lucide-react";
import {
  W,
  CHAT,
  Avatar,
  Wallpaper,
  Tail,
  Meta,
  metaReserve,
  TypingDots,
  LinkPreview,
  ComposerInput,
} from "../components/whatsapp";

const STATUS_H = 64;
const HEADER_H = 150;
const HOME_H = 48;
const TOP = STATUS_H + HEADER_H;
// The composer floats over the wallpaper rather than sitting in a bar, so the
// thread simply stops above it.
const PILL_H = 104;
const COMPOSER_BOTTOM = 44;
const BOTTOM = COMPOSER_BOTTOM + PILL_H + 42;

type Msg = {
  id: string;
  kind: "divider" | "in" | "out" | "link";
  text?: string;
  time?: string;
  at: number;
  h: number;
  gap: number;
  /** Floor on the bubble's width, for a line that measures narrower than it reads. */
  minW?: number;
};

// Conversational pacing: ~1.5-2s between messages, so each one lands and is
// read before the next arrives. The `at` frames are also where the send/receive
// SFX are placed in project.json — don't retime one without the other.
//
// `h` is the bubble's real rendered height, and it has to stay in step with the
// metrics: padY*2 + lines*lineHeight, i.e. 40 + n*60. The timestamp adds
// nothing, because it rides the last line rather than sitting on its own row.
const SCRIPT: Msg[] = [
  { id: "divider", kind: "divider", text: "TODAY", at: 0, h: 76, gap: 0 },
  { id: "msg-1", kind: "in", text: "Ok so we're launching\non Tuesday 🚀", time: "9:39", at: 42, h: 160, gap: 26 },
  { id: "msg-2", kind: "in", text: "and I still don't have a\nlaunch video 😭", time: "9:39", at: 88, h: 160, gap: 10, minW: 760 },
  { id: "msg-3", kind: "in", text: "what's the best tool for\nmaking one??", time: "9:40", at: 136, h: 160, gap: 10 },
  { id: "msg-4", kind: "out", text: "say less", time: "9:40", at: 176, h: 100, gap: 26 },
  { id: "msg-5", kind: "link", text: "genmotion.dev", time: "9:40", at: 230, h: 600, gap: 10 },
  { id: "msg-6", kind: "in", text: "wait it writes the scenes\nitself??", time: "9:41", at: 288, h: 160, gap: 26 },
  { id: "msg-7", kind: "out", text: "and exports a real MP4", time: "9:41", at: 344, h: 100, gap: 26 },
  { id: "msg-8", kind: "in", text: "ok I'm never opening After\nEffects again", time: "9:42", at: 396, h: 160, gap: 26 },
];

// Typing indicator windows — always pinned to the bottom of the thread, and
// mirrored by "typing…" in the header the way WhatsApp does it. Each one dwells
// 1-1.4s so you actually watch Maya compose the reply.
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
  // its scale floor is taller than the gap it has pushed open, and it overlaps
  // whatever sits above it.
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
      const ease = {
        easing: Easing.outCubic,
        extrapolateLeft: "clamp" as const,
        extrapolateRight: "clamp" as const,
      };
      const slotIn = interpolate(frame, [w.at, w.at + 10], [0, 1], ease);
      const slotOut = w.out == null ? 0 : interpolate(frame, [w.out, w.out + 8], [0, 1], ease);
      const p = slotIn * (1 - slotOut);
      if (p <= best.p) return best;
      const chipIn = interpolate(frame, [w.at + 4, w.at + 14], [0, 1], ease);
      const chipOut = w.out == null ? 0 : interpolate(frame, [w.out, w.out + 5], [0, 1], ease);
      return {
        p,
        scale: (0.86 + 0.14 * chipIn) * (1 - chipOut),
        opacity: Math.min(1, chipIn * 2.5) * (1 - chipOut),
      };
    },
    { p: 0, scale: 0, opacity: 0 },
  );
  const base = typing.p * (CHAT.typingH + 26);

  const bottomOf = (i: number) =>
    base +
    SCRIPT.slice(i + 1).reduce((acc, m, k) => acc + layout[i + 1 + k] * (m.h + m.gap), 0);

  // Composer switches to compose mode (camera shortcut collapses, the mic
  // becomes a send arrow) for EVERY outgoing message, then snaps back as it sends.
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

  // WhatsApp reports the other person typing in the header subtitle, so the two
  // indicators share one source of truth.
  const headerTyping = Math.min(1, typing.p * 2.2);

  return (
    <AbsoluteFill style={{ backgroundColor: W.bg, fontFamily: W.font }}>
      <Wallpaper />

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
          backgroundColor: W.chrome,
          opacity: chromeIn,
        }}
      >
        <span style={{ fontSize: 32, color: W.text, letterSpacing: "-0.01em" }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Signal size={30} color={W.text} strokeWidth={2.2} />
          <Wifi size={30} color={W.text} strokeWidth={2.2} />
          <BatteryFull size={34} color={W.text} strokeWidth={2} />
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
          backgroundColor: W.chrome,
          boxShadow: "0 1px 0 rgba(0,0,0,0.35)",
          opacity: chromeIn,
          transform: `translateY(${(1 - chromeIn) * -14}px)`,
        }}
      >
        <ChevronLeft size={52} color={W.accent} strokeWidth={2.4} />
        <Avatar size={84} id="header-avatar" />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, marginLeft: 4 }}>
          <span style={{ fontSize: 40, color: W.text, letterSpacing: "-0.01em" }}>Maya</span>
          <span style={{ position: "relative", height: 34 }}>
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                fontSize: 28,
                lineHeight: "34px",
                color: W.muted,
                opacity: 1 - headerTyping,
              }}
            >
              online
            </span>
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                fontSize: 28,
                lineHeight: "34px",
                color: W.accent,
                opacity: headerTyping,
              }}
            >
              typing…
            </span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <Video size={50} color={W.accent} strokeWidth={2} />
          <Phone size={44} color={W.accent} strokeWidth={2} />
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
            config: { mass: 0.8, stiffness: 170, damping: 18 },
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
                <span
                  style={{
                    padding: "10px 26px",
                    borderRadius: 14,
                    backgroundColor: W.panel,
                    fontSize: 28,
                    color: W.muted,
                    letterSpacing: "0.06em",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.28)",
                  }}
                >
                  {m.text}
                </span>
              </div>
            );
          }

          const isIn = m.kind === "in";
          const prev = SCRIPT[i - 1];
          // WhatsApp only tails the FIRST bubble of a run; the rest tuck under it.
          const samePrev = prev && prev.kind === m.kind;
          const color = isIn ? W.bubbleIn : W.bubbleOut;

          const wrapStyle: React.CSSProperties = {
            position: "absolute",
            bottom,
            left: isIn ? CHAT.pad : undefined,
            right: isIn ? undefined : CHAT.pad,
            // A shrink-to-fit flex box, so each bubble is exactly as wide as
            // its widest line (plus the room the timestamp reserves) instead of
            // stretching to the max width.
            display: "flex",
            justifyContent: isIn ? "flex-start" : "flex-end",
            transform: `translateY(${(1 - pop) * 26}px) scale(${0.94 + pop * 0.06})`,
            transformOrigin: isIn ? "left bottom" : "right bottom",
            opacity,
          };

          const bubbleBase: React.CSSProperties = {
            position: "relative",
            borderRadius: CHAT.radius,
            // Only the tailed corner is squared off, and only on the side the
            // tail hangs from.
            borderTopLeftRadius: isIn && !samePrev ? 0 : CHAT.radius,
            borderTopRightRadius: !isIn && !samePrev ? 0 : CHAT.radius,
            backgroundColor: color,
            boxShadow: "0 1px 1px rgba(0,0,0,0.25)",
            color: W.text,
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
              <div key={m.id} id={m.id} style={wrapStyle}>
                <div
                  id="link-preview-card"
                  style={{
                    ...bubbleBase,
                    width: CHAT.cardW + 16,
                    padding: 8,
                    paddingBottom: 12,
                  }}
                >
                  {!samePrev && <Tail side="right" color={color} />}
                  <LinkPreview />
                  <div style={{ padding: "0 20px", marginTop: 10 }}>
                    <span
                      style={{
                        fontSize: CHAT.fontSize,
                        lineHeight: `${CHAT.lineHeight}px`,
                        color: "#8FD8F6",
                        textDecoration: "underline",
                        textUnderlineOffset: 6,
                      }}
                    >
                      {m.text}
                    </span>
                  </div>
                  <Meta time={m.time!} out sentAt={m.at} right={26} bottom={14} />
                  <div
                    id="reaction-fire"
                    style={{
                      position: "absolute",
                      left: 28,
                      bottom: -22,
                      padding: "6px 16px",
                      borderRadius: 999,
                      backgroundColor: W.chrome,
                      border: `3px solid ${W.bg}`,
                      fontSize: 32,
                      lineHeight: "38px",
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
            <div key={m.id} id={m.id} style={wrapStyle}>
              <div
                style={{
                  ...bubbleBase,
                  maxWidth: CHAT.bubbleMaxW,
                  minWidth: m.minW,
                  padding: `${CHAT.padY}px ${CHAT.padX}px`,
                  fontSize: CHAT.fontSize,
                  lineHeight: `${CHAT.lineHeight}px`,
                }}
              >
                {!samePrev && <Tail side={isIn ? "left" : "right"} color={color} />}
                <span style={{ whiteSpace: "pre", letterSpacing: "-0.005em" }}>{m.text}</span>
                {/* Holds the last line open for the timestamp sitting on it. */}
                <span
                  style={{
                    display: "inline-block",
                    width: metaReserve(m.time!, !isIn),
                    height: 1,
                  }}
                />
                <Meta time={m.time!} out={!isIn} sentAt={m.at} />
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
              opacity: typing.opacity,
              transform: `scale(${typing.scale})`,
              transformOrigin: "left bottom",
            }}
          >
            <TypingDots />
          </div>
        )}
      </div>

      {/* ---------------- floating composer ---------------- */}
      <div
        id="composer"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: COMPOSER_BOTTOM,
          height: PILL_H,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "0 26px",
          opacity: chromeIn,
          transform: `translateY(${(1 - chromeIn) * 20}px)`,
        }}
      >
        <div
          id="composer-input"
          style={{
            flex: 1,
            height: PILL_H,
            borderRadius: PILL_H / 2,
            backgroundColor: W.field,
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "0 30px",
            overflow: "hidden",
            boxShadow: "0 10px 26px rgba(0,0,0,0.42)",
          }}
        >
          <Smile size={46} color={W.muted} strokeWidth={1.9} style={{ flexShrink: 0 }} />
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
              <span style={{ fontSize: 40, color: W.muted }}>Message</span>
            )}
          </div>
          <Paperclip
            size={44}
            color={W.muted}
            strokeWidth={1.9}
            style={{ flexShrink: 0, transform: "rotate(-45deg)" }}
          />
          {/* WhatsApp drops the camera shortcut the moment the field has text. */}
          <div
            style={{
              width: 44 * (1 - typingUI),
              opacity: 1 - typingUI,
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Camera size={44} color={W.muted} strokeWidth={1.9} style={{ flexShrink: 0 }} />
          </div>
        </div>

        <div
          id="composer-send"
          style={{
            position: "relative",
            width: PILL_H,
            height: PILL_H,
            borderRadius: PILL_H / 2,
            backgroundColor: W.accent,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 26px rgba(0,0,0,0.42)",
          }}
        >
          <Mic
            size={48}
            color="#0B141A"
            strokeWidth={2}
            style={{ position: "absolute", opacity: 1 - typingUI }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: typingUI,
              transform: `scale(${0.72 + typingUI * 0.28})`,
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#0B141A">
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
          backgroundColor: "rgba(233,237,239,0.34)",
          opacity: chromeIn,
        }}
      />
    </AbsoluteFill>
  );
}
