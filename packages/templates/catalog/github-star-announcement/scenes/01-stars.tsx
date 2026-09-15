import {
  AbsoluteFill,
  TextAnimation,
  CountText,
  Img,
  interpolate,
  random,
  Easing,
  useCurrentFrame,
  useWindowDuration,
} from "@genmotion/motion";
import { Star } from "lucide-react";
import { brand, STAR_COUNT } from "../components/brand";
import { AVATARS } from "../components/avatars";
import flame from "../assets/firecrawl-flame.png";

const COUNT_START = 12;
const COUNT_DUR = 120;
const LAND = COUNT_START + COUNT_DUR;

// One bubble per avatar. Launch times are spread across the count-up so the
// stream of faces tracks the number climbing.
const BUBBLES = AVATARS.map((src, i) => {
  const r = (k: string) => random(`bubble-${i}-${k}`);
  return {
    src,
    start: COUNT_START - 2 + (i / AVATARS.length) * 136 + r("s") * 10,
    dur: 64 + r("d") * 30,
    // 60% of bubbles rise up the sides so the copy column stays readable
    x: r("c") < 0.6 ? (r("side") < 0.5 ? 90 + r("x") * 470 : 1360 + r("x") * 470) : 90 + r("x") * 1740,
    size: 56 + r("z") * 52,
    sway: 14 + r("w") * 26,
    phase: r("p") * Math.PI * 2,
    freq: 0.07 + r("f") * 0.06,
  };
});

export default function Scene() {
  const frame = useCurrentFrame();
  const D = useWindowDuration();
  const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

  // top lockup: in at the start, survives the cut
  const lockIn = interpolate(frame, [0, 12], [0, 1], { easing: Easing.outSmooth, ...clamp });
  const breathe = 1 + Math.sin(frame / 14) * 0.015;

  // hero number: in, punch on landing, out before the end
  const heroIn = interpolate(frame, [COUNT_START - 6, COUNT_START + 6], [0, 1], { easing: Easing.outSmooth, ...clamp });
  const punch = interpolate(frame, [LAND, LAND + 5, LAND + 18], [1, 1.06, 1], { easing: Easing.outCubic, ...clamp });
  const heroOut = interpolate(frame, [D - 22, D - 10], [0, 1], { easing: Easing.inOutCubic, ...clamp });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, fontFamily: brand.font, overflow: "hidden" }}>

      {/* stargazer bubbles — behind the number */}
      <div id="bubbles" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {BUBBLES.map((b, i) => {
          const t = (frame - b.start) / b.dur;
          if (t <= 0 || t >= 1) return null;
          const y = interpolate(t, [0, 1], [1080 + b.size, 180], { easing: Easing.bezier(0.25, 0.55, 0.55, 1) });
          const x = b.x + Math.sin(frame * b.freq + b.phase) * b.sway;
          // fade in at the bottom edge, and dissolve before reaching the lockup band at the top
          const topFade = interpolate(y, [220, 360], [0, 1], clamp);
          const opacity = Math.min(t / 0.08, 1) * topFade;
          const scale = interpolate(t, [0, 0.14], [0.55, 1], { easing: Easing.outCubic, ...clamp });
          return (
            <div
              key={i}
              id={`stargazer-${i}`}
              style={{
                position: "absolute",
                left: x - b.size / 2,
                top: y - b.size / 2,
                width: b.size,
                height: b.size,
                borderRadius: "50%",
                overflow: "hidden",
                opacity,
                transform: `scale(${scale})`,
                border: "3px solid #ffffff",
                boxShadow: "0 12px 30px rgba(17,17,20,0.14)",
                backgroundColor: "#eaeaea",
              }}
            >
              <Img src={b.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          );
        })}
      </div>

      {/* top lockup: flame + repo name */}
      <div
        id="repo-lockup"
        style={{
          position: "absolute",
          top: 96,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 18,
          opacity: lockIn,
          transform: `translateY(${(1 - lockIn) * -30}px)`,
        }}
      >
        <Img id="flame-mark" src={flame} style={{ width: 84, height: 84, objectFit: "contain", transform: `scale(${breathe})` }} />
        <span id="repo-name" style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.02em", color: brand.text, lineHeight: 1 }}>
          firecrawl<span style={{ color: brand.muted, fontWeight: 400, margin: "0 6px" }}>/</span>firecrawl
        </span>
      </div>

      {/* hero number */}
      <div
        id="star-count"
        style={{
          position: "absolute",
          left: 0,
          width: "100%",
          top: 540,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 36,
          opacity: heroIn * (1 - heroOut),
          transform: `translateY(${(1 - heroIn) * 50 + heroOut * -60}px) scale(${(0.94 + 0.06 * heroIn) * punch})`,
          filter: `blur(${(1 - heroIn) * 10 + heroOut * 12}px)`,
          transformOrigin: "50% 0%",
          marginTop: -125,
        }}
      >
        <Star size={150} color={brand.orange} fill={brand.orange} strokeWidth={1.5} />
        <span style={{ fontSize: 250, fontWeight: 500, letterSpacing: "-0.04em", color: brand.text, lineHeight: 1 }}>
          <CountText to={STAR_COUNT} startFrom={COUNT_START} duration={COUNT_DUR} />
        </span>
      </div>

      <p
        id="supporting"
        style={{ position: "absolute", top: 700, left: 0, width: "100%", textAlign: "center", margin: 0, fontSize: 46, fontWeight: 400, color: brand.muted }}
      >
        <TextAnimation text="GitHub stars" preset="blurUp" startFrom={22} exit={{ at: D - 30, duration: 8 }} />
      </p>
    </AbsoluteFill>
  );
}
