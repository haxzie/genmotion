import React from "react";
import { Img } from "@genmotion/motion";
import { random } from "@genmotion/motion";
import ethan from "../assets/avatar-2.png";

// The green-headed spreadsheet from the reference (13.2–15.4s). 1560×1000.
export const SHEET_W = 1560;
export const SHEET_H = 1000;
const COLS = 10;
const ROWS = 22;
const COL_W = 148;
const ROW_H = 30;

export function Sheet() {
  return (
    <div
      style={{
        width: SHEET_W,
        height: SHEET_H,
        borderRadius: 22,
        backgroundColor: "#ffffff",
        boxShadow: "0 40px 90px rgba(30,20,20,0.14), 0 2px 10px rgba(0,0,0,0.05)",
        overflow: "hidden",
        position: "relative",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* green chrome */}
      <div style={{ height: 96, backgroundColor: "#469b2d", display: "flex", alignItems: "center", padding: "0 34px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#fff" }} />
          ))}
        </div>
        <div style={{ marginLeft: 40, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ width: 210, height: 9, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.75)" }} />
          <div style={{ display: "flex", gap: 24 }}>
            {[70, 80, 60, 90, 70, 60, 80].map((w, i) => (
              <div key={i} style={{ width: w, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.55)" }} />
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Img src={ethan} style={{ width: 46, height: 46, borderRadius: 23, border: "2px solid #fff" }} />
      </div>
      {/* column letters */}
      <div style={{ position: "absolute", left: 60, top: 96, display: "flex" }}>
        {Array.from({ length: COLS }).map((_, c) => (
          <div key={c} style={{ width: COL_W, height: 26, borderRight: "1px solid #ececec", borderBottom: "1px solid #e4e4e4", fontSize: 14, color: "#9a9a9a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {String.fromCharCode(65 + c)}
          </div>
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: ROWS }).map((_, r) => (
        <div key={r} style={{ position: "absolute", left: 0, top: 122 + r * ROW_H, width: SHEET_W, height: ROW_H, display: "flex", borderBottom: "1px solid #efefef" }}>
          <div style={{ width: 60, fontSize: 13, color: "#9a9a9a", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #e4e4e4" }}>{r + 1}</div>
          {Array.from({ length: COLS }).map((_, c) => {
            const w = 50 + Math.floor(random(`cell-${r}-${c}`) * 60);
            return (
              <div key={c} style={{ width: COL_W, borderRight: "1px solid #f0f0f0", display: "flex", alignItems: "center", paddingLeft: 12, boxSizing: "border-box" }}>
                <div style={{ width: w, height: 8, borderRadius: 4, backgroundColor: "#e6e6e4" }} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
