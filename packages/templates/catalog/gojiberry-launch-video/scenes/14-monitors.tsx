import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, random } from "@genmotion/motion";
import { Bot } from "lucide-react";
import { brand, orangeText } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";

// Scene 14 — ref 38.2–40.4s (66f). A tilted analytics panel rises from
// the bottom (stat tiles + a three-line chart that draws itself) with an
// "AI Agent · Active" card hovering over it; "It then monitors buying
// signals in real time" types above. Panel drops away at the end.

const STATS = ["6", "582", "235", "98", "$782"];
const LINES = [
  { color: "#22c8a0", seed: "a" },
  { color: "#9b5cf6", seed: "b" },
  { color: "#ec4899", seed: "c" },
];

function wavePath(seed: string, w: number, h: number) {
  const n = 12;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    const y = h * 0.5 + Math.sin(i * 1.1 + random(seed) * 6) * h * 0.3 + (random(`${seed}-${i}`) - 0.5) * h * 0.3;
    pts.push([x, y]);
  }
  // smooth: cubic segments with horizontal tangents at each sample
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

export default function Scene() {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [3, 21], [1000, 0], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const draw = interpolate(frame, [21, 57], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = interpolate(frame, [21, 60], [0, -30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [60, 66], [0, 1], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const agentIn = interpolate(frame, [15, 27], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hover = Math.sin(frame / 18) * 6;

  const PANEL_W = 2200;
  const PANEL_H = 1500;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground bloom={1} />

      <div style={{ position: "absolute", inset: 0, perspective: 2200, perspectiveOrigin: "50% 30%", opacity: 1 - exit, filter: exit > 0 ? `blur(${exit * 12}px)` : undefined }}>
        <div
          id="dashboard"
          style={{
            position: "absolute",
            left: -260,
            top: 420 + rise + drift + exit * 600,
            width: PANEL_W,
            height: PANEL_H,
            borderRadius: 40,
            backgroundColor: "#f5f6f8",
            boxShadow: "0 60px 120px rgba(60,30,30,0.16)",
            transform: "rotateX(42deg) rotateZ(-12deg)",
            transformOrigin: "50% 0%",
            padding: 60,
            boxSizing: "border-box",
            fontFamily: brand.font,
          }}
        >
          <div style={{ display: "flex", gap: 40 }}>
            {STATS.map((s, i) => {
              const p = interpolate(frame, [18 + i * 3, 30 + i * 3], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{ width: 300, height: 190, borderRadius: 24, backgroundColor: "#fff", boxShadow: "0 12px 30px rgba(60,30,30,0.06)", padding: "34px 40px", boxSizing: "border-box", opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
                  <div style={{ fontSize: 40, fontWeight: 500, color: brand.text }}>{s}</div>
                  <div style={{ marginTop: 22, width: 170, height: 12, borderRadius: 6, background: "linear-gradient(90deg, #2d2f36, #d9dbe0)" }} />
                  <div style={{ marginTop: 14, width: 120, height: 12, borderRadius: 6, background: "linear-gradient(90deg, #6b6f7a, #e4e6ea)" }} />
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 60, display: "flex", gap: 50, alignItems: "center" }}>
            {LINES.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: l.color }} />
                <div style={{ width: 150, height: 10, borderRadius: 5, background: "linear-gradient(90deg, #2d2f36, #d9dbe0)" }} />
              </div>
            ))}
          </div>
          <svg width={1700} height={520} style={{ marginTop: 40, overflow: "visible" }}>
            {LINES.map((l, i) => (
              <path key={i} d={wavePath(l.seed, 1700, 480)} fill="none" stroke={l.color} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            ))}
          </svg>
        </div>

        {/* AI Agent card hovering above the panel */}
        <div
          id="ai-agent-card"
          style={{
            position: "absolute",
            left: 760,
            top: 340 + rise * 0.8 + drift + hover + exit * 400,
            width: 800,
            height: 270,
            borderRadius: 26,
            backgroundColor: "#fff",
            boxShadow: "0 40px 80px rgba(60,30,30,0.16)",
            transform: `rotateX(42deg) rotateZ(-12deg) scale(${agentIn})`,
            transformOrigin: "50% 50%",
            padding: "34px 40px",
            boxSizing: "border-box",
            fontFamily: brand.font,
            display: "flex",
            gap: 30,
          }}
        >
          <div style={{ width: 92, height: 92, borderRadius: 20, backgroundColor: "#f1f2f5", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <Bot size={44} color="#4b4f5a" strokeWidth={1.8} />
            <div style={{ position: "absolute", right: -10, top: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: "#22c55e", boxShadow: "0 0 18px rgba(34,197,94,0.7)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <span style={{ fontSize: 40, fontWeight: 500, color: brand.text }}>AI Agent</span>
              <span style={{ fontSize: 30, fontWeight: 500, color: "#1e9e5a", backgroundColor: "#e5f8ec", padding: "4px 18px", borderRadius: 10 }}>Active</span>
            </div>
            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              {[560, 620, 500].map((w, i) => (
                <div key={i} style={{ width: w, height: 12, borderRadius: 6, backgroundColor: "#ececee" }} />
              ))}
            </div>
            <div style={{ position: "absolute", left: 40, bottom: 34, display: "flex", gap: 8 }}>
              {["#f97316", "#f97316", "#f97316"].map((c, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c, opacity: 0.5 + ((Math.floor(frame / 6) + i) % 3) * 0.25 }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", top: 90, left: 0, width: 1920, display: "flex", justifyContent: "center", opacity: 1 - exit }}>
        <TypeLine id="monitors-line" segments={[{ text: "It then monitors buying signals " }]} startFrom={0} each={5} duration={8} style={{ fontSize: 60 }} />
        <TypeLine id="monitors-line-2" segments={[{ text: "in real time", style: orangeText }]} startFrom={33} each={5} duration={8} style={{ fontSize: 60 }} />
      </div>
    </AbsoluteFill>
  );
}
