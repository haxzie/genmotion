import React from "react";
import { Img } from "@genmotion/motion";
import { brand } from "./brand";
import ethan from "../assets/avatar-2.png";

// The LinkedIn composer card, measured off the reference (484×464 @720p → 726×696).
export const DM_W = 726;
export const DM_H = 696;
export const DM_PAD = 58;
export const SEND_W = 155;
export const SEND_H = 51;
export const SEND_LEFT = 446; // from card left
export const SEND_TOP = 616; // from card top

export const DM_MESSAGE = "Dear Ethan Carter,\n\nI'm about to send you a LinkedIn message you didn't ask for.\n\nIf now is a bad time, I fully deserve to be ignored 😅\n\nBut if you need more clients I can make a call with you.";

export const bodyFont = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

type Props = {
  chars?: number; // how many characters of the message are visible (default all)
  sent?: boolean;
  avatar?: string;
  scale?: number;
  press?: number; // 0..1 send-button press
  hideSend?: boolean;
  caret?: boolean;
  style?: React.CSSProperties;
};

export function DmCard({ chars, sent = false, avatar = ethan, press = 0, hideSend = false, caret = false, style }: Props) {
  const text = chars === undefined ? DM_MESSAGE : DM_MESSAGE.slice(0, Math.max(0, chars));
  return (
    <div
      style={{
        width: DM_W,
        height: DM_H,
        boxSizing: "border-box",
        padding: DM_PAD,
        borderRadius: 24,
        backgroundColor: brand.surface,
        boxShadow: brand.cardShadow,
        position: "relative",
        fontFamily: bodyFont,
        ...style,
      }}
    >
      {/* close */}
      <div style={{ position: "absolute", right: 56, top: 48, width: 26, height: 26 }}>
        <div style={{ position: "absolute", left: 12, top: -2, width: 2.5, height: 30, backgroundColor: "#d3d3d0", transform: "rotate(45deg)" }} />
        <div style={{ position: "absolute", left: 12, top: -2, width: 2.5, height: 30, backgroundColor: "#d3d3d0", transform: "rotate(-45deg)" }} />
      </div>

      {/* avatar */}
      <div style={{ position: "relative", width: 100, height: 100 }}>
        <Img src={avatar} style={{ width: 100, height: 100, borderRadius: 50, display: "block" }} />
        <div style={{ position: "absolute", right: -2, bottom: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: "#0f9d8a", border: "3px solid #fff" }} />
      </div>

      {/* name skeleton */}
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ width: 180, height: 12, borderRadius: 6, background: "linear-gradient(90deg, #e6e5e1 0%, #f3f2ef 100%)" }} />
        <div style={{ width: 380, height: 12, borderRadius: 6, background: "linear-gradient(90deg, #e9e8e4 0%, #f7f6f3 100%)" }} />
      </div>

      {/* message */}
      <div
        style={{
          marginTop: 36,
          height: 328,
          boxSizing: "border-box",
          padding: "34px 26px",
          borderRadius: 14,
          backgroundColor: "#f4f1ec",
          fontSize: 24,
          lineHeight: 1.28,
          color: sent ? "#6f6f76" : "#2b2b33",
          whiteSpace: "pre-wrap",
          overflow: "hidden",
          letterSpacing: "-0.01em",
        }}
      >
        {text}
        {caret && <span style={{ display: "inline-block", width: 2, height: "1em", backgroundColor: "#2b2b33", verticalAlign: "-0.12em", marginLeft: 1 }} />}
      </div>

      {/* footer */}
      <div style={{ position: "absolute", left: DM_PAD, top: SEND_TOP + 16, display: "flex", gap: 22 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: "#e4e4e1" }} />
        ))}
      </div>
      {!hideSend && (
        <div
          style={{
            position: "absolute",
            left: SEND_LEFT,
            top: SEND_TOP,
            width: SEND_W,
            height: SEND_H,
            borderRadius: 999,
            backgroundColor: brand.linkedin,
            color: "#fff",
            fontFamily: brand.font,
            fontSize: 24,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${1 - press * 0.06})`,
          }}
        >
          {sent ? "Sent" : "Send"}
        </div>
      )}
      <div style={{ position: "absolute", right: DM_PAD, top: SEND_TOP + 22, display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: "#d6d6d3" }} />
        ))}
      </div>
    </div>
  );
}
