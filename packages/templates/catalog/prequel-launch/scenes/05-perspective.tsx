import {
  Camera,
  Layer,
  Overlay,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { Upload, Pencil, Share2 } from "lucide-react";
import { font } from "../components/brand";
import { Cursor, cursorDynamics } from "../components/Cursor";
import { BrowserWindow, BROWSER_W } from "../components/BrowserWindow";
import {
  WORLD,
  DOCK_CX,
  CAM_HANDOFF,
  OUT_BLUR,
  DesktopPlane,
  FrostedBackdrop,
} from "../components/desktop";

/* ---- the chrome window, exactly where scene 4 leaves it ---- */
const WIN_W = 1104;
const WIN_H = 621;
const WIN_L = 2068;
const WIN_T = 644;
const PERSPECTIVE = 2200;
const TILE_PERSPECTIVE = 420;

/* ---- the preset dock, in the same slot scene 4's picker vacated ---- */
const TILE_W = 160;
const TILE_H = 90;
const TILE_GAP = 18;
const DOCK_PAD = 28;
const DOCK_W = 5 * TILE_W + 4 * TILE_GAP + DOCK_PAD * 2;
const DOCK_L = (1920 - DOCK_W) / 2;
const DOCK_T = 850;
const DOCK_H = TILE_H + DOCK_PAD * 2;
const tileCX = (i: number) => DOCK_L + DOCK_PAD + i * (TILE_W + TILE_GAP) + TILE_W / 2;
const TILE_CY = DOCK_T + DOCK_PAD + TILE_H / 2;

const BLUE = "#4e84f9";

/* Each preset is three rotations, a push along Z, and a scale — so moving
   between any two is a straight interpolation and the window genuinely swings
   and dollies rather than cutting.
   `z` is authored as a depth push because that is how the move is designed, but
   it is APPLIED as the equivalent magnification. A real Z translation inside a
   <Camera> pins the browser's raster scale, and the camera's own zoom would then
   blow up a stale texture instead of redrawing the chrome. */
type View = { name: string; rx: number; ry: number; rz: number; z: number; s: number };
const VIEWS: View[] = [
  { name: "Flat", rx: 0, ry: 0, rz: 0, z: 0, s: 1 },
  { name: "Left", rx: 5, ry: 26, rz: -1.5, z: 100, s: 1.02 },
  { name: "Right", rx: 5, ry: -26, rz: 1.5, z: 150, s: 1.04 },
  { name: "Recline", rx: 26, ry: 0, rz: 0, z: -120, s: 0.95 },
  { name: "Hero", rx: 13, ry: 19, rz: -3.5, z: 200, s: 1.05 },
];

const START = 0;
const STEPS = [
  { at: 34, to: 2 },
  { at: 88, to: 4 },
];
const MORPH = 22;

/* ---- the export beat ---- */
const DOCK_OUT = 112;
const EXPORT_IN = 122;
const EXPORT_CLICK = 160;
const BLAST = 162;
const ACT_W = 220;
const ACT_H = 76;
const ACT_GAP = 16;
const ACT_PAD = 24;
const ACT_DOCK_W = 3 * ACT_W + 2 * ACT_GAP + ACT_PAD * 2;
const ACT_DOCK_H = ACT_H + ACT_PAD * 2;
const ACT_DOCK_L = (1920 - ACT_DOCK_W) / 2;
const ACT_DOCK_T = 846;
const actL = (i: number) => ACT_PAD + i * (ACT_W + ACT_GAP);
const EXPORT_IDX = 2;
const GREEN = "#2ea44f";
const ACTIONS = [
  { label: "Edit", Icon: Pencil },
  { label: "Share", Icon: Share2 },
  { label: "Export", Icon: Upload },
];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EASE_MOVE = Easing.bezier(0.65, 0, 0.35, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The magnification a depth push of `z` would produce under a given lens. */
const zoomOf = (z: number, s: number, p: number) => s * (p / (p - z));

export default function Scene() {
  const frame = useCurrentFrame();

  /* the dock pops back up into the slot scene 4 emptied */
  const dockIn = interpolate(frame, [2, 18], [0, 1], { easing: Easing.outSmooth, ...clamp });

  /* --- which preset, and how far through the swing --- */
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
  const A = VIEWS[prev];
  const B = VIEWS[cur];
  const V = {
    rx: lerp(A.rx, B.rx, t),
    ry: lerp(A.ry, B.ry, t),
    rz: lerp(A.rz, B.rz, t),
    z: lerp(A.z, B.z, t),
    s: lerp(A.s, B.s, t),
  };

  /* --- the picker gives way to Export --- */
  const dockOut = interpolate(frame, [DOCK_OUT, DOCK_OUT + 18], [0, 1], {
    easing: Easing.inOutCubic,
    ...clamp,
  });
  const exportIn = interpolate(frame, [EXPORT_IN, EXPORT_IN + 18], [0, 1], {
    easing: Easing.outSmooth,
    ...clamp,
  });

  /* --- the click blows the page up to fill the frame, and it goes white --- */
  const blast = interpolate(frame, [BLAST, BLAST + 24], [0, 1], {
    easing: Easing.bezier(0.5, 0, 0.85, 0.3),
    ...clamp,
  });
  const flash = interpolate(frame, [BLAST + 8, BLAST + 24], [0, 1], {
    easing: Easing.outSmooth,
    ...clamp,
  });

  /* --- pointer: hold, travel, arrive, then click --- */
  const times: number[] = [0];
  const xs: number[] = [tileCX(START)];
  const ys: number[] = [TILE_CY];
  let lastX = tileCX(START);
  for (const s of STEPS) {
    times.push(s.at - 20, s.at - 2);
    xs.push(lastX, tileCX(s.to));
    ys.push(TILE_CY, TILE_CY);
    lastX = tileCX(s.to);
  }
  times.push(EXPORT_CLICK - 22, EXPORT_CLICK - 2);
  xs.push(lastX, ACT_DOCK_L + actL(EXPORT_IDX) + ACT_W / 2);
  ys.push(TILE_CY, ACT_DOCK_T + ACT_PAD + ACT_H / 2);

  const posX = (f: number) => interpolate(f, times, xs, { easing: EASE_MOVE, ...clamp });
  const posY = (f: number) => interpolate(f, times, ys, { easing: EASE_MOVE, ...clamp });
  const cursorX = posX(frame);
  const cursorY = posY(frame);
  const press = [...STEPS.map((s) => s.at), EXPORT_CLICK].reduce(
    (m, at) => Math.max(m, interpolate(frame, [at - 4, at, at + 6], [0, 1, 0], clamp)),
    0,
  );
  const dyn = cursorDynamics(frame, posX, posY, press);

  return (
    <Camera
      world={WORLD}
      style={{ background: "#070a12" }}
      keyframes={[
        { at: 0, x: CAM_HANDOFF, y: 0.5, zoom: 1 },
        { at: 80, x: 0.694, y: 0.478, zoom: 1.06, ease: Easing.inOutCubic },
        { at: 160, x: 0.668, y: 0.492, zoom: 1.12, ease: Easing.inOutCubic },
      ]}
    >
      <Layer>
        {/* matches scene 4's settled background exactly */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            filter: `blur(${OUT_BLUR - 8}px) brightness(0.38)`,
          }}
        >
          <DesktopPlane />
        </div>

        {/* the window carries the cut, then starts swinging in 3D */}
        <div
          id="chrome-stage"
          style={{
            position: "absolute",
            left: WIN_L,
            top: WIN_T,
            width: WIN_W,
            height: WIN_H,
            perspective: PERSPECTIVE,
          }}
        >
          <div
            id="chrome-window"
            style={{
              width: WIN_W,
              height: WIN_H,
              borderRadius: 14,
              overflow: "hidden",
              /* on export the angles unwind to square-on as it rushes the lens */
              transform: `rotateX(${V.rx * (1 - blast)}deg) rotateY(${V.ry * (1 - blast)}deg) rotateZ(${V.rz * (1 - blast)}deg) scale(${zoomOf(V.z, V.s, PERSPECTIVE) * (1 + blast * 6.5)})`,
              boxShadow: "0 50px 120px rgba(0,0,0,0.62), 0 10px 30px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                width: BROWSER_W,
                height: BROWSER_W * (WIN_H / WIN_W),
                transform: `scale(${WIN_W / BROWSER_W})`,
                transformOrigin: "top left",
              }}
            >
              <BrowserWindow />
            </div>
          </div>
        </div>
      </Layer>

      {/* The dock is screen furniture — the camera pans past the window, not
          past the controls. */}
      <Overlay>
        <div
          id="view-dock"
          style={{
            position: "absolute",
            left: DOCK_L,
            top: DOCK_T + (1 - dockIn) * 240 + dockOut * 260,
            width: DOCK_W,
            height: DOCK_H,
            borderRadius: 30,
            overflow: "hidden",
            opacity: dockIn * (1 - dockOut),
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "0 30px 70px rgba(2,4,10,0.55), inset 0 1px 0 rgba(255,255,255,0.16)",
          }}
        >
          <FrostedBackdrop left={DOCK_CX - 1920 / 2 + DOCK_L} top={540 + DOCK_T} blur={40} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(18,22,32,0.72)" }} />

          {VIEWS.map((v, i) => (
            <div
              key={v.name}
              id={`view-tile-${i}`}
              style={{
                position: "absolute",
                left: DOCK_PAD + i * (TILE_W + TILE_GAP),
                top: DOCK_PAD,
                width: TILE_W,
                height: TILE_H,
                borderRadius: 10,
                background: "rgba(255,255,255,0.07)",
                border: i === cur ? `3px solid ${BLUE}` : "1px solid rgba(255,255,255,0.18)",
                transform: `scale(${i === cur ? 1 - 0.06 * press : 1})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                perspective: TILE_PERSPECTIVE,
              }}
            >
              {/* the tile previews its own preset, from the same numbers */}
              <div
                style={{
                  width: 104,
                  height: 58,
                  borderRadius: 5,
                  background: "rgba(232,238,250,0.9)",
                  boxShadow: "0 6px 14px rgba(0,0,0,0.45)",
                  /* same depth push, resolved against the tile's own lens */
                  transform: `rotateX(${v.rx}deg) rotateY(${v.ry}deg) rotateZ(${v.rz}deg) scale(${zoomOf(v.z, v.s, PERSPECTIVE)})`,
                }}
              />
            </div>
          ))}
        </div>

        {/* ---------- action dock ---------- */}
        <div
          id="export-button"
          style={{
            position: "absolute",
            left: ACT_DOCK_L,
            top: ACT_DOCK_T + (1 - exportIn) * 240,
            width: ACT_DOCK_W,
            height: ACT_DOCK_H,
            borderRadius: 30,
            overflow: "hidden",
            opacity: exportIn * (1 - flash),
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "0 30px 70px rgba(2,4,10,0.55), inset 0 1px 0 rgba(255,255,255,0.16)",
          }}
        >
          <FrostedBackdrop
            left={DOCK_CX - 1920 / 2 + ACT_DOCK_L}
            top={540 + ACT_DOCK_T}
            blur={40}
          />
          <div style={{ position: "absolute", inset: 0, background: "rgba(18,22,32,0.72)" }} />

          {ACTIONS.map(({ label, Icon }, i) => {
            const primary = i === EXPORT_IDX;
            return (
              <div
                key={label}
                id={`action-${label.toLowerCase()}`}
                style={{
                  position: "absolute",
                  left: actL(i),
                  top: ACT_PAD,
                  width: ACT_W,
                  height: ACT_H,
                  borderRadius: 18,
                  background: primary ? GREEN : "rgba(255,255,255,0.08)",
                  border: primary ? "none" : "1px solid rgba(255,255,255,0.16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  transform: `scale(${primary ? 1 - 0.06 * press : 1})`,
                  boxShadow: primary
                    ? `0 14px 34px rgba(46,164,79,${0.4 * exportIn})`
                    : "none",
                }}
              >
                <Icon size={28} color="#ffffff" strokeWidth={2} />
                <span
                  style={{
                    fontFamily: font,
                    fontSize: 30,
                    fontWeight: 500,
                    color: "#ffffff",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <Cursor
          x={cursorX}
          y={cursorY}
          scale={dyn.scale}
          rotate={dyn.rotate}
          opacity={1 - flash}
        />

        {/* The page rushes the lens and blacks out. This is scene 6's page
            colour, so the cut lands on an already-dark frame. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#0f0f0f",
            opacity: flash,
          }}
        />
      </Overlay>
    </Camera>
  );
}
