import { AbsoluteFill, Img, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import briefbot from "../assets/dash-briefbot.jpg";
import crm from "../assets/dash-crm.png";
import crypto from "../assets/dash-crypto.png";
import pulse from "../assets/dash-pulseboard.png";
import overview from "../assets/dash-overview.jpg";
import { clamp } from "../components/brand";

// 9.00–10.83s — the builds. As in the reference, the whole layout ORBITS the
// frame centre: the cards spiral out of the middle as blue placeholders and
// resolve into finished apps, the cluster keeps turning slowly, then everything
// spirals back in, blurring blue, and merges at the centre (scene 07's bloom).
// Cards stay upright — only their positions revolve.

const CX = 960;
const CY = 540;

// Final layout (from the reference at 10.3s): card centre + size.
const CARDS = [
  { id: "app-crm", x: 370, y: 737, w: 450, h: 295, src: crm, at: 0 },
  { id: "app-crypto", x: 1027, y: 440, w: 425, h: 240, src: crypto, at: 1 },
  { id: "app-pulseboard", x: 1542, y: 257, w: 575, h: 325, src: pulse, at: 2 },
  { id: "app-briefbot", x: 450, y: 335, w: 700, h: 390, src: briefbot, at: 3 },
  { id: "app-tasks", x: 815, y: 45, w: 450, h: 210, src: overview, at: 5 },
  { id: "app-overview", x: 1415, y: 885, w: 690, h: 380, src: overview, at: 6 },
].map((c) => {
  const dx = c.x - CX;
  const dy = c.y - CY;
  return { ...c, r: Math.hypot(dx, dy), theta: Math.atan2(dy, dx) };
});

const deg = Math.PI / 180;

export default function Scene() {
  const f = useCurrentFrame();

  // Global swirl — one continuous clockwise rotation through the whole scene.
  const orbit = interpolate(f, [0, 55], [0, 7], clamp) * deg;             // slow drift while held
  const exitP = interpolate(f, [44, 55], [0, 1], { ...clamp, easing: Easing.inCubic });
  const exitSpin = exitP * 110 * deg;                                      // spiral in

  return (
    <AbsoluteFill style={{ backgroundColor: "#f7f9fc" }}>
      {CARDS.map((c) => {
        const p = interpolate(f, [c.at, c.at + 16], [0, 1], { ...clamp, easing: Easing.outCubic });
        const resolve = interpolate(f, [c.at + 8, c.at + 16], [0, 1], clamp);

        // Spiral out: start near the centre, swung 80° back, and unwind into place.
        const angle = c.theta - (1 - p) * 80 * deg + orbit + exitSpin;
        const radius = c.r * (0.06 + 0.94 * p) * (1 - exitP * 0.8) * (1 + 0.035 * interpolate(f, [16, 42], [0, 1], clamp));
        const x = CX + Math.cos(angle) * radius;
        const y = CY + Math.sin(angle) * radius;
        const scale = (0.28 + 0.72 * p) * (1 - exitP * 0.5);

        const blueOn = Math.max(1 - resolve, exitP);
        return (
          <div
            key={c.id}
            id={c.id}
            style={{
              position: "absolute", left: x - c.w / 2, top: y - c.h / 2, width: c.w, height: c.h,
              transform: `scale(${scale})`, opacity: interpolate(p, [0, 0.25], [0, 1], clamp),
              borderRadius: 6, overflow: "hidden", filter: `blur(${exitP * 14 + (1 - p) * 4}px)`,
              boxShadow: "0 18px 40px rgba(60,90,160,0.14), 0 0 0 1px rgba(20,40,90,0.06)",
              backgroundColor: "#ffffff",
            }}
          >
            <Img src={c.src} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%" }} />
            <div
              style={{
                position: "absolute", inset: 0, opacity: blueOn,
                background: "linear-gradient(135deg, #a3b2fb 0%, #afd3fb 100%)",
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
