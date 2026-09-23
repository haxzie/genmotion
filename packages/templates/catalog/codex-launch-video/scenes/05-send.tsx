import { AbsoluteFill, Img, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { Mic, ArrowUp, ChevronDown } from "lucide-react";
import meadow from "../assets/meadow-sea.jpg";
import { clamp } from "../components/brand";
import { mix } from "../components/BlurWord";
import { MotionCursor, splinePath } from "../components/MotionCursor";

// 8.00–9.00s — extreme close-up: cursor clicks send, the button floods the frame.
const SY = 517;
const SD = 510;

// Pan: the send button's centre x — one decelerating glide as it slides in and settles.
const sxAt = (t: number) => interpolate(t, [0, 22], [1574, 1020], { ...clamp, easing: Easing.outCubic });
const buttonAnchor = (t: number) => ({ x: sxAt(t), y: SY });

// Cursor path — traced from the user's marked-up stroke on frame 2 (bounding box
// (26,663)–(1515,904), screen px, with the button centred at ≈(1436, 517) then).
// Pinned to the BUTTON (relative coords) so it still lands on it as the shot pans:
// sweeps in from the left edge, dips low (~y 900) under the mic, and curves up
// into the button's lower-right for the click. One continuous time-spline; the
// last stretch is a gentle 4-frame glide so it comes to rest instead of braking.
const cursorRel = splinePath(
  [
    { t: 0, x: -1410, y: 213 },             // start of the stroke, left side of frame
    { t: 5, x: -690, y: 387 },              // the dip — lowest point of the stroke (~y 904)
    { t: 11, x: -10, y: 190, damp: 0.8 },   // over the button's edge, easing off
    { t: 15, x: 79, y: 146 },               // end of the stroke, inside the button — at rest
  ],
  { x: 150, y: 30 },  // already moving fast as the shot opens (it came in from scene 04)
  { x: 0, y: 0 },     // settles to rest on the button
);

// Faces its travel along the sweep, then eases to a resting lean (tip angled into
// the button) on a gentle time ramp — not speed — so the landing turn is one
// even rotation (≤ ~10°/frame) instead of a snap when it stops.
const faceAt = (t: number) =>
  1 - interpolate(t, [5, 18], [0, 1], { ...clamp, easing: Easing.bezier(0.37, 0, 0.63, 1) }); // ease-in-out sine

export default function Scene() {
  const f = useCurrentFrame();

  // Every move below is ONE continuous curve. (Multi-keyframe interpolate()
  // eases each segment separately, which made the pan stop and restart every
  // 5 frames and the zoom lurch at each key.)

  // Pan: one decelerating glide as the button slides in and settles.
  const sx = sxAt(f);

  // Click: a smooth sine press, 15→21 — right as the pointer comes to rest.
  const press = Math.sin(Math.PI * interpolate(f, [15, 21], [0, 1], clamp));
  const blue = interpolate(f, [16, 19], [0, 1], { ...clamp, easing: Easing.inOutCubic });

  // Zoom: a gentle dip with the press, then an exponential push that starts from
  // rest — scale grows at a steadily rising rate instead of lurching at keys.
  const dip = 0.07 * press;
  const push = interpolate(f, [18, 29], [0, 1], { ...clamp, easing: Easing.inCubic });
  const zoom = (1 - dip) * Math.exp(Math.log(7) * push);
  const flood = interpolate(f, [22, 29], [0, 1], { ...clamp, easing: Easing.inCubic });


  return (
    <AbsoluteFill style={{ backgroundColor: "#7c9aa0" }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${sx}px ${SY}px`, transform: `scale(${zoom})` }}>
        <Img
          src={meadow}
          style={{
            position: "absolute", left: -1400 + (sx - 1574) * 0.4, top: -1500, width: 4600, height: 4600,
            objectFit: "cover", filter: "blur(22px)",
          }}
        />
        {/* the glass pill's rounded right end */}
        <div
          style={{
            position: "absolute", left: sx - 3700, top: -40, width: 4260, height: 1110, borderRadius: 555,
            border: "5px solid rgba(255,255,255,0.55)", backgroundColor: "rgba(255,255,255,0.1)", filter: "blur(1.5px)",
          }}
        />
        <div style={{ position: "absolute", left: sx - 1330, top: SY - 80, filter: "blur(4px)", opacity: 0.9 }}>
          <ChevronDown size={160} strokeWidth={2.4} color="#ffffff" />
        </div>
        <div style={{ position: "absolute", left: sx - 830, top: SY - 150, filter: "blur(2.5px)" }}>
          <Mic size={300} strokeWidth={2} color="#ffffff" />
        </div>
        <div
          id="send-button"
          style={{
            position: "absolute", left: sx - SD / 2, top: SY - SD / 2, width: SD, height: SD, borderRadius: "50%",
            backgroundColor: mix("#ffffff", "#b9d8f8", blue), transform: `scale(${1 - press * 0.08})`,
            display: "flex", alignItems: "center", justifyContent: "center", filter: "blur(1px)",
          }}
        >
          <ArrowUp size={200} strokeWidth={1.6} color="#555" />
        </div>
        <MotionCursor
          id="cursor"
          path={cursorRel}
          anchor={buttonAnchor}
          press={press}
          faceWeight={faceAt(f)}
          restRotate={20}
          size={330}
          blurPerPx={0.16}
          maxBlur={18}
          smooth={5}
        />
      </div>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 1 - flood, background: "linear-gradient(180deg, rgba(20,90,100,0.45) 0%, rgba(40,110,120,0.15) 45%, rgba(0,0,0,0) 60%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#f6f8fc", opacity: flood }} />
    </AbsoluteFill>
  );
}
