import {
  AbsoluteFill,
  Audio,
  Sequence,
  TextAnimation,
  Easing,
  interpolate,
  spring,
  springPresets,
  useCurrentFrame,
  useVideoConfig,
} from "@genmotion/motion";
import { ArrowUp, Globe, Plus } from "lucide-react";
import { AppCard } from "../components/AppCard";
import { Backdrop } from "../components/Backdrop";
import { c, font, soft, type } from "../components/brand";
import click from "../assets/mouse-click.mp3";

/** Handoff geometry — scene 02 opens on exactly this card. */
export const HERO_CARD = { w: 720, h: 420, radius: 30, seed: "hero" };

const PROMPT = "Build me a booking site for my bakery";
const TYPE_START = 12;
const CHARS_PER_FRAME = 0.85; // 37 chars land at ~frame 56
const PRESS = 60;

// The input is a UI mock-up, so the caret has to travel with the text as it is
// typed — that is the one thing the text catalog cannot express.
export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const typed = Math.max(
    0,
    Math.min(PROMPT.length, Math.floor((frame - TYPE_START) * CHARS_PER_FRAME)),
  );
  const typing = typed > 0 && typed < PROMPT.length;
  const filled = typed > 0;
  // Solid while typing, blinking once it rests, gone after the prompt is sent.
  const caret =
    frame > PRESS + 2 ? 0 : typing ? 1 : Math.floor(frame / 8) % 2 === 0 ? 1 : 0;

  const boxIn = spring({
    frame,
    fps,
    config: springPresets.gentle,
    durationInFrames: 14,
  });
  const boxOut = interpolate(frame, [66, 78], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const press = interpolate(frame, [PRESS, PRESS + 4, PRESS + 10], [0, 1, 0], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring = interpolate(frame, [PRESS, PRESS + 14], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sendOn = interpolate(frame, [TYPE_START, TYPE_START + 8], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const placeholder = interpolate(frame, [TYPE_START - 2, TYPE_START + 4], [1, 0], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardIn = spring({
    frame,
    fps,
    config: springPresets.gentle,
    delay: 70,
    durationInFrames: 26,
  });
  const build = interpolate(frame, [80, 112], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const chip: React.CSSProperties = {
    height: 60,
    borderRadius: 999,
    border: `1px solid ${c.line}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    color: c.muted,
    fontSize: 28,
    fontWeight: 500,
    flexShrink: 0,
  };

  return (
    <AbsoluteFill style={{ fontFamily: font }}>
      <Backdrop frame={frame} />

      {/* The click, landing on the frame the send button is pressed. */}
      <Sequence from={PRESS} durationInFrames={24}>
        <Audio src={click} volume={0.85} />
      </Sequence>

      <div
        id="eyebrow-idea"
        style={{
          position: "absolute",
          top: 306,
          left: 0,
          width: 1920,
          textAlign: "center",
          color: c.muted,
          ...type.eyebrow,
        }}
      >
        <TextAnimation
          text="Idea to app in seconds"
          by="word"
          preset="fadeUp"
          duration={10}
          stagger={2}
          exit={{ at: 62, duration: 8 }}
        />
      </div>

      {/* The Lovable prompt input, being typed into and then sent. */}
      <div
        id="prompt-line"
        style={{
          position: "absolute",
          left: 400,
          top: 404,
          width: 1120,
          padding: 40,
          boxSizing: "border-box",
          borderRadius: 34,
          background: c.white,
          border: `1px solid ${c.line}`,
          boxShadow: soft,
          display: "flex",
          flexDirection: "column",
          gap: 34,
          opacity: Math.min(1, boxIn * 2) * (1 - boxOut),
          transform: `translateY(${(1 - boxIn) * 28 + boxOut * -26}px) scale(${0.97 + boxIn * 0.03 - boxOut * 0.03})`,
        }}
      >
        <div
          style={{
            height: 116,
            display: "flex",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              fontSize: 44,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: c.ink,
            }}
          >
            <span>{PROMPT.slice(0, typed)}</span>
            <span
              style={{
                width: 4,
                height: 48,
                marginLeft: 5,
                borderRadius: 2,
                background: c.ink,
                opacity: caret,
              }}
            />
            {!filled && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  whiteSpace: "nowrap",
                  color: c.muted,
                  opacity: placeholder,
                }}
              >
                Ask Lovable to create a website…
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div id="prompt-attach" style={{ ...chip, width: 60 }}>
            <Plus size={28} color={c.muted} strokeWidth={1.75} />
          </div>
          <div id="prompt-visibility" style={{ ...chip, padding: "0 26px" }}>
            <Globe size={26} color={c.muted} strokeWidth={1.75} />
            <span>Public</span>
          </div>

          <div style={{ marginLeft: "auto", position: "relative" }}>
            <div
              id="prompt-send-ring"
              style={{
                position: "absolute",
                left: -6,
                top: -6,
                width: 72,
                height: 72,
                borderRadius: 999,
                border: `2px solid ${c.ink}`,
                opacity: ring > 0 ? (1 - ring) * 0.9 : 0,
                transform: `scale(${1 + ring * 0.8})`,
              }}
            />
            <div
              id="prompt-send"
              style={{
                width: 60,
                height: 60,
                borderRadius: 999,
                backgroundColor: sendOn > 0.5 ? c.ink : c.blockSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.45 + sendOn * 0.55,
                transform: `scale(${1 - press * 0.12})`,
                boxShadow:
                  sendOn > 0.5
                    ? `0 10px 24px rgba(27,27,27,${0.22 * sendOn})`
                    : "none",
              }}
            >
              <ArrowUp
                size={30}
                color={sendOn > 0.5 ? c.white : c.muted}
                strokeWidth={2}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Handoff element — survives the cut into scene 02, no exit. */}
      <div
        id="handoff-card"
        style={{
          position: "absolute",
          left: 960 - HERO_CARD.w / 2,
          top: 540 - HERO_CARD.h / 2,
          width: HERO_CARD.w,
          height: HERO_CARD.h,
          opacity: Math.min(1, cardIn * 2.2),
          transform: `translateY(${(1 - cardIn) * 320}px) scale(${0.94 + cardIn * 0.06})`,
        }}
      >
        <AppCard
          seed={HERO_CARD.seed}
          width={HERO_CARD.w}
          height={HERO_CARD.h}
          radius={HERO_CARD.radius}
          build={build}
        />
      </div>
    </AbsoluteFill>
  );
}
