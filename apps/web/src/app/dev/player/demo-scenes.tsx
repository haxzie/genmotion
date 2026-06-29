"use client";

import {
  AbsoluteFill,
  Easing,
  TextAnimation,
  interpolate,
  random,
  spring,
  springPresets,
  stagger,
  useCurrentFrame,
  useGsapTimeline,
  useVideoConfig,
  gsap,
} from "@genmotion/motion";
import type { CompiledScene } from "@genmotion/player";

/** Scene 1 — springs, interpolate, TextAnimation. */
function IntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeScale = spring({ frame, fps, config: springPresets.bouncy });
  const cardY = spring({ frame, fps, delay: 8, config: springPresets.default });
  const glow = interpolate(frame, [0, 60, 120], [0.2, 0.6, 0.2], {
    easing: Easing.inOutCubic,
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(1200px 800px at 50% 30%, #16182c 0%, #0a0a0c 70%)",
        gap: 32,
      }}
    >
      <div
        style={{
          transform: `scale(${badgeScale})`,
          background: "rgba(94,106,210,0.15)",
          border: "1px solid rgba(94,106,210,0.4)",
          color: "#aab2ff",
          borderRadius: 999,
          padding: "12px 32px",
          fontSize: 28,
          fontFamily: "Inter, sans-serif",
          boxShadow: `0 0 ${glow * 120}px rgba(94,106,210,${glow})`,
        }}
      >
        Introducing
      </div>
      <div
        style={{
          transform: `translateY(${(1 - cardY) * 80}px)`,
          opacity: cardY,
          fontSize: 140,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#ededef",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <TextAnimation text="GenMotion" by="char" preset="fadeUp" stagger={3} />
      </div>
      <div
        style={{
          fontSize: 36,
          color: "#8a8a93",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <TextAnimation
          text="Videos, written by AI"
          by="word"
          preset="blurIn"
          startFrom={30}
        />
      </div>
    </AbsoluteFill>
  );
}

/** Scene 2 — GSAP timeline driven deterministically by the frame clock. */
function GsapScene() {
  const ref = useGsapTimeline<HTMLDivElement>((container) => {
    const tl = gsap.timeline();
    const cards = container.querySelectorAll(".card");
    tl.from(cards, {
      y: 400,
      rotation: (i) => (i - 1) * 12,
      opacity: 0,
      stagger: 0.12,
      duration: 0.9,
      ease: "power4.out",
    });
    tl.to(
      cards,
      { y: -30, stagger: 0.1, duration: 0.5, ease: "power2.inOut", yoyo: true, repeat: 1 },
      "+=0.4",
    );
    tl.from(
      container.querySelector(".caption"),
      { opacity: 0, y: 40, duration: 0.6, ease: "power3.out" },
      "-=1.2",
    );
    return tl;
  });

  return (
    <AbsoluteFill style={{ background: "#0c0e1a" }}>
      <div
        ref={ref}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 64,
        }}
      >
        <div style={{ display: "flex", gap: 40 }}>
          {["#5e6ad2", "#4cb782", "#f2c94c"].map((color, i) => (
            <div
              key={i}
              className="card"
              style={{
                width: 280,
                height: 380,
                borderRadius: 24,
                background: `linear-gradient(160deg, ${color} 0%, #16161c 120%)`,
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
        <div
          className="caption"
          style={{
            fontSize: 44,
            color: "#ededef",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
          }}
        >
          Animated with GSAP, frame-perfect
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Scene 3 — staggered grid + deterministic randomness. */
function GridScene() {
  const frame = useCurrentFrame();
  const cols = 12;
  const rows = 7;

  return (
    <AbsoluteFill style={{ background: "#0a0a0c" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 110px)`,
          gap: 18,
        }}
      >
        {Array.from({ length: cols * rows }, (_, i) => {
          const wave = stagger({
            frame,
            index: Math.floor(i / cols) + (i % cols),
            each: 2,
            duration: 24,
            easing: Easing.outSmooth,
          });
          const hue = 230 + random(`cell-${i}`) * 60;
          return (
            <div
              key={i}
              style={{
                width: 110,
                height: 110,
                borderRadius: 14,
                background: `hsl(${hue} 60% ${20 + wave * 35}%)`,
                transform: `scale(${0.3 + wave * 0.7})`,
                opacity: wave,
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 80,
          fontSize: 40,
          color: "#ededef",
          fontFamily: "Inter, sans-serif",
          fontWeight: 600,
          opacity: interpolate(frame, [30, 50], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Deterministic, every single frame
      </div>
    </AbsoluteFill>
  );
}

export const demoScenes: CompiledScene[] = [
  { id: "intro", name: "Intro", durationInFrames: 120, component: IntroScene },
  { id: "gsap", name: "GSAP Cards", durationInFrames: 150, component: GsapScene },
  { id: "grid", name: "Grid", durationInFrames: 120, component: GridScene },
];
