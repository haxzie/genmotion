import {
  Camera,
  Layer,
  Video,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { Cursor, cursorDynamics } from "../components/Cursor";
import { BrowserWindow, BROWSER_W, BROWSER_H } from "../components/BrowserWindow";
import {
  WORLD,
  DOCK_CX,
  CAM_HANDOFF,
  OUT_BLUR,
  DesktopPlane,
  FrostedBackdrop,
} from "../components/desktop";
import faceCam from "../assets/YTDown.com_YouTube_The-ROCK-Eyebrow-4K-60fps_Media_sVlgcSKJBz0_002_720p.mp4";

/* ---- the composition stage (screen coords, then shifted into the world) ---- */
const SCREEN_OFF_X = 1660;
const SCREEN_OFF_Y = 540;
const wx = (x: number) => x + SCREEN_OFF_X;
const wy = (y: number) => y + SCREEN_OFF_Y;

const ST_W = 1260;
const ST_H = 709;
const ST_L = (1920 - ST_W) / 2;
const ST_T = 60;

/* ---- the layout picker, dock-style ---- */
const TILE_W = 160;
const TILE_H = 90;
const TILE_GAP = 18;
const DOCK_PAD = 28;
const DOCK_W = 5 * TILE_W + 4 * TILE_GAP + DOCK_PAD * 2;
const DOCK_L = (1920 - DOCK_W) / 2;
const DOCK_T = 850;
const DOCK_H = TILE_H + DOCK_PAD * 2;
const tileL = (i: number) => DOCK_L + DOCK_PAD + i * (TILE_W + TILE_GAP);
const TILE_SCALE = TILE_W / ST_W;

const BLUE = "#4e84f9";

/* Every layout is the same two rectangles in different places, so the change
   between any two is a straight interpolation of ten numbers. */
type Layout = {
  name: string;
  sx: number; sy: number; sw: number; sh: number; sr: number;
  cx: number; cy: number; cw: number; ch: number; cr: number;
  co: number;
};

const LAYOUTS: Layout[] = [
  { name: "Screen",
    sx: 78, sy: 44, sw: 1104, sh: 621, sr: 14,
    cx: 934, cy: 417, cw: 224, ch: 224, cr: 52, co: 0 },
  { name: "Screen + Camera",
    sx: 78, sy: 44, sw: 1104, sh: 621, sr: 14,
    cx: 934, cy: 417, cw: 224, ch: 224, cr: 52, co: 1 },
  { name: "Side by side",
    sx: 44, sy: 135, sw: 780, sh: 439, sr: 14,
    cx: 856, cy: 135, cw: 360, ch: 439, cr: 28, co: 1 },
  { name: "Stacked",
    sx: 240, sy: 44, sw: 780, sh: 439, sr: 14,
    cx: 555, cy: 499, cw: 150, ch: 150, cr: 36, co: 1 },
  { name: "Camera focus",
    sx: 102, sy: 451, sw: 338, sh: 190, sr: 10,
    cx: 78, cy: 44, cw: 1104, ch: 621, cr: 16, co: 1 },
];

/* click at `at`, morph over the next 24 frames, pointer arrives 2 frames before */
const STEPS = [
  { at: 82, to: 2 },
  { at: 132, to: 3 },
  { at: 182, to: 4 },
  { at: 232, to: 0 },
];
const START = 1;
const MORPH = 24;
/* the camera sits above the screen until it becomes the full-frame plate in
   "Camera focus" — flipped during the Stacked morph, where they never overlap */
const Z_FLIP = 182;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/* aggressive through the middle, at rest on both ends */
const EASE_MOVE = Easing.bezier(0.65, 0, 0.35, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function Scene() {
  const frame = useCurrentFrame();

  /* resolves out of scene 3's swell-and-blur exit */
  const settle = interpolate(frame, [0, 16], [0, 1], { easing: Easing.outSmooth, ...clamp });
  const recede = interpolate(frame, [8, 32], [0, 1], { easing: Easing.outSmooth, ...clamp });
  const stageIn = interpolate(frame, [12, 36], [0, 1], { easing: Easing.outSmooth, ...clamp });
  const dockIn = interpolate(frame, [28, 50], [0, 1], { easing: Easing.outSmooth, ...clamp });
  /* the picker clears at the end, leaving the chrome window alone to carry the
     cut — scene 5 pops its own dock into the same slot */
  const dockOut = interpolate(frame, [264, 286], [0, 1], {
    easing: Easing.inOutCubic,
    ...clamp,
  });

  /* --- which layout are we on, and how far through the change --- */
  let prev = START;
  let cur = START;
  let t = 1;
  for (const s of STEPS) {
    if (frame >= s.at) {
      prev = cur;
      cur = s.to;
      t = interpolate(frame, [s.at, s.at + MORPH], [0, 1], {
        easing: Easing.outSmooth,
        ...clamp,
      });
    }
  }
  const A = LAYOUTS[prev];
  const B = LAYOUTS[cur];
  const L = {
    sx: lerp(A.sx, B.sx, t), sy: lerp(A.sy, B.sy, t),
    sw: lerp(A.sw, B.sw, t), sh: lerp(A.sh, B.sh, t), sr: lerp(A.sr, B.sr, t),
    cx: lerp(A.cx, B.cx, t), cy: lerp(A.cy, B.cy, t),
    cw: lerp(A.cw, B.cw, t), ch: lerp(A.ch, B.ch, t), cr: lerp(A.cr, B.cr, t),
    co: lerp(A.co, B.co, t),
  };

  /* --- pointer: hold, travel, arrive, THEN click. Each step gets a "depart"
         keyframe holding the previous tile so the move stays a brisk 22 frames
         instead of smearing across the whole gap. --- */
  const times: number[] = [36];
  const xs: number[] = [2983];
  const ys: number[] = [1504];
  let lastX = 2983;
  let lastY = 1504;
  for (const s of STEPS) {
    const tx = wx(tileL(s.to) + TILE_W / 2);
    const ty = wy(DOCK_T + DOCK_PAD + TILE_H / 2);
    times.push(s.at - 24, s.at - 2);
    xs.push(lastX, tx);
    ys.push(lastY, ty);
    lastX = tx;
    lastY = ty;
  }
  // Snappier than inOutCubic but still at rest on both ends, so it whips across
  // the middle of each move without jerking out of a hold.
  const posX = (f: number) => interpolate(f, times, xs, { easing: EASE_MOVE, ...clamp });
  const posY = (f: number) => interpolate(f, times, ys, { easing: EASE_MOVE, ...clamp });
  const cursorX = posX(frame);
  const cursorY = posY(frame);
  const press = STEPS.reduce(
    (m, s) => Math.max(m, interpolate(frame, [s.at - 4, s.at, s.at + 6], [0, 1, 0], clamp)),
    0,
  );
  const dyn = cursorDynamics(frame, posX, posY, press);

  /* caption crosses through zero at the midpoint of each change */

  const camAbove = frame < Z_FLIP;

  const screenEl = (
    <div
      key="screen"
      style={{
        position: "absolute",
        left: L.sx,
        top: L.sy,
        width: L.sw,
        height: L.sh,
        borderRadius: L.sr,
        overflow: "hidden",
        boxShadow: "0 22px 60px rgba(0,0,0,0.55)",
      }}
    >
      {/* drawn at a fixed size and scaled, so the chrome never reflows as the
          layout resizes the screen */}
      <div
        style={{
          width: BROWSER_W,
          height: BROWSER_H,
          transform: `scale(${L.sw / BROWSER_W})`,
          transformOrigin: "top left",
        }}
      >
        <BrowserWindow />
      </div>
    </div>
  );

  const camEl = (
    <div
      key="cam"
      style={{
        position: "absolute",
        left: L.cx,
        top: L.cy,
        width: L.cw,
        height: L.ch,
        borderRadius: L.cr,
        overflow: "hidden",
        opacity: L.co,
        border: "2px solid rgba(255,255,255,0.34)",
        boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
      }}
    >
      <Video
        src={faceCam}
        loop
        volume={0}
        style={{ width: L.cw, height: L.ch, objectFit: "cover", display: "block" }}
      />
    </div>
  );

  return (
    <Camera
      world={WORLD}
      style={{ background: "#070a12" }}
      keyframes={[{ at: 0, x: CAM_HANDOFF, y: 0.5, zoom: 1 }]}
    >
      <Layer>
        {/* Opens at exactly the scale and blur scene 3 exits on, then settles.
            Scene 3 already dissolved the recording UI, so nothing replays it. */}
        {/* Same <DesktopPlane/> and same (absent) transform as scene 3, so the
            wallpaper is pixel-identical across the cut — only the filter moves. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            filter: `blur(${OUT_BLUR - (OUT_BLUR - 30) * settle}px) brightness(${1 - 0.62 * recede})`,
          }}
        >
          <DesktopPlane />
        </div>

        {/* ---------- the composition ---------- */}
        <div
          id="stage"
          style={{
            position: "absolute",
            left: wx(ST_L),
            top: wy(ST_T),
            width: ST_W,
            height: ST_H,
            borderRadius: 20,
            opacity: stageIn,
            transform: `scale(${0.95 + 0.05 * stageIn})`,
          }}
        >
          {camAbove ? [screenEl, camEl] : [camEl, screenEl]}
        </div>

        {/* ---------- layout picker ---------- */}
        <div
          id="layout-dock"
          style={{
            position: "absolute",
            left: wx(DOCK_L),
            top: wy(DOCK_T) + (1 - dockIn) * 230 + dockOut * 260,
            width: DOCK_W,
            height: DOCK_H,
            borderRadius: 30,
            overflow: "hidden",
            opacity: dockIn * (1 - dockOut),
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "0 30px 70px rgba(2,4,10,0.55), inset 0 1px 0 rgba(255,255,255,0.16)",
          }}
        >
          <FrostedBackdrop left={wx(DOCK_L)} top={wy(DOCK_T)} blur={40} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(18,22,32,0.72)" }} />

          {LAYOUTS.map((lay, i) => (
            <div
              key={lay.name}
              id={`layout-tile-${i}`}
              style={{
                position: "absolute",
                left: DOCK_PAD + i * (TILE_W + TILE_GAP),
                top: DOCK_PAD,
                width: TILE_W,
                height: TILE_H,
                borderRadius: 10,
                overflow: "hidden",
                background: "rgba(255,255,255,0.07)",
                border: i === cur ? `3px solid ${BLUE}` : "1px solid rgba(255,255,255,0.18)",
                transform: `scale(${i === cur ? 1 - 0.06 * press : 1})`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: lay.sx * TILE_SCALE,
                  top: lay.sy * TILE_SCALE,
                  width: lay.sw * TILE_SCALE,
                  height: lay.sh * TILE_SCALE,
                  borderRadius: 3,
                  background: "rgba(232,238,250,0.92)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: lay.cx * TILE_SCALE,
                  top: lay.cy * TILE_SCALE,
                  width: lay.cw * TILE_SCALE,
                  height: lay.ch * TILE_SCALE,
                  borderRadius: Math.max(2, lay.cr * TILE_SCALE),
                  background: "rgba(20,24,34,0.88)",
                  border: "1px solid rgba(255,255,255,0.45)",
                  opacity: lay.co,
                }}
              />
            </div>
          ))}
        </div>

        <Cursor x={cursorX} y={cursorY} scale={dyn.scale} rotate={dyn.rotate} />
      </Layer>
    </Camera>
  );
}
