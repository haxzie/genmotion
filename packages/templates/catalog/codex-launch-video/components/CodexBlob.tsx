import React from "react";
import { C } from "./brand";

type Props = {
  size: number;
  /** 0..1 opacity of the ">_" terminal glyph */
  glyph?: number;
  /** 0..1 — morph of the glyph: 0 = two dots, 1 = ">_" */
  glyphMorph?: number;
  hue?: number;
  blur?: number;
  rotate?: number;
  id?: string;
  style?: React.CSSProperties;
};

// Seven-lobed "cloud" mark, drawn as a union of circles sharing one gradient.
const LOBES = Array.from({ length: 7 }, (_, i) => {
  const a = (i / 7) * Math.PI * 2 - Math.PI / 2 + 0.25;
  return { x: 100 + Math.cos(a) * 50, y: 100 + Math.sin(a) * 50 };
});

export function CodexBlob({ size, glyph = 0, glyphMorph = 1, hue = 0, blur = 0, rotate = 0, id, style }: Props) {
  const gid = React.useId().replace(/:/g, "");
  const m = glyphMorph;
  // chevron: from a dot (m=0) to ">" (m=1)
  const chev = `M ${78 - 4 * m} ${100 - 16 * m} L ${82 + 10 * m} ${100} L ${78 - 4 * m} ${100 + 16 * m}`;
  const under = `M ${108 - 2 * m} ${104 + 12 * m} L ${116 + 14 * m} ${104 + 12 * m}`;
  return (
    <svg
      id={id}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{
        display: "block",
        overflow: "visible",
        filter: `${hue ? `hue-rotate(${hue}deg) ` : ""}${blur ? `blur(${blur}px)` : ""}` || undefined,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        ...style,
      }}
    >
      <defs>
        <linearGradient id={`g${gid}`} gradientUnits="userSpaceOnUse" x1="30" y1="175" x2="170" y2="25">
          <stop offset="0" stopColor={C.g0} />
          <stop offset="0.5" stopColor={C.g1} />
          <stop offset="1" stopColor={C.g2} />
        </linearGradient>
      </defs>
      <g fill={`url(#g${gid})`}>
        <circle cx="100" cy="100" r="58" />
        {LOBES.map((l, i) => (
          <circle key={i} cx={l.x} cy={l.y} r="40" />
        ))}
      </g>
      {glyph > 0 && (
        <g stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={glyph}>
          <path d={chev} />
          <path d={under} />
        </g>
      )}
    </svg>
  );
}

/** White rounded-square app icon with the blob inside. */
export function CodexAppIcon({ size, id, style }: { size: number; id?: string; style?: React.CSSProperties }) {
  return (
    <div
      id={id}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 20px 60px rgba(40,30,120,0.25)",
        ...style,
      }}
    >
      <CodexBlob size={size * 0.62} glyph={1} />
    </div>
  );
}
