import { Camera, Layer, Overlay, Video, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { Plus, Mic, ArrowUp, ChevronDown } from "lucide-react";
import meadowVideo from "../assets/meadow-sea-loop.mp4";
import { FONT, clamp } from "../components/brand";
import { mix } from "../components/BlurWord";
import { MotionCursor, splinePath } from "../components/MotionCursor";
import { Fisheye } from "../components/Fisheye";

// 5.17–8.00s — "What should we work on?" prompt over the meadow.
const PILL = { x: 232, y: 515, w: 1450, h: 105 };
const TYPED = "Build me a website";

const W = 1920;
const H = 1080;

// Camera keyframes — shared by <Camera> and camAt(), which mirrors them so the
// punch-in motion blur is sized to the camera's actual zoom speed.
const CAM_KEYS = [
  { at: 0, x: 0.5, y: 0.5, zoom: 1, ease: Easing.inOutCubic },
  { at: 36, x: 0.5, y: 0.5, zoom: 1.03, ease: Easing.inOutCubic },
  // Punch-in on the prompt, as fast as the reference cuts it.
  { at: 46, x: 0.232, y: 0.528, zoom: 2.5, ease: Easing.inOutCubic },
  { at: 85, x: 0.262, y: 0.528, zoom: 2.55, ease: Easing.linear },
];
function camAt(t: number) {
  let i = 0;
  while (i < CAM_KEYS.length - 2 && t > CAM_KEYS[i + 1].at) i++;
  const a = CAM_KEYS[i];
  const b = CAM_KEYS[i + 1];
  const opts = { ...clamp, easing: b.ease };
  return {
    cx: interpolate(t, [a.at, b.at], [a.x, b.x], opts) * W,
    cy: interpolate(t, [a.at, b.at], [a.y, b.y], opts) * H,
    zoom: interpolate(t, [a.at, b.at], [a.zoom, b.zoom], opts),
  };
}

// Cursor path — traced from the user's marked-up stroke (bounding box
// (121,623)–(1486,771), SCREEN px). In the punched-in shot the pill's bottom edge
// sits at screen y≈665, so the stroke hugs just beneath it: it starts beside the
// pill's rounded left end, dips ~100px under "an app", and rises back to finish
// under the right of the text — then carries on off-frame toward send (scene 05).
// One continuous time-spline: velocity is continuous at every key, no dead stops.
const cursorPath = splinePath(
  [
    { t: 40, x: 121, y: 632 },
    { t: 50, x: 430, y: 724 },
    { t: 58, x: 720, y: 768, damp: 0.7 },   // eases through the low point under "an app"
    { t: 67, x: 1100, y: 748, damp: 0.8 },  // as "a tool" lands
    { t: 76, x: 1486, y: 626 },             // end of the drawn stroke
  ],
  { x: 22, y: 12 },   // appears already drifting down-right, into the arc
  { x: 58, y: -12 },  // carries on, still climbing, off the right edge by the cut
);

// Zoom speed drives the punch-in motion blur.
const zoomAt = (t: number) => camAt(t).zoom;

function Suffix({ text, start, end }: { text: string; start: number; end: number }) {
  const f = useCurrentFrame();
  if (f < start - 1 || f >= end) return null;
  const p = interpolate(f, [start, start + 7], [0, 1], { ...clamp, easing: Easing.outSmooth });
  const out = interpolate(f, [end - 2, end], [1, 0], clamp);
  return (
    <span
      style={{
        display: "inline-block", whiteSpace: "pre", opacity: Math.min(1, p * 2) * out, filter: `blur(${(1 - p) * 5}px)`,
        color: mix("#c9bff7", "#ffffff", interpolate(f, [start + 3, start + 12], [0, 1], clamp)),
      }}
    >
      {text}
    </span>
  );
}

export default function Scene() {
  const f = useCurrentFrame();

  const intro = interpolate(f, [0, 7], [1, 0], { ...clamp, easing: Easing.outCubic });
  const dof = interpolate(f, [36, 46], [0, 5], clamp);
  const typedN = Math.floor(interpolate(f, [3, 15], [0, TYPED.length], clamp));
  const caret = f < 48 && Math.floor(f / 8) % 2 === 0;

  // Cursor fades in at the start of the drawn stroke as the camera lands.
  const cOn = interpolate(f, [39, 43], [0, 1], { ...clamp, easing: Easing.outCubic });

  // Inverse fish-eye (pincushion): edges arrive magnified and relax flat, then stretch again into the cut.
  const lensIn = interpolate(f, [0, 13], [420, 0], { ...clamp, easing: Easing.outCubic });
  const lensOut = interpolate(f, [73, 84], [0, 420], { ...clamp, easing: Easing.inCubic });
  const lens = lensIn + lensOut;

  // Zoom motion blur during the punch-in, proportional to how fast the camera zooms.
  const zoomSpeed = Math.abs(zoomAt(f + 0.5) - zoomAt(f - 0.5)); // zoom units / frame (peak ≈ 0.22)
  const zoomBlur = Math.min(7, zoomSpeed * 32);

  return (
    <Fisheye id="fisheye-prompt" strength={lens} invert>
    <Camera
      style={{ backgroundColor: "#6f98a6" }}
      keyframes={CAM_KEYS}
    >
      <Layer>
        <div style={{ position: "absolute", inset: 0, filter: `blur(${intro * 16 + dof + zoomBlur}px)`, transform: `scale(${1 + intro * 0.12})` }}>
          {/* Animated from the meadow still with fal (minimax/h3-max image-to-video), slowed 1.6× */}
          <Video id="meadow-bg" src={meadowVideo} volume={0} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,55,80,0.6) 0%, rgba(10,70,90,0.2) 35%, rgba(0,0,0,0) 60%)" }} />
          <div style={{ position: "absolute", inset: 0, backgroundColor: "#35c0ee", opacity: intro * 0.55 }} />
        </div>

        <div style={{ position: "absolute", inset: 0, filter: `blur(${intro * 14 + zoomBlur * 0.8}px)` }}>
          <div
            id="prompt-heading"
            style={{
              position: "absolute", left: 0, right: 0, top: 322, textAlign: "center", fontFamily: FONT.sans,
              fontSize: 66, fontWeight: 400, color: "#ffffff", letterSpacing: "-0.01em",
            }}
          >
            What should we work on?
          </div>

          <div
            id="prompt-pill"
            style={{
              position: "absolute", left: PILL.x, top: PILL.y, width: PILL.w, height: PILL.h, borderRadius: PILL.h / 2,
              backgroundColor: "rgba(45,75,90,0.24)", border: "2px solid rgba(255,255,255,0.6)",
              backdropFilter: "blur(14px)", boxShadow: "0 10px 40px rgba(0,30,50,0.18)",
              display: "flex", alignItems: "center", padding: "0 26px 0 50px", boxSizing: "border-box",
              fontFamily: FONT.sans, color: "#ffffff",
            }}
          >
            <Plus size={40} strokeWidth={2.4} color="#ffffff" />
            <div id="prompt-text" style={{ marginLeft: 26, fontSize: 36, whiteSpace: "pre", display: "flex", alignItems: "center" }}>
              {f < 48 ? (
                <span>{TYPED.slice(0, typedN)}</span>
              ) : (
                <>
                  <span>Build me </span>
                  <Suffix text="a website" start={-20} end={49} />
                  <Suffix text="an app" start={49} end={62} />
                  <Suffix text="a tool" start={62} end={999} />
                </>
              )}
              <span style={{ width: 3, height: 40, marginLeft: 2, backgroundColor: "#ffffff", opacity: caret ? 1 : 0 }} />
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 28, marginRight: 4 }}>5.5 Medium</span>
            <ChevronDown size={26} strokeWidth={2.6} color="#ffffff" />
            <div style={{ width: 36 }} />
            <Mic size={36} strokeWidth={2} color="#ffffff" />
            <div
              id="send-button"
              style={{
                marginLeft: 26, width: 56, height: 56, borderRadius: "50%", backgroundColor: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <ArrowUp size={28} strokeWidth={2} color="#555" />
            </div>
          </div>
        </div>
      </Layer>
      <Overlay>
        <MotionCursor id="cursor" path={cursorPath} size={190} opacity={cOn} blurPerPx={0.22} maxBlur={16} turnSpeed={26} smooth={5} />
      </Overlay>
    </Camera>
    </Fisheye>
  );
}
