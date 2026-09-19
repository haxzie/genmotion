import React from "react";
import { Img } from "@genmotion/motion";
import { brand } from "./brand";
import { bodyFont } from "./DmCard";
import { AVATARS } from "./MiniCard";

// The wide "rude reply" card (ref 15.5–18s and the card wall at 18–20s).
// 750×450: avatar, name skeleton, two-line reply, composer panel, footer.
export const RUDE_W = 750;
export const RUDE_H = 450;

export function RudeReply({ avatar = 0, lines = ["Go to hell.", "Kind regards"], style }: { avatar?: number; lines?: [string, string]; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: RUDE_W,
        height: RUDE_H,
        boxSizing: "border-box",
        padding: "44px 48px",
        borderRadius: 22,
        backgroundColor: brand.surface,
        boxShadow: brand.cardShadow,
        position: "relative",
        fontFamily: bodyFont,
        ...style,
      }}
    >
      <div style={{ position: "absolute", right: 44, top: 40, width: 22, height: 22 }}>
        <div style={{ position: "absolute", left: 10, top: -2, width: 2.5, height: 26, backgroundColor: "#d9d9d6", transform: "rotate(45deg)" }} />
        <div style={{ position: "absolute", left: 10, top: -2, width: 2.5, height: 26, backgroundColor: "#d9d9d6", transform: "rotate(-45deg)" }} />
      </div>
      <div style={{ display: "flex", gap: 22 }}>
        <Img src={AVATARS[avatar % AVATARS.length]} style={{ width: 62, height: 62, borderRadius: 31, flex: "none" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 21, lineHeight: 1.25, color: "#2b2b33", letterSpacing: "-0.01em" }}>
          <div style={{ width: 100, height: 8, borderRadius: 4, backgroundColor: "#e9e8e4", marginBottom: 2 }} />
          <div>{lines[0]}</div>
          <div>{lines[1]}</div>
        </div>
      </div>
      <div style={{ marginTop: 26, height: 156, borderRadius: 14, backgroundColor: "#f4f1ec" }} />
      <div style={{ marginTop: 26, display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: "#e4e4e1" }} />
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: 160, height: 44, borderRadius: 999, backgroundColor: "#e6e6e3", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: "#c9c9c6" }} />
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: 22 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#d6d6d3" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
