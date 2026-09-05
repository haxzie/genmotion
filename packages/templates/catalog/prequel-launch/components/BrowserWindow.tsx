import { Img } from "@genmotion/motion";
import { Lock, ArrowLeft, ArrowRight, RotateCw, Star, Puzzle, Plus } from "lucide-react";
import { font } from "./brand";
import pageShot from "../assets/pasted-2026-08-27T10-40-00.jpg";

/** A generic Chrome window, drawn at a fixed 1200x675 and meant to be scaled by
    the caller — that way it never reflows as the layout resizes it.
    Dark chrome over a light page, so it reads as a bright "screen" against a
    dark composition. Content is deliberately abstract shapes. */
export const BROWSER_W = 1200;
export const BROWSER_H = 675;

const CHROME = "#2b2d31";
const CHROME_HI = "#3c3f45";
const ICON = "#9aa0ab";

export function BrowserWindow() {
  return (
    <div
      style={{
        width: BROWSER_W,
        height: BROWSER_H,
        background: CHROME,
        fontFamily: font,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ---- tab strip ---- */}
      {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
        <div
          key={c}
          style={{
            position: "absolute",
            left: 20 + i * 24,
            top: 21,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: c,
          }}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 104 + i * 210,
            top: 10,
            width: 200,
            height: 40,
            borderRadius: "10px 10px 0 0",
            background: i === 0 ? "#ffffff" : CHROME_HI,
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingLeft: 16,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: ["#4e84f9", "#e14b15", "#34c759"][i],
            }}
          />
          <div
            style={{
              width: 108,
              height: 9,
              borderRadius: 5,
              background: i === 0 ? "#c9ced8" : "rgba(255,255,255,0.28)",
            }}
          />
        </div>
      ))}
      <div style={{ position: "absolute", left: 744, top: 20 }}>
        <Plus size={20} color={ICON} strokeWidth={2} />
      </div>

      {/* ---- address bar ---- */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 50,
          width: BROWSER_W,
          height: 58,
          background: "#ffffff",
        }}
      >
        <div style={{ position: "absolute", left: 24, top: 18 }}>
          <ArrowLeft size={22} color="#5f6672" strokeWidth={2.1} />
        </div>
        <div style={{ position: "absolute", left: 66, top: 18 }}>
          <ArrowRight size={22} color="#b6bcc6" strokeWidth={2.1} />
        </div>
        <div style={{ position: "absolute", left: 108, top: 18 }}>
          <RotateCw size={22} color="#5f6672" strokeWidth={2.1} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 152,
            top: 12,
            width: 828,
            height: 34,
            borderRadius: 17,
            background: "#f1f3f5",
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
            gap: 12,
          }}
        >
          <Lock size={15} color="#6b7280" strokeWidth={2.2} />
          <span style={{ fontSize: 22, color: "#3c4149", letterSpacing: "-0.01em" }}>
            genmotion.dev
          </span>
        </div>
        <div style={{ position: "absolute", left: 1006, top: 18 }}>
          <Star size={22} color="#5f6672" strokeWidth={2.1} />
        </div>
        <div style={{ position: "absolute", left: 1048, top: 18 }}>
          <Puzzle size={22} color="#5f6672" strokeWidth={2.1} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 1094,
            top: 15,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#4e84f9",
          }}
        />
      </div>

      {/* ---- page ---- */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 108,
          width: BROWSER_W,
          height: BROWSER_H - 108,
          background: "#ffffff",
          overflow: "hidden",
        }}
      >
        <Img
          src={pageShot}
          style={{
            width: BROWSER_W,
            height: BROWSER_H - 108,
            objectFit: "cover",
            objectPosition: "top center",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}
