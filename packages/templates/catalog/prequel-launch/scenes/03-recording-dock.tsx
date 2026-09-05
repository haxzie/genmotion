import {
  Camera,
  Layer,
  Video,
  Easing,
  interpolate,
  random,
  spring,
  springPresets,
  useCurrentFrame,
  useVideoConfig,
} from "@genmotion/motion";
import {
  X,
  Monitor,
  AppWindow,
  Square,
  Video as VideoIcon,
  VideoOff,
  Mic,
  ChevronDown,
} from "lucide-react";
import { font } from "../components/brand";
import { Cursor, cursorDynamics } from "../components/Cursor";
import faceCam from "../assets/YTDown.com_YouTube_The-ROCK-Eyebrow-4K-60fps_Media_sVlgcSKJBz0_002_720p.mp4";
import {
  WORLD,
  DOCK_CX,
  CAM_HANDOFF,
  OUT_SCALE,
  OUT_BLUR,
  DesktopPlane,
  FrostedBackdrop,
} from "../components/desktop";

/* ---- recording bar, scaled up ~2.7x from the real 13pt UI so every label
        clears the readable floor at 1080p ---- */
const BAR_W = 1230;
const BAR_H = 124;
const BAR_R = 30;
const BTN = 84;

/* how far the bar drops when the camera preview needs the frame */
const DOCK_PUSH = 398;
const PREVIEW = 600;
const PREVIEW_GAP = 56;
/* rounder than the macOS app-icon squircle the dock tiles use */
const PREVIEW_RADIUS = "30%";

/* each capture mode names itself as the pill lands on it */
const TOOLTIP_LIFT = 92;
const MODES = [
  { label: "Record Entire Screen", from: 50, until: 74 },
  { label: "Record a Window", from: 94, until: 118 },
  { label: "Record an Area", from: 148, until: 174 },
];
const CY = BAR_H / 2;

const CLOSE_X = 26;
const DIV1_X = 126;
const MODE_X = 144;
const MODE_W = 272; // 3 x 84 with 10 gaps
const DIV2_X = 432;
const CAM_X = 450;
const CAM_W = 244;
const MIC_X = 754;
const MIC_W = 448;

/* World x of each control the pointer visits. The bar is fixed width and centred
   on DOCK_CX, so these resolve at module level — but they MUST come after the
   layout constants above, or they read as undefined and every cursor position
   silently becomes NaN. */
const BAR_LEFT = DOCK_CX - BAR_W / 2;
const MODE_CX0 = BAR_LEFT + MODE_X + 0 * 94 + BTN / 2;
const MODE_CX1 = BAR_LEFT + MODE_X + 1 * 94 + BTN / 2;
const MODE_CX2 = BAR_LEFT + MODE_X + 2 * 94 + BTN / 2;
const CAM_CX = BAR_LEFT + CAM_X + CAM_W / 2;
const MIC_CX = BAR_LEFT + MIC_X + MIC_W / 2;
/* the pointer rides 26px below the bar's centre line, inside every control */
const CURSOR_DROP = 26;

/* ---- palette read off the screenshot ---- */
const BAR_BG = "rgba(24,27,36,0.78)";
const BAR_BORDER = "rgba(255,255,255,0.12)";
const CHIP_BG = "rgba(255,255,255,0.13)";
const DIVIDER = "rgba(255,255,255,0.13)";
const ACTIVE = "#4e84f9";
const LABEL = "#d7dbe4";
const MUTED = "#9aa2b2";
const AMBER = "#f0a83c";

const ICON_OFF: [number, number, number] = [154, 162, 178];
const ICON_ON: [number, number, number] = [255, 255, 255];
const DOT_OFF: [number, number, number] = [120, 126, 140];
const DOT_ON: [number, number, number] = [52, 199, 89];

const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(a[1] + (b[1] - a[1]) * t)}, ${Math.round(a[2] + (b[2] - a[2]) * t)})`;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/* aggressive through the middle, at rest on both ends */
const EASE_MOVE = Easing.bezier(0.65, 0, 0.35, 1);

/* the scale-and-blur exit, matched by scene 4's opening */
const OUT_START = 300;
const OUT_END = 316;

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* --- the bar drops in from above, continuing the downward motion scene 2
         exited on. It arrives whole, the way the real app presents it. --- */
  const barY = interpolate(frame, [8, 32], [-640, 0], { easing: Easing.outSmooth, ...clamp });
  const barLeft = DOCK_CX - BAR_W / 2;
  const barTop = 1080 - BAR_H / 2;
  const floatAt = (f: number) => Math.sin(f / 36) * 3;
  const float = floatAt(frame);

  /* --- controls resolve as it lands, left to right --- */
  const item = (i: number) =>
    interpolate(frame, [16 + i * 3, 30 + i * 3], [0, 1], {
      easing: Easing.outSmooth,
      ...clamp,
    });

  /* --- beat 1: capture mode steps through display -> window -> area, once,
         each stop naming itself in a tooltip above the bar.
         The pill only moves AFTER the pointer has landed on the button and
         clicked — it must never anticipate the cursor. --- */
  const slot = interpolate(frame, [90, 98, 144, 152], [0, 1, 1, 2], {
    easing: Easing.outSmooth,
    ...clamp,
  });
  const modeRing = interpolate(frame, [40, 50, 180, 190], [0, 1, 1, 0], clamp);

  /* --- beat 2: the camera comes on. Everything here waits for the pointer to
         land on the control at 202 and click at 204 — the toggle, the bar
         dropping to the bottom, and the preview popping in above it. --- */
  const camOn = interpolate(frame, [204, 216], [0, 1], { easing: Easing.outSmooth, ...clamp });
  const camRing = interpolate(frame, [188, 200, 238, 248], [0, 1, 1, 0], clamp);
  const camPop = interpolate(frame, [204, 210, 218], [0, 1, 0], clamp);
  const pushAt = (f: number) =>
    interpolate(f, [206, 226], [0, DOCK_PUSH], { easing: Easing.outSmooth, ...clamp });
  const push = pushAt(frame);

  const pop = spring({
    frame: Math.max(0, frame - 228),
    fps,
    config: springPresets.bouncy,
    durationInFrames: 18,
  });
  const popIn = interpolate(frame, [228, 238], [0, 1], clamp);
  const breathe = 1 + 0.008 * Math.sin(frame / 40);

  /* --- the pointer, carried over from scene 2's last position and moved onto
         whichever control is currently being demonstrated --- */
  const posX = (f: number) =>
    interpolate(
      f,
      [30, 46, 74, 88, 128, 142, 186, 202, 252, 266],
      [2628, MODE_CX0, MODE_CX0, MODE_CX1, MODE_CX1, MODE_CX2, MODE_CX2, CAM_CX, CAM_CX, MIC_CX],
      { easing: EASE_MOVE, ...clamp },
    );
  const posY = (f: number) => 1080 + CURSOR_DROP + floatAt(f) + pushAt(f);
  const cursorX = posX(frame);

  // A click dip on each arrival — this is what the pill and the camera respond to.
  const clickAt = (at: number) =>
    interpolate(frame, [at, at + 4, at + 9], [0, 1, 0], clamp);
  const press = Math.max(clickAt(90), clickAt(144), clickAt(204));
  const dyn = cursorDynamics(frame, posX, posY, press);

  /* --- beat 3: the mic is live, and the level dot breathes with it --- */
  const micRing = interpolate(frame, [254, 266], [0, 1], clamp);
  const micLive = interpolate(frame, [268, 278], [0, 1], clamp);

  /* --- exit: everything swells and blurs away. Accelerating, so it takes off
         rather than drifting. Scene 4 opens from this same scale and blur. --- */
  const out = interpolate(frame, [OUT_START, OUT_END], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.75, 0.25),
    ...clamp,
  });
  const outScale = 1 + (OUT_SCALE - 1) * out;
  const outBlur = OUT_BLUR * out;
  const uiFade = interpolate(frame, [OUT_START + 2, OUT_END - 3], [1, 0], {
    easing: Easing.outSmooth,
    ...clamp,
  });
  const level =
    micLive *
    (0.35 +
      0.65 *
        Math.abs(
          Math.sin(frame * 0.26 + random("mic") * 6) * 0.6 +
            Math.sin(frame * 0.44 + random("mic2") * 6) * 0.4,
        ));

  const ring = (x: number, w: number, o: number) => (
    <div
      style={{
        position: "absolute",
        left: x - 16,
        top: 8,
        width: w + 32,
        height: BAR_H - 16,
        borderRadius: 24,
        border: `2px solid rgba(255,255,255,${0.26 * o})`,
        background: `rgba(255,255,255,${0.06 * o})`,
        opacity: o,
      }}
    />
  );

  return (
    <Camera
      world={WORLD}
      style={{ background: "#141018" }}
      keyframes={[{ at: 0, x: CAM_HANDOFF, y: 0.5, zoom: 1 }]}
    >
      <Layer>
        {/* The desktop only defocuses — it stays put while the UI swells past it. */}
        <div style={{ position: "absolute", inset: 0, filter: `blur(${outBlur}px)` }}>
          <DesktopPlane />
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: `${DOCK_CX}px 1080px`,
            transform: `scale(${outScale})`,
            filter: `blur(${outBlur}px)`,
            opacity: uiFade,
          }}
        >
        {/* ---- camera preview, popping in above the bar ---- */}
        <div
          id="camera-preview"
          style={{
            position: "absolute",
            left: DOCK_CX - PREVIEW / 2,
            top: barTop + float + barY + push - PREVIEW_GAP - PREVIEW,
            width: PREVIEW,
            height: PREVIEW,
            opacity: popIn,
            transform: `translateY(${(1 - pop) * 26}px) scale(${(0.72 + 0.28 * pop) * breathe})`,
            borderRadius: PREVIEW_RADIUS,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "0 40px 90px rgba(8,6,14,0.55), 0 4px 12px rgba(8,6,14,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(165deg, #2c313d 0%, #1a1d26 62%, #14161d 100%)",
          }}
        >
          <Video
            src={faceCam}
            loop
            volume={0}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: PREVIEW,
              height: PREVIEW,
              objectFit: "cover",
              display: "block",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(78% 62% at 50% 34%, rgba(255,255,255,0) 0%, rgba(10,8,14,0.28) 100%)",
            }}
          />
        </div>

        {/* ---- the recording bar ---- */}
        <div
          id="recording-dock"
          style={{
            position: "absolute",
            left: barLeft,
            top: barTop + float + barY + push,
            width: BAR_W,
            height: BAR_H,
            borderRadius: BAR_R,
            overflow: "hidden",
            border: `1px solid ${BAR_BORDER}`,
            boxShadow: "0 40px 90px rgba(8,6,14,0.50), 0 4px 12px rgba(8,6,14,0.30)",
          }}
        >
          <FrostedBackdrop left={barLeft} top={barTop} />
          <div style={{ position: "absolute", inset: 0, background: BAR_BG }} />

          <div style={{ position: "absolute", inset: 0 }}>
            {ring(MODE_X, MODE_W, modeRing)}
            {ring(CAM_X, CAM_W, camRing)}
            {ring(MIC_X, MIC_W, micRing)}

            {/* close */}
            <div
              style={{
                position: "absolute",
                left: CLOSE_X,
                top: 20,
                width: BTN,
                height: BTN,
                borderRadius: 26,
                background: CHIP_BG,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: item(0),
                transform: `translateY(${(1 - item(0)) * 10}px)`,
              }}
            >
              <X size={40} color="#e8eaf0" strokeWidth={2.1} />
            </div>

            <div
              style={{
                position: "absolute",
                left: DIV1_X,
                top: 34,
                width: 2,
                height: 56,
                background: DIVIDER,
                opacity: item(1),
              }}
            />

            {/* capture mode — the active pill slides between the three */}
            <div style={{ position: "absolute", left: MODE_X, top: 20, width: MODE_W, height: BTN }}>
              <div
                style={{
                  position: "absolute",
                  left: slot * 94,
                  top: 0,
                  width: BTN,
                  height: BTN,
                  borderRadius: 26,
                  background: ACTIVE,
                  opacity: item(3),
                  boxShadow: `0 8px 22px rgba(78,132,249,${0.45 * item(3)})`,
                }}
              />
              {[Monitor, AppWindow, Square].map((Ico, i) => {
                const on = Math.max(0, 1 - Math.abs(slot - i));
                const p = item(2 + i);
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: i * 94,
                      top: 0,
                      width: BTN,
                      height: BTN,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: p,
                      transform: `translateY(${(1 - p) * 10}px)`,
                    }}
                  >
                    <Ico
                      size={42}
                      color={mix(ICON_OFF, ICON_ON, on)}
                      strokeWidth={1.9}
                      {...(i === 2 ? { strokeDasharray: "5 4" } : {})}
                    />
                  </div>
                );
              })}
            </div>

            <div
              style={{
                position: "absolute",
                left: DIV2_X,
                top: 34,
                width: 2,
                height: 56,
                background: DIVIDER,
                opacity: item(5),
              }}
            />

            {/* camera source */}
            <div
              style={{
                position: "absolute",
                left: CAM_X,
                top: 0,
                width: CAM_W,
                height: BAR_H,
                opacity: item(6),
                transform: `translateY(${(1 - item(6)) * 10}px) scale(${1 + 0.05 * camPop})`,
                transformOrigin: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: CY - 23,
                  width: 46,
                  height: 46,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ position: "absolute", opacity: 1 - camOn }}>
                  <VideoOff size={44} color={MUTED} strokeWidth={1.9} />
                </div>
                <div style={{ position: "absolute", opacity: camOn }}>
                  <VideoIcon size={44} color="#ffffff" strokeWidth={1.9} />
                </div>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 60,
                  top: CY - 8,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: mix(DOT_OFF, DOT_ON, camOn),
                  boxShadow: `0 0 ${14 * camOn}px rgba(52,199,89,${0.8 * camOn})`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 88,
                  top: CY - 22,
                  width: 120,
                  fontFamily: font,
                  fontSize: 34,
                  fontWeight: 400,
                  color: mix([154, 162, 178], [215, 219, 228], camOn),
                  whiteSpace: "nowrap",
                }}
              >
                Camera
              </div>
              <div style={{ position: "absolute", left: 218, top: CY - 13 }}>
                <ChevronDown size={26} color={MUTED} strokeWidth={2.1} />
              </div>
            </div>

            {/* microphone source */}
            <div
              style={{
                position: "absolute",
                left: MIC_X,
                top: 0,
                width: MIC_W,
                height: BAR_H,
                opacity: item(7),
                transform: `translateY(${(1 - item(7)) * 10}px)`,
              }}
            >
              <div style={{ position: "absolute", left: 0, top: CY - 20 }}>
                <Mic size={40} color={LABEL} strokeWidth={1.9} />
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 54,
                  top: CY - 8,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: AMBER,
                  transform: `scale(${1 + 0.4 * level})`,
                  boxShadow: `0 0 ${10 + 18 * level}px rgba(240,168,60,${0.35 + 0.5 * level})`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 82,
                  top: CY - 22,
                  width: 330,
                  fontFamily: font,
                  fontSize: 34,
                  fontWeight: 400,
                  color: LABEL,
                  whiteSpace: "nowrap",
                }}
              >
                MacBook Pro Microp…
              </div>
              <div style={{ position: "absolute", left: 422, top: CY - 13 }}>
                <ChevronDown size={26} color={MUTED} strokeWidth={2.1} />
              </div>
            </div>
          </div>
        </div>

        <Cursor
          x={cursorX}
          y={posY(frame)}
          scale={dyn.scale}
          rotate={dyn.rotate}
        />

        {/* Mode tooltips live OUTSIDE the bar — it clips its own overflow, so
            anything sitting above it has to be a sibling. */}
        {MODES.map((mode, i) => {
          const o = interpolate(
            frame,
            [mode.from, mode.from + 8, mode.until, mode.until + 8],
            [0, 1, 1, 0],
            clamp,
          );
          return (
            <div
              key={mode.label}
              id={`mode-tip-${i}`}
              style={{
                position: "absolute",
                left: barLeft + MODE_X + i * 94 + BTN / 2,
                top: barTop + float + barY + push - TOOLTIP_LIFT,
                opacity: o,
                transform: `translateX(-50%) translateY(${(1 - o) * 10}px)`,
                padding: "13px 30px",
                borderRadius: 14,
                background: "rgba(28,28,32,0.94)",
                boxShadow: "0 14px 34px rgba(8,6,14,0.38)",
                color: "#ffffff",
                fontFamily: font,
                fontSize: 34,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              {mode.label}
            </div>
          );
        })}
        </div>
      </Layer>
    </Camera>
  );
}
