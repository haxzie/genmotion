import React from "react";
import { Img } from "@genmotion/motion";
import { brand } from "./brand";
import { bodyFont } from "./DmCard";
import ethan from "../assets/avatar-2.png";
import sender from "../assets/avatar-0.png";

// The LinkedIn message thread card (ref 9.5s): 370×545 @720p → 555×818.
export const REPLY_W = 555;
export const REPLY_H = 818;

const skel = (w: number, h = 9, c = "#e9e8e4") => <div style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: c }} />;

export function ReplyCard({ header = 0, replyOpacity = 1, style }: { header?: number; replyOpacity?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: REPLY_W,
        height: REPLY_H,
        boxSizing: "border-box",
        borderRadius: 18,
        backgroundColor: brand.surface,
        boxShadow: brand.cardShadow,
        position: "relative",
        overflow: "hidden",
        fontFamily: bodyFont,
        ...style,
      }}
    >
      {/* blue messaging header — visible only while the card is still the minimised bar */}
      {header > 0 && (
        <div style={{ position: "absolute", left: 0, top: 0, width: REPLY_W, height: 60, zIndex: 2, opacity: header, backgroundColor: brand.linkedin, display: "flex", alignItems: "center", padding: "0 20px", gap: 14 }}>
          <Img src={ethan} style={{ width: 36, height: 36, borderRadius: 18 }} />
          {skel(150, 9, "rgba(255,255,255,0.7)")}
          <div style={{ flex: 1 }} />
          <div style={{ width: 12, height: 12, borderRight: "2.5px solid #fff", borderTop: "2.5px solid #fff", transform: "rotate(-45deg)", marginRight: 10 }} />
        </div>
      )}
      <div style={{ position: "absolute", left: 48, top: 36, width: REPLY_W - 96 }}>
        {/* close */}
        <div style={{ position: "absolute", right: -6, top: 4, width: 20, height: 20 }}>
          <div style={{ position: "absolute", left: 9, top: -2, width: 2, height: 24, backgroundColor: "#d9d9d6", transform: "rotate(45deg)" }} />
          <div style={{ position: "absolute", left: 9, top: -2, width: 2, height: 24, backgroundColor: "#d9d9d6", transform: "rotate(-45deg)" }} />
        </div>
        <div style={{ position: "relative", width: 72, height: 72 }}>
          <Img src={ethan} style={{ width: 72, height: 72, borderRadius: 36, display: "block" }} />
          <div style={{ position: "absolute", right: -2, bottom: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: "#0f9d8a", border: "3px solid #fff" }} />
        </div>
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          {skel(120)}
          {skel(250, 9, "#efeeea")}
        </div>
        <div style={{ marginTop: 22, height: 1, backgroundColor: "#ececea" }} />

        {/* message 1 */}
        <div style={{ marginTop: 24, display: "flex", gap: 18 }}>
          <Img src={sender} style={{ width: 50, height: 50, borderRadius: 25, flex: "none" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 17, lineHeight: 1.3, color: "#3a3a42", letterSpacing: "-0.015em" }}>
            {skel(100, 8)}
            <div>Dear Ethan Carter,</div>
            <div>I'm about to send you a LinkedIn message you didn't ask for.</div>
            <div style={{ marginTop: 6 }}>If now is a bad time, I fully deserve to be ignored 😅</div>
            <div style={{ marginTop: 6 }}>But if you need more clients I can make a call with you.</div>
          </div>
        </div>
        <div style={{ marginTop: 20, height: 1, backgroundColor: "#ececea" }} />

        {/* reply */}
        <div style={{ marginTop: 22, display: "flex", gap: 18, opacity: replyOpacity }}>
          <Img src={ethan} style={{ width: 50, height: 50, borderRadius: 25, flex: "none" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 18, lineHeight: 1.3, color: "#3a3a42" }}>
            {skel(80, 8)}
            <div>F*CK YOU</div>
            <div>Best regards</div>
          </div>
        </div>

        {/* composer */}
        <div style={{ marginTop: 26, height: 134, borderRadius: 12, backgroundColor: "#f4f1ec" }} />
        <div style={{ marginTop: 20, display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ width: 13, height: 13, borderRadius: 3, backgroundColor: "#e4e4e1" }} />
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ width: 118, height: 30, borderRadius: 999, backgroundColor: "#e6e6e3" }} />
          <div style={{ display: "flex", gap: 5, marginLeft: 16 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#d6d6d3" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
