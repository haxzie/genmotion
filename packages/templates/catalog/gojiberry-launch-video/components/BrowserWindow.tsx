import React from "react";
import { Img } from "@genmotion/motion";
import office from "../assets/office-photo.jpg";
import banner from "../assets/profile-banner.jpg";
import ethan from "../assets/avatar-2.png";
import maya from "../assets/avatar-0.png";
import { brand } from "./brand";

// The LinkedIn wireframe window from the reference, measured at 720p and
// scaled ×1.5. Window is 1590 wide; its content runs past the bottom of the
// frame when it sits at WIN_TOP.
export const WIN_W = 1590;
export const WIN_H = 1060;
export const WIN_LEFT = (1920 - WIN_W) / 2;
export const WIN_TOP = 168;

// where the composer card sits inside the window (its top-left, and scale)
export const WIN_DM_LEFT = 1122;
export const WIN_DM_TOP = 480;
export const WIN_DM_SCALE = 0.615;

const line = (w: number, h = 10, c = "#ecebe8") => <div style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: c }} />;

export function BrowserWindow({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: WIN_W,
        height: WIN_H,
        borderRadius: 22,
        backgroundColor: "#f4f2ee",
        boxShadow: "0 40px 90px rgba(30,20,20,0.14), 0 2px 10px rgba(0,0,0,0.05)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* title bar */}
      <div style={{ position: "absolute", left: 0, top: 0, width: WIN_W, height: 82, backgroundColor: "#ffffff", display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, marginLeft: 42 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c }} />
          ))}
        </div>
        <div style={{ marginLeft: 144, width: 40, height: 40, borderRadius: 8, backgroundColor: brand.linkedin }} />
        <div style={{ marginLeft: 34, width: 692, height: 44, borderRadius: 22, backgroundColor: "#f1f1ee" }} />
        <div style={{ marginLeft: 44, display: "flex", gap: 60 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "#e6e5e1" }} />
          ))}
        </div>
        <Img src={maya} style={{ marginLeft: 50, width: 34, height: 34, borderRadius: 17 }} />
      </div>

      {/* left column */}
      <div style={{ position: "absolute", left: 177, top: 120, width: 248, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ backgroundColor: "#fff", borderRadius: 10, overflow: "hidden", paddingBottom: 26 }}>
          <Img src={banner} style={{ width: 248, height: 92, objectFit: "cover", display: "block" }} />
          <div style={{ marginTop: -40, marginLeft: 20, width: 70, height: 70, borderRadius: 35, border: "4px solid #fff", overflow: "hidden" }}>
            <Img src={ethan} style={{ width: 70, height: 70, display: "block" }} />
          </div>
          <div style={{ marginTop: 18, marginLeft: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {line(120)}
            {line(190)}
            {line(150)}
          </div>
        </div>
        <div style={{ backgroundColor: "#fff", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {line(140)}
          {line(200)}
        </div>
        <div style={{ backgroundColor: "#fff", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 14, minHeight: 420 }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: brand.linkedin, marginBottom: 10 }} />
          {line(120)}
          {line(180)}
          {line(160)}
          {line(120)}
          {line(180)}
          {line(160)}
          {line(120)}
        </div>
      </div>

      {/* middle column */}
      <div style={{ position: "absolute", left: 452, top: 120, width: 603, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ backgroundColor: "#fff", borderRadius: 10, padding: "22px 22px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Img src={maya} style={{ width: 54, height: 54, borderRadius: 27 }} />
            <div style={{ flex: 1, height: 50, borderRadius: 25, backgroundColor: "#f1f1ee" }} />
          </div>
          <div style={{ marginTop: 18, display: "flex", gap: 60 }}>
            {["#2fb26a", "#1c8ef5", "#e8563a"].map((c) => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: c }} />
                {line(70, 8)}
              </div>
            ))}
          </div>
        </div>
        <div style={{ backgroundColor: "#fff", borderRadius: 10, padding: "22px 22px 0", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Img src={maya} style={{ width: 54, height: 54, borderRadius: 27 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {line(140, 8)}
              {line(220, 8)}
            </div>
          </div>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {line(520, 8)}
            {line(420, 8)}
          </div>
          <Img src={office} style={{ marginTop: 22, width: 603, marginLeft: -22, height: 458, objectFit: "cover", display: "block" }} />
        </div>
      </div>

      {/* right column */}
      <div style={{ position: "absolute", left: 1082, top: 120, width: 326, backgroundColor: "#fff", borderRadius: 10, padding: 24, display: "flex", flexDirection: "column", gap: 22, boxSizing: "border-box", minHeight: 520 }}>
        {[180, 240, 210, 250, 200, 230, 180, 220, 200, 240, 180, 220].map((w, i) => (
          <React.Fragment key={i}>{line(w, 8)}</React.Fragment>
        ))}
      </div>

      {children}
    </div>
  );
}
