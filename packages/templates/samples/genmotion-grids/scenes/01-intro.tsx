import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "@genmotion/motion";
import { BRAND, ICONS } from "../components/brand";
import { PixelBitmap } from "../components/PixelBitmap";
import { TileRoller, buildDeck, unitFor } from "../components/TileRoller";
import logo from "../assets/genmotion-logo.png";

const COLS = 9;

/** The wordmark gets its own merged cell: row 4, columns 6 through 8. */
const MERGE = { row: 4, fromCol: 6, toCol: 8 };

/** Grid rules are a dotted pattern: a DOT-square mark every DOT_PERIOD px. */
const DOT = 3;
const DOT_PERIOD = 16;
/** Two hard stops — a repeating stencil, not a blend. */
const dots = (dir: string) =>
  `repeating-linear-gradient(${dir}, ${BRAND.line} 0 ${DOT}px, transparent ${DOT}px ${DOT_PERIOD}px)`;

/** The diagonal staircase of animated cells, bottom-left to top-right. */
const STAIRS: { row: number; col: number; offset: number; dir: 1 | -1 }[] = [
  { row: 3, col: 1, offset: 0, dir: -1 },
  { row: 3, col: 2, offset: 3, dir: 1 },
  { row: 2, col: 3, offset: 6, dir: -1 },
  { row: 2, col: 4, offset: 9, dir: 1 },
  { row: 2, col: 5, offset: 12, dir: 1 },
  { row: 1, col: 6, offset: 15, dir: -1 },
  { row: 1, col: 7, offset: 18, dir: 1 },
];

export default function Scene() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const size = width / COLS;
  const rows = Math.ceil(height / size);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, overflow: "hidden" }}>
      {/* ---- grid rules ---- */}
      {/* The wordmark lives in a merged cell spanning cols 6-8 of row 4, so the
          two interior verticals are drawn as segments that skip that band. */}
      <div id="grid-rules" style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: COLS }, (_, c) => {
          const merged = c > MERGE.fromCol && c <= MERGE.toCol;
          const bands = merged
            ? [
                { top: 0, height: MERGE.row * size },
                { top: (MERGE.row + 1) * size, height: height - (MERGE.row + 1) * size },
              ]
            : [{ top: 0, height }];
          return bands.map((b, i) => (
            <div
              key={`v${c}-${i}`}
              style={{
                position: "absolute",
                left: c * size,
                top: b.top,
                width: DOT,
                height: b.height,
                backgroundImage: dots("to bottom"),
                backgroundSize: `${DOT}px ${DOT_PERIOD}px`,
              }}
            />
          ));
        })}
        {Array.from({ length: rows + 1 }, (_, r) => (
          <div
            key={`h${r}`}
            style={{
              position: "absolute",
              left: 0,
              top: r * size,
              width: "100%",
              height: DOT,
              backgroundImage: dots("to right"),
              backgroundSize: `${DOT_PERIOD}px ${DOT}px`,
            }}
          />
        ))}
      </div>

      {/* ---- fixed anchor tiles: the two pinwheel marks ---- */}
      <AnchorTile
        id="anchor-logo-top"
        left={8 * size}
        top={0}
        size={size}
        bg={BRAND.teal}
        ink={BRAND.graphite}
        delay={2}
      />
      <AnchorTile
        id="anchor-logo-bottom"
        left={0}
        top={4 * size}
        size={size}
        bg={BRAND.lime}
        ink={BRAND.graphite}
        delay={8}
      />

      {/* ---- the rolling staircase ---- */}
      {STAIRS.map((s) => (
        <TileRoller
          key={`${s.row}-${s.col}`}
          id={`tile-${s.row}-${s.col}`}
          deck={buildDeck(`cell-${s.row}-${s.col}`, 6)}
          offset={s.offset}
          dir={s.dir}
          size={size}
          left={s.col * size}
          top={s.row * size}
        />
      ))}

      {/* ---- wordmark lockup, centred in its merged cell ---- */}
      <Wordmark
        frame={frame}
        left={MERGE.fromCol * size}
        top={MERGE.row * size}
        width={(MERGE.toCol - MERGE.fromCol + 1) * size}
        height={size}
      />
    </AbsoluteFill>
  );
}

function AnchorTile({
  id,
  left,
  top,
  size,
  bg,
  ink,
  delay,
}: {
  id: string;
  left: number;
  top: number;
  size: number;
  bg: string;
  ink: string;
  delay: number;
}) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 14], [0, 1], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      id={id}
      style={{ position: "absolute", left, top, width: size, height: size, overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(${(1 - p) * size}px)`,
        }}
      >
        <PixelBitmap bitmap={ICONS.logo} unit={unitFor(ICONS.logo)} ink={ink} />
      </div>
    </div>
  );
}

function Wordmark({
  frame,
  left,
  top,
  width,
  height,
}: {
  frame: number;
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  const p = interpolate(frame, [14, 36], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      id="wordmark"
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        opacity: p,
        transform: `translateY(${(1 - p) * 22}px)`,
      }}
    >
      <Img
        id="wordmark-mark"
        src={logo}
        style={{ width: 104, height: 104, objectFit: "contain", display: "block" }}
      />
      <span
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 92,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: BRAND.ink,
          lineHeight: 1,
        }}
      >
        GenMotion
      </span>
    </div>
  );
}
