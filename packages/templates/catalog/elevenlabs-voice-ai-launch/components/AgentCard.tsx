import React from "react";
import type { LucideIcon } from "lucide-react";
import { brand } from "./brand";

export const CARD = { w: 540, h: 300, gap: 50, radius: 28 };
// Centre card rectangle — the shared handoff geometry between scenes 08 and 09.
export const CENTER_CARD = { left: 960 - CARD.w / 2, top: 540 - CARD.h / 2 };

export const AGENT_GRADIENTS = {
  informational: "radial-gradient(500px 300px at 20% 15%, #7fb3c9 0%, transparent 65%), radial-gradient(500px 360px at 80% 90%, #7fa63a 0%, transparent 65%), linear-gradient(160deg, #4f8f8c 0%, #3d7a45 100%)",
  receptionist: "radial-gradient(400px 260px at 25% 80%, #9cc24a 0%, transparent 65%), radial-gradient(500px 360px at 85% 15%, #2d5a34 0%, transparent 65%), linear-gradient(160deg, #3f7a3a 0%, #5a9a3c 100%)",
  reservation: "radial-gradient(500px 300px at 15% 90%, #d8c63a 0%, transparent 65%), radial-gradient(500px 360px at 85% 10%, #8ab04a 0%, transparent 65%), linear-gradient(160deg, #a8b83a 0%, #b89a55 100%)",
} as const;

/** Mesh-gradient glass card for one agent type. */
export function AgentCard({
  icon: Icon,
  title,
  sub,
  gradient,
  textOpacity = 1,
  id,
  style,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  gradient: string;
  textOpacity?: number;
  id?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      id={id}
      style={{
        position: "absolute",
        width: CARD.w,
        height: CARD.h,
        borderRadius: CARD.radius,
        background: gradient,
        border: "1px solid rgba(255,255,255,0.28)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        fontFamily: brand.font,
        color: "#ffffff",
        ...style,
      }}
    >
      {/* dark scrim so the copy clears contrast on the bright meshes */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(420px 220px at 50% 55%, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.08) 100%)" }} />
      <div style={{ position: "relative", opacity: textOpacity, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={30} color="#fff" strokeWidth={1.6} />
        </div>
        <div style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.01em", marginTop: 6 }}>{title}</div>
        <div style={{ fontSize: 28, color: "#eef3ea" }}>{sub}</div>
      </div>
    </div>
  );
}
