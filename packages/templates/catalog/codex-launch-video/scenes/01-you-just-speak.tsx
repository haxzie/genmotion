import { Camera, Layer, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "@genmotion/motion";
import { Mic } from "lucide-react";
import { C, FONT, clamp } from "../components/brand";
import { BlurWord, mix } from "../components/BlurWord";
import { Cursor } from "../components/Cursor";
import { glide } from "../components/glide";

// 0.00–1.83s — "You just speak" → "speak" glitches into a mic button → cursor → push in.
const MIC = { x: 1180, y: 535, d: 165 };
const FS = 122;

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shift = interpolate(f, [36, 46], [0, 60], { ...clamp, easing: Easing.outCubic });
  const right = 1000 + shift;

  // "speak" — typed in per letter, glitches at 35, then dissolves.
  const glitch = f >= 35 && f < 38;
  const speakText = glitch ? "sp)ak" : "speak";
  const speakOut = interpolate(f, [37, 43], [1, 0], clamp);

  const micIn = spring({ frame: f - 38, fps, config: { mass: 0.6, stiffness: 220, damping: 16 }, durationInFrames: 12 });
  const press = interpolate(f, [49, 52], [0, 1], { ...clamp, easing: Easing.outCubic });

  // Cursor sweeps in from the lower right and lands on the mic.
  // glide: one continuous approach (per-segment easing stopped it dead at frame 44).
  const cx = glide(f, [36, 44, 50], [1420, 1300, 1228], { easeIn: false });
  const cy = glide(f, [36, 44, 50], [780, 670, 596], { easeIn: false });
  const cursorOn = interpolate(f, [36, 40], [0, 1], clamp);
  const csize = 72;

  return (
    <Camera
      style={{ backgroundColor: C.bg }}
      keyframes={[
        { at: 0, x: 0.5, y: 0.5, zoom: 1 },
        { at: 48, x: 0.5, y: 0.5, zoom: 1 },
        // Lands on the exact framing scene 02 opens on: mic disc at (1000, 500), 3.8×.
        { at: 54, x: 0.6091, y: 0.5051, zoom: 3.8, ease: Easing.inCubic },
      ]}
    >
      <Layer>
        <div
          id="line-you-just"
          style={{
            position: "absolute", right: 1920 - right, top: 540 - FS * 0.62, display: "flex", gap: 34,
            fontFamily: FONT.humanist, fontSize: FS, fontWeight: 400, lineHeight: 1.2, letterSpacing: "0.01em",
          }}
        >
          <BlurWord id="w-you" text="You" start={-4} from={C.lightBlue} to={C.navy} />
          <BlurWord id="w-just" text="just" start={8} from={C.lightBlue} to={C.navy} />
        </div>

        <div
          id="w-speak"
          style={{
            position: "absolute", left: right + 36, top: 540 - FS * 0.62, display: "flex",
            fontFamily: FONT.humanist, fontSize: FS, lineHeight: 1.2, letterSpacing: "0.01em",
            opacity: speakOut, filter: `blur(${(1 - speakOut) * 10}px)`,
          }}
        >
          {speakText.split("").map((ch, i) => (
            <BlurWord key={i} text={ch} start={22 + i * 2} dur={8} from={"#3f79d8"} to={C.navy} />
          ))}
        </div>

        {/* Mic button — the handoff element; scene 02 opens inside it. */}
        <div
          id="mic-button"
          style={{ position: "absolute", left: MIC.x - MIC.d / 2, top: MIC.y - MIC.d / 2, width: MIC.d, height: MIC.d }}
        >
          <div
            style={{
              width: "100%", height: "100%", borderRadius: "50%",
              backgroundColor: mix("#ffffff", "#dbeafc", press),
              boxShadow: `0 14px 34px rgba(110,160,235,${0.32 * micIn}), 0 2px 6px rgba(0,0,0,0.04)`,
              transform: `scale(${micIn})`, opacity: Math.min(1, micIn * 1.5),
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Mic size={68} strokeWidth={2.2} color={mix(C.micPurple, "#a8cdf6", press)} />
          </div>
        </div>

        <div style={{ opacity: cursorOn }}>
          <Cursor x={cx} y={cy} size={csize} press={press} />
        </div>
      </Layer>
    </Camera>
  );
}
