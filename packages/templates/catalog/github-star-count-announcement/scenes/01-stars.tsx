import {
  AbsoluteFill,
  Confetti,
  CountText,
  Easing,
  Img,
  TextAnimation,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { Star } from "lucide-react";
import { brand, grid, repo } from "../components/brand";
import { GridBackdrop } from "../components/GridBackdrop";
import { StarHistoryChart } from "../components/StarHistoryChart";
import firecrawlMark from "../assets/firecrawl-mark.svg";
import githubMark from "../assets/github-mark-dark.svg";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Saturated enough to read against warm paper — no pale tints. */
const POPPER_COLORS = [
  brand.flame,
  brand.flameDeep,
  "#FF8A3D",
  "#F0B429",
  "#1C1917",
  "#B45309",
];

const COUNT_FROM = 22;
const COUNT_DUR = 210; // lands on frame 232
const COUNT_END = COUNT_FROM + COUNT_DUR;

export default function Scene() {
  const frame = useCurrentFrame();

  /** The count's own eased progress — drives scale, glow and the chart alike. */
  const p = interpolate(frame, [COUNT_FROM, COUNT_END], [0, 1], {
    easing: Easing.outCubic,
    ...CLAMP,
  });

  // Counter entrance (16 → 30) and exit (336 → 350).
  const inP = interpolate(frame, [16, 30], [0, 1], {
    easing: Easing.outCubic,
    ...CLAMP,
  });
  const outP = interpolate(frame, [336, 350], [0, 1], {
    easing: Easing.inOutCubic,
    ...CLAMP,
  });

  // Ambient: the number keeps breathing after it lands, so the held frame
  // never reads as frozen.
  const breathe = Math.sin(((frame - COUNT_END) / 34) * Math.PI) * 0.004;

  const scale =
    (0.9 + p * 0.1 + (frame > COUNT_END ? breathe : 0)) * (1 - outP * 0.04);
  const opacity = inP * (1 - outP);
  const blur = (1 - inP) * 14 + outP * 16;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper, fontFamily: brand.font }}>
      <GridBackdrop />

      {/* ── header band ─────────────────────────────────────────────── */}
      <div
        id="header-repo"
        style={{
          position: "absolute",
          left: grid.margin + 32,
          top: 88,
          height: grid.headerRule - 88,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <Img
          src={firecrawlMark}
          style={{
            width: 34,
            height: 46,
            objectFit: "contain",
            opacity: interpolate(frame, [8, 22], [0, 1], CLAMP) * (1 - interpolate(frame, [316, 326], [0, 1], CLAMP)),
          }}
        />
        <span
          style={{
            fontFamily: brand.mono,
            fontSize: 34,
            color: brand.ink,
            letterSpacing: "-0.01em",
          }}
        >
          <TextAnimation
            text={repo.name}
            by="char"
            preset="riseMask"
            startFrom={10}
            stagger={1}
            duration={10}
            exit={{ at: 316, duration: 8 }}
          />
        </span>
      </div>

      <div
        id="header-source"
        style={{
          position: "absolute",
          right: grid.margin + 32,
          top: 88,
          height: grid.headerRule - 88,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Img
          src={githubMark}
          style={{
            width: 30,
            height: 30,
            objectFit: "contain",
            opacity:
              interpolate(frame, [14, 26], [0, 1], CLAMP) *
              (1 - interpolate(frame, [316, 326], [0, 1], CLAMP)),
          }}
        />
        <span
          style={{
            fontSize: 28,
            color: brand.inkMuted,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
          }}
        >
          <TextAnimation
            text="Stargazers"
            by="char"
            preset="fadeIn"
            startFrom={16}
            stagger={1}
            duration={8}
            exit={{ at: 316, duration: 8 }}
          />
        </span>
      </div>

      {/* ── the chart, growing along the floor ──────────────────────── */}
      <StarHistoryChart startFrom={COUNT_FROM} duration={COUNT_DUR} />

      {/* ── eyebrow ─────────────────────────────────────────────────── */}
      <div
        id="counter-eyebrow"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 272,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            opacity:
              interpolate(frame, [18, 30], [0, 1], CLAMP) *
              (1 - interpolate(frame, [320, 330], [0, 1], CLAMP)),
            display: "flex",
            alignItems: "center",
          }}
        >
          <Star size={26} color={brand.flame} fill={brand.flame} strokeWidth={1.5} />
        </div>
        <span
          style={{
            fontSize: 28,
            color: brand.inkMuted,
            textTransform: "uppercase",
            letterSpacing: "0.24em",
          }}
        >
          <TextAnimation
            text="Total stars"
            by="char"
            preset="fadeIn"
            startFrom={18}
            stagger={1}
            duration={8}
            exit={{ at: 320, duration: 8 }}
          />
        </span>
      </div>

      {/* ── measurement brackets around the counter block ───────────── */}
      <CounterBrackets opacity={opacity} />

      {/* ── the counter ─────────────────────────────────────────────── */}
      <div
        id="star-counter"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 368,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            fontSize: 264,
            fontWeight: 500,
            letterSpacing: "-0.045em",
            color: brand.ink,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            opacity,
            filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
            transform: `translateY(${(1 - inP) * 44 - outP * 40}px) scale(${scale})`,
          }}
        >
          <CountText
            to={repo.stars}
            from={0}
            startFrom={COUNT_FROM}
            duration={COUNT_DUR}
            locale="en-US"
          />
        </div>
      </div>

      {/* ── party poppers, fired the moment the count lands ─────────── */}
      <Confetti
        startFrom={COUNT_END - 2}
        duration={96}
        count={90}
        origin={{ x: 0.03, y: 1 }}
        angle={62}
        spread={52}
        power={26}
        colors={POPPER_COLORS}
        seed="left-popper"
      />
      <Confetti
        startFrom={COUNT_END + 2}
        duration={96}
        count={90}
        origin={{ x: 0.97, y: 1 }}
        angle={118}
        spread={52}
        power={26}
        colors={POPPER_COLORS}
        seed="right-popper"
      />
    </AbsoluteFill>
  );
}

/**
 * Four L-brackets measuring out the counter's cell — the blueprint tell that
 * everything in the frame is packed into the grid.
 */
function CounterBrackets({ opacity }: { opacity: number }) {
  const frame = useCurrentFrame();
  const box = { left: 310, top: 322, width: 1300, height: 372 };
  const arm = 44;

  const corners = [
    { x: box.left, y: box.top, sx: 1, sy: 1 },
    { x: box.left + box.width, y: box.top, sx: -1, sy: 1 },
    { x: box.left, y: box.top + box.height, sx: 1, sy: -1 },
    { x: box.left + box.width, y: box.top + box.height, sx: -1, sy: -1 },
  ];

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {corners.map((c, i) => {
        const p = interpolate(frame, [24 + i * 2, 40 + i * 2], [0, 1], {
          easing: Easing.outQuart,
          ...CLAMP,
        });
        return (
          <div
            key={`br-${i}`}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y,
              opacity: p * opacity * 0.9,
              transform: `scale(${c.sx}, ${c.sy})`,
              transformOrigin: "left top",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: arm * p,
                height: 1,
                backgroundColor: brand.rule,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: arm * p,
                width: 1,
                backgroundColor: brand.rule,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
