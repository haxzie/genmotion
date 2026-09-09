import {
  Camera,
  Layer,
  Overlay,
  Img,
  Easing,
  interpolate,
  spring,
  springPresets,
  useCurrentFrame,
  useVideoConfig,
} from "@genmotion/motion";
import { icon, wallpaper } from "../components/assets";

/* ------------------------------------------------------------------ *
 * A macOS dock in Liquid Glass, seen up close.
 *
 * The glass is the real thing: a backdrop-filter layer run through an
 * SVG feTurbulence + feDisplacementMap so the desktop behind it is
 * genuinely WARPED, then a flat tint and a hairline gradient rim. The
 * blur is only a few px — liquid glass is refraction, not frosting.
 *
 * Notion is the constant: it never changes, never drifts, and sits dead
 * centre of frame throughout. Everything else — the desktop and the six
 * icons around it — HARD CUTS to a new set, accelerating from 1.0s to
 * 0.27s. Then a cursor arrives, clicks Notion, it bounces out of the
 * dock, and the whole desktop flashes away to leave the logo on white.
 *
 * Layout: the whole dock fits the frame with a slight gap. Seven slots at
 * 224px is the most that fits, and an odd count is what keeps Notion dead
 * centre. At the tightest point of the push (zoom 1.03) the frame shows
 * 1864px and the dock spans 1784 — 40px of air each side.
 * ------------------------------------------------------------------ */

const WORLD = 3;
const FRAME_W = 1920;
const FRAME_H = 1080;
const WORLD_W = FRAME_W * WORLD;
const WORLD_H = FRAME_H * WORLD;

const ICON = 224;
const GAP = 28;
const SLOT = ICON + GAP;
const PAD_X = 24;
const PAD_TOP = 22;
const PAD_BOTTOM = 26;
const DOCK_H = PAD_TOP + ICON + PAD_BOTTOM; // 272
const RADIUS = 71;
const RIM = 2; // hairline border thickness

const MAX_ZOOM = 1.03; // any tighter and the dock loses its gap

const CENTER = 3;
const SLOTS = 7; // 3 either side of Notion

const FIRST_BEAT = 30; // 1.0s
const LAST_BEAT = 8; // 0.27s

/* Eight workflows. Each set is the six slots around Notion, left to
 * right, paired with a desktop that gives the glass a different colour. */
const SETS = [
  {
    bg: "landscape-01-landscape-photography-of-mountains",
    apps: ["gemini", "chatgpt", "claude", "perplexity", "ms-copilot", "grammarly"],
  },
  {
    bg: "landscape-16-vestrahorn-mountain-reflected-in-the-wet-black",
    apps: ["procreate", "canva", "figma", "sketch", "pixelmator-pro", "photomator"],
  },
  {
    bg: "space-05-northern-lights-over-snow-capped-mountian",
    apps: ["terminal", "ghostty", "docker", "raycast", "xcode", "warp"],
  },
  {
    bg: "landscape-22-a-dense-forest-of-golden-larch-trees-below-jag",
    apps: ["telegram", "discord", "slack", "whatsapp", "zoom", "signal"],
  },
  {
    bg: "ocean-15-clear-turquoise-water-with-sunlight-patterns-r",
    apps: ["reeder", "obsidian", "bear", "things-3", "todoist", "drafts"],
  },
  {
    bg: "cityscape-12-an-aerial-view-of-the-manhattan-skyline-at-nig",
    apps: ["ms-onenote", "ms-excel", "ms-word", "ms-powerpoint", "ms-outlook", "keynote"],
  },
  {
    bg: "landscape-09-rolling-sand-dunes-in-desert-landscape",
    apps: ["garageband", "logic-pro", "final-cut-pro", "photos", "music", "imovie"],
  },
  {
    bg: "architecture-10-architectural-photography-of-glass-building",
    apps: ["istat-menus", "1password", "cleanmymac", "dropbox", "bitwarden", "magnet"],
  },
];

/* Beat lengths ramp linearly from 1.0s to 0.27s, so the cuts accelerate. */
const BEATS = (() => {
  const n = SETS.length;
  const out: { start: number; dur: number }[] = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const dur = Math.round(FIRST_BEAT + (LAST_BEAT - FIRST_BEAT) * (i / (n - 1)));
    out.push({ start: acc, dur });
    acc += dur;
  }
  return out;
})();
const BEATS_END = BEATS[BEATS.length - 1].start + BEATS[BEATS.length - 1].dur; // 152

/* --- the outro: cursor, click, bounce, flash to white --------------- */
const CURSOR_START = BEATS_END; // 152
const CURSOR_LAND = CURSOR_START + 16; // 168 — arrives on Notion
const PRESS_END = CURSOR_LAND + 4; // 172 — press and release
const BOUNCE_START = PRESS_END; // 172
const BOUNCE_END = BOUNCE_START + 20; // 192 — one full up-and-down
const WHITE_START = BOUNCE_END; // 192
const WHITE_END = WHITE_START + 14; // 206
const TOTAL = WHITE_END + 12; // 218

const BOUNCE_H = 200; // how far out of the dock the icon jumps

const DOCK_W = SLOTS * ICON + (SLOTS - 1) * GAP + PAD_X * 2; // 1784
const DOCK_LEFT = (WORLD_W - DOCK_W) / 2;
const DOCK_TOP = (WORLD_H - DOCK_H) / 2;
const ICON_TOP = DOCK_TOP + PAD_TOP;

// Notion lives OUTSIDE the dock element so the bounce isn't clipped by
// the dock's overflow, and so it can survive the desktop flashing away.
const NOTION_MAG = 1.08; // its permanent dock magnification
const NOTION_LEFT = DOCK_LEFT + PAD_X + CENTER * SLOT;
const NOTION_CX = NOTION_LEFT + ICON / 2;
/* The icon scales from its BOTTOM edge, the way dock icons grow, so its
 * visual centre is NOT the centre of its box — it sits (ICON*MAG)/2 above
 * the bottom. Aiming the camera at the box centre leaves the logo ~9px
 * high of frame centre, which is what made it jump into the next scene. */
const NOTION_CY = ICON_TOP + ICON - (ICON * NOTION_MAG) / 2;
const FOCUS_Y = NOTION_CY / WORLD_H;

// What the logo actually measures on screen once the camera is at MAX_ZOOM.
// Scene 2 opens with exactly this number.
export const NOTION_HANDOFF_PX = ICON * NOTION_MAG * MAX_ZOOM;

/* The desktop only has to cover what the camera can ever see, so it is
 * sized just over a frame rather than stretched across the whole world —
 * that keeps a 3840px photo downscaled and sharp instead of upscaled. */
const DESK_W = 2400;
const DESK_H = 1350;
const DESK_LEFT = (WORLD_W - DESK_W) / 2;
const DESK_TOP = (WORLD_H - DESK_H) / 2;

/* Cursor geometry. The arrow is drawn in a 24x32 box with its tip at
 * (3,2), so the tip is what we actually aim at Notion. */
const CUR_H = 88;
const CUR_K = CUR_H / 32;
const CUR_W = 24 * CUR_K;
const TIP_X = 3 * CUR_K;
const TIP_Y = 2 * CUR_K;
const CUR_FROM = { x: 3980, y: 2380 }; // off-frame, bottom right
const CUR_TO = { x: NOTION_CX + 14, y: NOTION_CY + 30 };

// slot index (0..5) -> dock position (0..6), skipping Notion's seat
const slotToPos = (s: number) => (s < CENTER ? s : s + 1);

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // which set is on screen — a hard cut, no blending
  let beat = 0;
  for (let i = 0; i < BEATS.length; i++) {
    if (frame >= BEATS[i].start) beat = i;
  }
  const next = Math.min(beat + 1, SETS.length - 1);
  const cur = SETS[beat];
  const upcoming = SETS[next];

  const dockIn = interpolate(frame, [0, 12], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- ambient: smooth, and deliberately NOT tied to the cuts ----------
  const t = frame / fps;
  const sweep = interpolate(frame, [0, TOTAL], [-1150, 1150], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glowPulse = 0.4 + Math.sin(t * 0.7) * 0.12;

  // --- outro ------------------------------------------------------------
  // cursor glides in and decelerates onto the icon
  const travel = interpolate(frame, [CURSOR_START, CURSOR_LAND], [0, 1], {
    easing: Easing.outCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const curX = CUR_FROM.x + (CUR_TO.x - CUR_FROM.x) * travel;
  const curY = CUR_FROM.y + (CUR_TO.y - CUR_FROM.y) * travel;
  // a quick dip on the press
  const pressP = interpolate(frame, [CURSOR_LAND, PRESS_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorScale = 1 - 0.14 * Math.sin(pressP * Math.PI);

  // the dock-launch bounce: a true parabola, so it is fast off the floor,
  // hangs at the apex and accelerates back down — the way gravity reads
  const bp = interpolate(frame, [BOUNCE_START, BOUNCE_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bounceY = -BOUNCE_H * 4 * bp * (1 - bp);

  // everything but Notion flashes away
  const whiteP = interpolate(frame, [WHITE_START, WHITE_END], [0, 1], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorOpacity =
    interpolate(frame, [CURSOR_START, CURSOR_START + 4], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * (1 - whiteP);

  const deskStyle = {
    position: "absolute" as const,
    left: DESK_LEFT,
    top: DESK_TOP,
    width: DESK_W,
    height: DESK_H,
    objectFit: "cover" as const,
    filter: "saturate(1.08) brightness(0.82)",
  };

  // Notion's own entrance, then its permanent 1.08 dock magnification
  const notionIn = spring({
    frame,
    fps,
    config: springPresets.gentle,
    durationInFrames: 14,
    delay: 2,
  });

  return (
    <Camera
      world={WORLD}
      perspective={2}
      style={{ backgroundColor: "#05050a" }}
      /* the drift has to die before the cut — an oscillating sway means the
         logo is in a different place on every frame, and the next scene
         cannot match a moving target */
      drift={{ amount: 4 * (1 - whiteP), speed: 0.18 }}
      keyframes={[
        { at: 0, x: 0.5, y: FOCUS_Y, zoom: 1 },
        // reached before the flash, then held, so the boundary is locked
        { at: WHITE_START, x: 0.5, y: FOCUS_Y, zoom: MAX_ZOOM, ease: Easing.inOutCubic },
      ]}
    >
      <Layer>
        {/* the displacement map that does the actual refracting */}
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
          <defs>
            <filter
              id="glass-distortion"
              x="-25%"
              y="-25%"
              width="150%"
              height="150%"
              filterUnits="objectBoundingBox"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.006 0.010"
                numOctaves={2}
                seed={17}
                result="noise"
              />
              <feGaussianBlur in="noise" stdDeviation={4} result="softMap" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="softMap"
                scale={48}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        {/* ---------- the desktop, cutting on every beat ---------- */}
        <div
          id="desktop"
          style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}
        >
          <Img id="desktop-current" src={wallpaper(cur.bg).src} style={deskStyle} />
          {/* mounted but invisible, so the next cut has nothing left to decode */}
          <Img src={wallpaper(upcoming.bg).src} style={{ ...deskStyle, opacity: 0 }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(72% 58% at 50% 52%, rgba(0,0,0,0) 0%, rgba(3,3,8,0.45) 100%)",
            }}
          />
        </div>

        {/* ---------- the dock ---------- */}
        <div
          id="dock"
          style={{
            position: "absolute",
            left: DOCK_LEFT,
            top: DOCK_TOP,
            zIndex: 1,
            width: DOCK_W,
            height: DOCK_H,
            borderRadius: RADIUS,
            overflow: "hidden",
            isolation: "isolate",
            opacity: dockIn * (1 - whiteP),
            boxShadow:
              "0 18px 20px rgba(0,0,0,0.28), 0 0 60px rgba(0,0,0,0.18), 0 2px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* 1. effect — blur the backdrop a touch, then warp it */}
          <div
            id="dock-glass-effect"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              backdropFilter: "blur(4px) saturate(1.35)",
              WebkitBackdropFilter: "blur(4px) saturate(1.35)",
              filter: "url(#glass-distortion)",
              isolation: "isolate",
            }}
          />

          {/* 2. tint — the body of the material */}
          <div
            id="dock-glass-tint"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              backgroundColor: "rgba(255,255,255,0.22)",
            }}
          />

          {/* 3a. a soft interior glow, so the thin rim still reads as thick glass */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              borderRadius: RADIUS,
              boxShadow: "inset 0 0 26px rgba(255,255,255,0.13)",
            }}
          />

          {/* 3b. shine — a hairline rim, brightest at the top-left corner and
              falling off around the curve, with a little bounce coming back at
              the bottom-right. Drawn as a gradient masked to a ring so the
              colour can vary along the border, which a plain border cannot. */}
          <div
            id="dock-glass-shine"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              borderRadius: RADIUS,
              padding: RIM,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.62) 14%, rgba(255,255,255,0.26) 34%, rgba(255,255,255,0.12) 55%, rgba(255,255,255,0.16) 78%, rgba(255,255,255,0.38) 100%)",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              pointerEvents: "none",
            }}
          />

          {/* travelling specular highlight — one slow pass over the whole shot */}
          <div
            id="dock-specular"
            style={{
              position: "absolute",
              left: DOCK_W / 2 - 450,
              top: -DOCK_H,
              zIndex: 2,
              width: 900,
              height: DOCK_H * 3,
              transform: `translateX(${sweep}px) rotate(16deg)`,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 42%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.08) 58%, rgba(255,255,255,0) 100%)",
            }}
          />

          {/* a focused pool of light where Notion sits */}
          <div
            id="notion-glow"
            style={{
              position: "absolute",
              zIndex: 2,
              left: PAD_X + CENTER * SLOT + ICON / 2 - 193,
              top: PAD_TOP + ICON / 2 - 193,
              width: 386,
              height: 386,
              borderRadius: 193,
              background: `radial-gradient(circle, rgba(255,255,255,${glowPulse * 0.5}) 0%, rgba(255,255,255,${glowPulse * 0.16}) 38%, rgba(255,255,255,0) 68%)`,
            }}
          />

          {/* ---------- the six that cut every beat ---------- */}
          {cur.apps.map((slug, s) => {
            const pos = slotToPos(s);
            const dist = Math.abs(pos - CENTER);

            // first beat only: the dock assembles centre-out
            const p = spring({
              frame,
              fps,
              config: springPresets.gentle,
              durationInFrames: 14,
              delay: 2 + dist * 2,
            });
            const enter = frame < BEATS[1].start ? p : 1;

            const mag = 1 + 0.08 * Math.exp(-(dist * dist) / 1.6);
            const float = Math.sin(t * 0.7 + pos * 1.1) * 2;

            return (
              <div
                key={`slot-${s}`}
                id={`dock-slot-${s}`}
                style={{
                  position: "absolute",
                  zIndex: 3,
                  left: PAD_X + pos * SLOT,
                  top: PAD_TOP,
                  width: ICON,
                  height: ICON,
                  opacity: enter,
                  transform: `translateY(${(1 - enter) * 24 + float}px) scale(${(enter < 1 ? 0.84 + p * 0.16 : 1) * mag})`,
                  transformOrigin: "50% 100%",
                }}
              >
                <Img src={icon(slug).src} style={FACE} />
                {/* pre-mounted so the hard cut can never catch an undecoded icon */}
                <Img src={icon(upcoming.apps[s]).src} style={{ ...FACE, opacity: 0 }} />
              </div>
            );
          })}

          {/* running-app indicators */}
          {Array.from({ length: SLOTS }, (_, pos) => {
            const dist = Math.abs(pos - CENTER);
            const p = spring({
              frame,
              fps,
              config: springPresets.gentle,
              durationInFrames: 12,
              delay: 8 + dist * 2,
            });
            return (
              <div
                key={`dot-${pos}`}
                id={`dock-dot-${pos}`}
                style={{
                  position: "absolute",
                  zIndex: 3,
                  left: PAD_X + pos * SLOT + ICON / 2 - 5,
                  top: PAD_TOP + ICON + 8,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  opacity: p * 0.8,
                  backgroundColor: "rgba(255,255,255,0.92)",
                  boxShadow: "0 0 7px rgba(255,255,255,0.45)",
                }}
              />
            );
          })}
        </div>

        {/* ---------- the desktop flashes away ---------- */}
        <div
          id="white-out"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            backgroundColor: "#ffffff",
            opacity: whiteP,
          }}
        />

        {/* ---------- Notion: outside the dock, so it can bounce clear
             of it and survive the flash ---------- */}
        <div
          id="dock-icon-notion"
          style={{
            position: "absolute",
            zIndex: 3,
            left: NOTION_LEFT,
            top: ICON_TOP,
            width: ICON,
            height: ICON,
            opacity: notionIn,
            transform: `translateY(${(1 - notionIn) * 24 + bounceY}px) scale(${(0.84 + notionIn * 0.16) * NOTION_MAG})`,
            transformOrigin: "50% 100%",
          }}
        >
          <Img
            src={icon("notion").src}
            style={{
              ...FACE,
              // the shadow belongs to the dock; it goes with everything else
              filter: `drop-shadow(0 ${8 * (1 - whiteP)}px ${14 * (1 - whiteP)}px rgba(0,0,0,${0.42 * (1 - whiteP)}))`,
            }}
          />
        </div>

        {/* ---------- the cursor ---------- */}
        {frame >= CURSOR_START && (
          <div
            id="cursor"
            style={{
              position: "absolute",
              zIndex: 4,
              left: curX - TIP_X,
              top: curY - TIP_Y,
              width: CUR_W,
              height: CUR_H,
              opacity: cursorOpacity,
              transform: `scale(${cursorScale})`,
              transformOrigin: `${TIP_X}px ${TIP_Y}px`,
            }}
          >
            <svg width={CUR_W} height={CUR_H} viewBox="0 0 24 32" aria-hidden>
              <path
                d="M3 2 L3 25 L9.2 19.2 L13.2 28.4 L17.6 26.5 L13.7 17.6 L21 17.2 Z"
                fill="#ffffff"
                stroke="#16161a"
                strokeWidth={1.6}
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </Layer>

      {/* welded to the frame so the push doesn't drag it around */}
      <Overlay>
        <div
          id="vignette"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 1 - whiteP,
            background:
              "radial-gradient(80% 68% at 50% 50%, rgba(0,0,0,0) 42%, rgba(3,3,8,0.5) 100%)",
          }}
        />
      </Overlay>
    </Camera>
  );
}

const FACE = {
  position: "absolute" as const,
  left: 0,
  top: 0,
  width: ICON,
  height: ICON,
  objectFit: "contain" as const,
  display: "block" as const,
  filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.42))",
};
