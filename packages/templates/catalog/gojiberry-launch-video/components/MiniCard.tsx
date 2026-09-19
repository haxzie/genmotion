import React from "react";
import { Img } from "@genmotion/motion";
import { brand } from "./brand";
import a0 from "../assets/avatar-0.png";
import a1 from "../assets/avatar-1.png";
import a2 from "../assets/avatar-2.png";
import a3 from "../assets/avatar-3.png";
import a4 from "../assets/avatar-4.png";
import a5 from "../assets/avatar-5.png";

export const AVATARS = [a0, a1, a2, a3, a4, a5];

// The small "sent DM" card that litters the reference's card fields:
// avatar, two skeleton lines, a faint "Send" on the right. 450×120.
export const MINI_W = 450;
export const MINI_H = 120;

export function MiniCard({ avatar = 0, sendLabel = "Send", style }: { avatar?: number; sendLabel?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: MINI_W,
        height: MINI_H,
        boxSizing: "border-box",
        padding: "0 30px",
        borderRadius: 16,
        backgroundColor: brand.surface,
        boxShadow: "0 18px 40px rgba(30,20,20,0.10), 0 2px 6px rgba(30,20,20,0.05)",
        display: "flex",
        alignItems: "center",
        gap: 22,
        fontFamily: brand.font,
        ...style,
      }}
    >
      <div style={{ position: "relative", width: 64, height: 64, flex: "none" }}>
        <Img src={AVATARS[avatar % AVATARS.length]} style={{ width: 64, height: 64, borderRadius: 32, display: "block" }} />
        <div style={{ position: "absolute", right: 0, bottom: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: "#0f9d8a", border: "3px solid #fff" }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 120, height: 9, borderRadius: 5, backgroundColor: "#e6e5e1" }} />
        <div style={{ width: 210, height: 9, borderRadius: 5, backgroundColor: "#eeede9" }} />
      </div>
      <span style={{ fontSize: 20, color: "#c9c9c6", fontWeight: 500 }}>{sendLabel}</span>
    </div>
  );
}
