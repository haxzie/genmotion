import {
  Camera,
  Layer,
  Img,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { brand, font, squircle } from "../components/brand";
import { DesktopPlane, FrostedBackdrop } from "../components/desktop";
import { Cursor } from "../components/Cursor";
import prequelLogo from "../assets/prequel-logo.svg";
import chrome from "../assets/app-chrome.svg";
import figma from "../assets/app-figma.svg";
import notion from "../assets/app-notion.svg";
import spotify from "../assets/app-spotify.svg";
import sublime from "../assets/app-sublime.svg";
import github from "../assets/app-github.svg";
import linear from "../assets/app-linear.svg";
import framer from "../assets/app-framer.svg";
import telegram from "../assets/app-telegram.svg";
import obsidian from "../assets/app-obsidian.svg";
import discord from "../assets/app-discord.svg";
import xApp from "../assets/app-x.svg";
import gmail from "../assets/app-gmail.svg";

/* ---- world geometry (world = 2x the frame, so 3840 x 2160) ---- */
const WORLD = 2;
const WORLD_W = 1920 * WORLD;
const WORLD_H = 1080 * WORLD;
const ICON = 220;
const GAP = 44;
const PITCH = ICON + GAP; // 264
const PAD = 34;
const DOCK_X = 100;
const DOCK_H = ICON + PAD * 2; // 288
const DOCK_TOP = 1080 - DOCK_H / 2; // vertically centred in the world
const cx = (i: number) => DOCK_X + PAD + i * PITCH + ICON / 2;
const DOCK_W = PAD * 2 + 14 * ICON + 13 * GAP;

const APPS = [
  { id: "chrome", src: chrome, tint: "#4285f4" },
  { id: "figma", src: figma, tint: "#f24e1e" },
  { id: "notion", src: notion, tint: "#1f1f22" },
  { id: "spotify", src: spotify, tint: "#1db954" },
  { id: "sublime", src: sublime, tint: "#ff8f1f" },
  { id: "github", src: github, tint: "#24292e" },
  { id: "linear", src: linear, tint: "#5e6ad2" },
  { id: "framer", src: framer, tint: "#0055ff" },
  { id: "telegram", src: telegram, tint: "#229ed9" },
  { id: "prequel", src: prequelLogo, tint: brand.iconBase },
  { id: "obsidian", src: obsidian, tint: "#7c3aed" },
  { id: "discord", src: discord, tint: "#5865f2" },
  { id: "x", src: xApp, tint: "#101014" },
  { id: "gmail", src: gmail, tint: "#ea4335" },
];

const PQ = 9; // index of Prequel in the dock
const PQ_X = cx(PQ); // 2620
const CAM_END = PQ_X / WORLD_W; // frames Prequel dead centre

/* ---- timing ---- */
const RISE_END = 20;
const PAN_START = 24;
const PAN_END = 78;
const CURSOR_START = 10;
const SETTLE_START = 78;
const CURSOR_END = 104;
const CLICK = 104;
const BOUNCE = 110;
const LEAVE = 130;

const EASE_IN = Easing.bezier(0.55, 0.085, 0.68, 0.53);
const EASE_OUT = Easing.bezier(0.25, 0.46, 0.45, 0.94);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export default function Scene() {
  const frame = useCurrentFrame();

  // The dock rises into view — picking up the upward motion scene 1 exited on.
  // The app is launching, so the whole dock retreats downward as one — tray,
  // icons and all. Declared up here because the magnification gate below needs
  // the dock's live vertical offset. Scene 3 picks the motion up and brings the
  // recording bar down into the empty desktop it leaves behind.
  const dockOut = interpolate(frame, [LEAVE, LEAVE + 18], [0, 1], { easing: EASE_IN, ...clamp });
  const dockDown = 760 * dockOut;

  const riseY = interpolate(frame, [0, RISE_END], [700, 0], {
    easing: Easing.outSmooth,
    ...clamp,
  });

  // The cursor lives on the desktop, in world space, and LEADS the camera —
  // it is the reason the shot pans.
  //
  // What you SEE is (cursor world x - camera centre), so if the two use different
  // easings the difference wobbles and can even run backwards mid-pan. During the
  // pan the cursor therefore shares the camera's exact window and easing, which
  // makes its screen path a clean monotonic glide. Frames 10-PAN_START are the
  // lead-in that motivates the pan, while the camera is still parked.
  const sweepX = interpolate(frame, [CURSOR_START, PAN_START, PAN_END], [200, 420, 2480], {
    easing: Easing.inOutCubic,
    ...clamp,
  });
  // The sweep decelerates to a standstill, so the correction has to ease IN from
  // rest as well — an `out` curve here starts at full speed and the cursor visibly
  // lurches the instant the pan lands. It also waits for the camera to fully stop,
  // so the two moves read as sequential rather than fighting each other.
  const settleX = interpolate(frame, [SETTLE_START, CURSOR_END], [2480, 2628], {
    easing: Easing.inOutCubic,
    ...clamp,
  });
  const cursorWorldX = sweepX + (settleX - 2480);

  // Scene 1 already parks the pointer at the dock's height, so there is no climb
  // — it holds that line all the way across and only drops onto the icon at the
  // end. One axis of movement instead of two reads as a much cleaner path.
  const cursorWorldY = interpolate(frame, [SETTLE_START, CURSOR_END], [1150, 1106], {
    easing: Easing.inOutCubic,
    ...clamp,
  });

  // Magnification tracks the dock's ACTUAL position, not its resting line —
  // otherwise the icons would swell while the dock is still rising into frame.
  const vDist = Math.abs(cursorWorldY - (1080 + riseY + dockDown));
  const cursorOn = Math.max(0, Math.min(1, 1 - (vDist - 110) / 320));

  // Fully opaque from frame 0 — scene 1 hands the pointer over already resting at
  // screen (200, 1020), which is exactly world (200, 1560) under this camera.
  // No fade-out either: it is still on the desktop when the dock leaves, and
  // scene 3 picks it up from where this scene ends.
  const cursorOpacity = 1;

  // Click: cursor dips, icon presses in.
  const press = interpolate(frame, [CLICK, CLICK + 4, CLICK + 9], [0, 1, 0], clamp);

  // A single quick hop — the app is launching, so the dock doesn't linger.
  const hopUp = interpolate(frame, [BOUNCE, BOUNCE + 12], [0, 1], { easing: EASE_OUT, ...clamp });
  const hopDown = interpolate(frame, [BOUNCE + 12, BOUNCE + 22], [0, 1], { easing: EASE_IN, ...clamp });
  const bounceY = -150 * (hopUp - hopDown);

  // Hover tooltip, the way macOS names an app under the pointer.
  const tipIn = interpolate(frame, [96, 105], [0, 1], { easing: Easing.outSmooth, ...clamp });
  const tipOut = interpolate(frame, [CLICK + 2, CLICK + 12], [0, 1], { easing: Easing.outSmooth, ...clamp });
  const tip = tipIn * (1 - tipOut);

  return (
    <Camera
      world={WORLD}
      style={{ background: "#141018" }}
      keyframes={[
        { at: 0, x: 0.25, y: 0.5, zoom: 1 },
        { at: PAN_START, x: 0.25, y: 0.5, zoom: 1 },
        // Easing stated explicitly: the cursor's sweep matches it exactly, and
        // that pairing is the only thing keeping its screen path monotonic.
        { at: PAN_END, x: CAM_END, y: 0.5, zoom: 1, ease: Easing.inOutCubic },
      ]}
    >
      <Layer>
        <DesktopPlane />

        <div style={{ position: "absolute", inset: 0, transform: `translateY(${riseY + dockDown}px)` }}>
          {/* Frosted dock tray — a blurred copy of the wallpaper, clipped to the
              tray and registered to the same world coordinates, so it refracts
              the actual desktop underneath it the way Aqua glass does. */}
          <div
            id="dock-tray"
            style={{
              position: "absolute",
              left: DOCK_X,
              top: DOCK_TOP,
              width: DOCK_W,
              height: DOCK_H,
              borderRadius: 58,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.34)",
              boxShadow:
                "0 34px 80px rgba(12,8,16,0.42), 0 2px 6px rgba(12,8,16,0.22), inset 0 1px 0 rgba(255,255,255,0.42)",
            }}
          >
            <FrostedBackdrop left={DOCK_X} top={DOCK_TOP} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.20) 100%)",
              }}
            />
          </div>

          {APPS.map((app, i) => {
            const isPQ = i === PQ;

            // macOS dock magnification, driven by pointer distance.
            const d = Math.abs(cursorWorldX - cx(i));
            const raw = Math.max(0, Math.min(1, 1 - d / 400));
            const m = raw * raw * (3 - 2 * raw) * cursorOn;

            const scale = (1 + 0.22 * m) * (isPQ ? 1 - 0.07 * press : 1);
            const y = -30 * m + (isPQ ? bounceY : 0);

            return (
              <div
                key={app.id}
                id={`dock-${app.id}`}
                style={{
                  position: "absolute",
                  left: cx(i) - ICON / 2,
                  top: DOCK_TOP + PAD,
                  width: ICON,
                  height: ICON,
                  transform: `translateY(${y}px) scale(${scale})`,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: `${squircle * 100}%`,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: app.tint,
                    boxShadow:
                      "0 14px 30px rgba(12,8,16,0.38), inset 0 1px 0 rgba(255,255,255,0.24)",
                  }}
                >
                  <Img
                    src={app.src}
                    style={
                      isPQ
                        ? { width: "100%", height: "100%", objectFit: "cover", display: "block" }
                        : { width: ICON * 0.52, height: ICON * 0.52, objectFit: "contain", display: "block" }
                    }
                  />
                </div>
              </div>
            );
          })}

          {/* hover label */}
          <div
            id="dock-tooltip"
            style={{
              position: "absolute",
              left: PQ_X,
              top: 828,
              opacity: tip,
              transform: `translateX(-50%) translateY(${(1 - tipIn) * 12 + tipOut * -14}px)`,
              padding: "13px 30px",
              borderRadius: 14,
              background: "rgba(28,28,32,0.94)",
              boxShadow: "0 14px 34px rgba(20,16,30,0.22)",
              color: "#ffffff",
              fontFamily: font,
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            Prequel
          </div>
        </div>

        {/* Cursor sits on the desktop plane, not the screen, so the camera
            travels with it instead of dragging it around. */}
        <Cursor
          x={cursorWorldX}
          y={cursorWorldY}
          scale={1 - 0.14 * press}
          opacity={cursorOpacity}
        />
      </Layer>
    </Camera>
  );
}
