import React from "react";
import { interpolate } from "@genmotion/motion";
import { Phone } from "lucide-react";
import { brand } from "./brand";
import { Dither } from "./Dither";

const BODY = "linear-gradient(160deg, #2c2c30 0%, #121214 55%, #1c1c1f 100%)";
const SHADOW = "0 50px 90px rgba(0,25,50,0.4), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.6)";

function Keypad({ cols = 3, rows = 4, size = 34, gap = 10 }: { cols?: number; rows?: number; size?: number; gap?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap }}>
      {Array.from({ length: cols * rows }, (_, i) => (
        <div key={i} style={{ width: size, height: size * 0.62, borderRadius: 6, background: "linear-gradient(180deg, #3a3a3f, #232326)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 3px rgba(0,0,0,0.5)" }} />
      ))}
    </div>
  );
}

function Handset({ ring, height = 300 }: { ring: number; height?: number }) {
  return (
    <div style={{ position: "relative", width: 96, height, transform: `translateY(${ring}px) rotate(${ring * 0.4}deg)` }}>
      <div style={{ position: "absolute", left: 22, top: 24, width: 52, height: height - 48, borderRadius: 26, background: BODY, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 96, height: 62, borderRadius: 31, background: BODY, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} />
      <div style={{ position: "absolute", left: 0, bottom: 0, width: 96, height: 62, borderRadius: 31, background: BODY, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} />
    </div>
  );
}

/** Classic corded office phone in a front three-quarter view: thick wedge body, raised handset on the left. */
export function DeskPhone({ frame }: { frame: number }) {
  const ring = Math.sin(frame * 1.3) * 2;
  return (
    <div id="desk-phone" style={{ position: "absolute", left: 620, top: 330, width: 720, height: 420, transform: `translateY(${Math.sin(frame * 0.07) * 6}px)` }}>
      {/* wedge thickness */}
      <div style={{ position: "absolute", left: 130, top: 130, width: 580, height: 260, borderRadius: 30, background: "linear-gradient(180deg, #0c0c0d, #050506)", transform: "skewX(-8deg)", boxShadow: "0 60px 90px rgba(0,25,50,0.45)" }} />
      {/* top face */}
      <div style={{ position: "absolute", left: 150, top: 100, width: 580, height: 260, borderRadius: 30, background: BODY, transform: "skewX(-8deg)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)" }}>
        <div style={{ position: "absolute", left: 140, top: 28, width: 300, height: 90, borderRadius: 10, background: "linear-gradient(180deg, #0b0b0d, #17181b)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", left: 300, top: 140 }}><Keypad size={32} gap={9} /></div>
        <div style={{ position: "absolute", left: 150, top: 140 }}><Keypad cols={2} rows={4} size={40} gap={9} /></div>
      </div>
      {/* raised handset */}
      <div style={{ position: "absolute", left: 60, top: 20, filter: "drop-shadow(0 30px 24px rgba(0,0,0,0.45))" }}><Handset ring={ring} height={330} /></div>
      {/* coiled cord */}
      <div style={{ position: "absolute", left: 40, top: 330, width: 240, height: 70, borderBottom: "6px dotted #1a1a1d", borderRadius: "0 0 140px 140px", opacity: 0.9 }} />
    </div>
  );
}

/** Video desk phone — the corded body plus a raised screen showing the clock. */
export function VideoPhone({ frame }: { frame: number }) {
  const ring = Math.sin(frame * 1.3) * 2;
  return (
    <div id="video-phone" style={{ position: "absolute", left: 640, top: 320, width: 720, height: 420, transform: `perspective(1400px) rotateX(20deg) rotateY(-14deg) translateY(${Math.sin(frame * 0.07) * 6}px)`, transformStyle: "preserve-3d" }}>
      <div style={{ position: "absolute", left: 120, top: 150, width: 600, height: 270, borderRadius: 26, background: BODY, boxShadow: SHADOW }}>
        <div style={{ position: "absolute", left: 300, top: 110 }}><Keypad /></div>
        <div style={{ position: "absolute", left: 130, top: 110 }}><Keypad cols={2} rows={4} size={40} /></div>
      </div>
      <div style={{ position: "absolute", left: 220, top: 0, width: 400, height: 240, borderRadius: 18, background: "linear-gradient(180deg, #1a1a1e, #0a0a0c)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 30px 60px rgba(0,0,0,0.45)", transform: "rotateX(-12deg)", transformOrigin: "bottom" }}>
        <div style={{ position: "absolute", inset: 14, borderRadius: 12, background: "radial-gradient(500px 300px at 30% 20%, #2a4d78 0%, #0e1a2e 70%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: brand.font, color: "#fff" }}>
          <div style={{ fontSize: 48, fontWeight: 500, letterSpacing: "-0.02em" }}>20:36</div>
          <div style={{ marginTop: 8, display: "flex", gap: 14 }}>
            {["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"].map((c) => (
              <div key={c} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c, opacity: 0.9 }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 40, top: 120 }}><Handset ring={ring} height={290} /></div>
      <div style={{ position: "absolute", left: 60, top: 390, width: 220, height: 80, borderBottom: "6px dotted #1a1a1d", borderRadius: "0 0 120px 120px", opacity: 0.9 }} />
    </div>
  );
}

/** Smartphone, tilted, with the green answer button pulsing. */
export function SmartPhone({ frame }: { frame: number }) {
  const pulse = interpolate(Math.sin(frame * 0.25), [-1, 1], [0.86, 1]);
  const shake = Math.sin(frame * 1.4) * 1.6;
  return (
    <div
      id="smartphone"
      style={{ position: "absolute", left: 760, top: 250, width: 300, height: 600, transform: `translateY(${Math.sin(frame * 0.07) * 8}px) rotate(${-8 + shake}deg)`, borderRadius: 48, background: BODY, boxShadow: SHADOW }}
    >
      <div style={{ position: "absolute", inset: 12, borderRadius: 38, backgroundColor: "#050506", border: "1px solid rgba(255,255,255,0.06)" }} />
      <div style={{ position: "absolute", top: 26, left: "50%", width: 80, height: 22, marginLeft: -40, borderRadius: 11, backgroundColor: "#000" }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -36, marginTop: -36, width: 72, height: 72, borderRadius: 36, backgroundColor: "#2fbf5a", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pulse})` }}>
        <Phone size={34} color="#fff" fill="#fff" strokeWidth={0} />
      </div>
    </div>
  );
}

/** Blue dither field + the glass "INCOMING CALL" pill; the device goes in as children. */
export function IncomingField({ frame, pill, children }: { frame: number; pill: { x: number; y: number }; children?: React.ReactNode }) {
  const floatY = Math.sin(frame * 0.07) * 5;
  return (
    <Dither frame={frame} gradient={brand.ditherBlue} pitch={8} dot={3.6}>
      {children}
      <div
        id="incoming-pill"
        style={{
          position: "absolute",
          left: pill.x,
          top: pill.y,
          transform: `translateY(${floatY}px)`,
          padding: "14px 30px",
          borderRadius: 999,
          backgroundColor: "rgba(20,40,70,0.55)",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow: "0 20px 50px rgba(0,20,50,0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
          color: "#ffffff",
          fontFamily: brand.font,
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
          opacity: interpolate(Math.sin(frame * 0.3), [-1, 1], [0.8, 1]),
        }}
      >
        INCOMING CALL
      </div>
    </Dither>
  );
}

/** Glass "INCOMING CALL" pill as a standalone DOM element that pops in/out with a beat. */
export function IncomingPill({ frame, at = 0, until, x, y }: { frame: number; at?: number; until?: number; x: number; y: number }) {
  const inP = interpolate(frame, [at, at + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outP = until === undefined ? 0 : interpolate(frame, [until - 5, until], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vis = inP * (1 - outP);
  if (vis <= 0) return null;
  const floatY = Math.sin(frame * 0.07) * 5;
  return (
    <div
      id="incoming-pill"
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateY(${floatY}px) scale(${0.92 + vis * 0.08})`,
        opacity: vis,
        padding: "14px 30px",
        borderRadius: 999,
        backgroundColor: "rgba(20,40,70,0.55)",
        border: "1px solid rgba(255,255,255,0.35)",
        boxShadow: "0 20px 50px rgba(0,20,50,0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
        color: "#ffffff",
        fontFamily: brand.font,
        fontSize: 30,
        fontWeight: 500,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      INCOMING CALL
    </div>
  );
}
