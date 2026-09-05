import {
  Camera,
  Layer,
  Overlay,
  Img,
  Video,
  CountText,
  TextAnimation,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import {
  Menu,
  Search,
  Mic,
  Bell,
  Video as VideoIcon,
  Play,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Download,
} from "lucide-react";
import { font, brand, squircle } from "../components/brand";
import { Cursor, cursorDynamics } from "../components/Cursor";
import prequelLogo from "../assets/prequel-logo.svg";
import { BrowserWindow, BROWSER_W, BROWSER_H } from "../components/BrowserWindow";
import faceCam from "../assets/YTDown.com_YouTube_The-ROCK-Eyebrow-4K-60fps_Media_sVlgcSKJBz0_002_720p.mp4";
import thumb1 from "../assets/pasted-2026-08-27T11-10-52.jpg";
import thumb2 from "../assets/pasted-2026-08-27T11-11-13.jpg";
import thumb3 from "../assets/pasted-2026-08-27T11-11-50.jpg";
import thumb4 from "../assets/pasted-2026-08-27T11-12-17.jpg";
import thumb5 from "../assets/pasted-2026-08-27T11-13-15.jpg";

/* ---- page furniture ---- */
const BAR_H = 80;
const PV_L = 80;
const PV_T = 110;
const PV_W = 1120;
const PV_H = 630;

const SIDE_L = 1300;
const SIDE_W = 540;
const THUMB_W = 200;
const THUMB_H = 113;

/* ---- the exported composition, playing inside the player ---- */
const SHOT_W = 840;
const SHOT_H = SHOT_W * (BROWSER_H / BROWSER_W);
const BUBBLE = 150;

const SHELF = [thumb1, thumb2, thumb3, thumb4, thumb5];

/* ---- dark palette ---- */
const BG = "#0f0f0f";
const SURFACE = "#272727";
const SURFACE_2 = "#1f1f1f";
const INK = "#f1f1f1";
const MUTED = "#aaaaaa";
const HAIR = "#303030";
const SCRUB = "#ff0033";

/* ---- the closing beat: the mark rises, gets clicked, and the frame fills ---- */
const LOGO = 200;
const RAISE_A = 150;
const RAISE_B = 172;
const CLICK = 194;
const BURST = 196;
export const LOGO_CY = 540;
/* reaches the far corners from the logo's own centre */
const BURST_R = 1150;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export default function Scene() {
  const frame = useCurrentFrame();

  /* resolves out of scene 5's white-out */
  const inP = interpolate(frame, [4, 30], [0, 1], { easing: Easing.outSmooth, ...clamp });
  const rise = (d: number) =>
    interpolate(frame, [10 + d, 34 + d], [0, 1], { easing: Easing.outSmooth, ...clamp });

  const progress = interpolate(frame, [0, 220], [0.18, 0.68], { easing: Easing.linear, ...clamp });

  /* The exported clip has its own camera move — the page keeps swinging through
     perspective the whole time it plays. Sine-driven rather than keyframed, so
     it never comes to rest, and the periods are deliberately mismatched so the
     axes don't sync up into an obvious loop. */
  const shot = {
    rx: 9 + Math.sin(frame / 70) * 5,
    ry: 4 + Math.sin(frame / 55 + 1.2) * 18,
    rz: -1 + Math.sin(frame / 90) * 3,
    s: 1.04 + Math.sin(frame / 80 + 0.6) * 0.05,
  };

  /* --- closing beat --- */
  const raise = interpolate(frame, [RAISE_A, RAISE_B], [0, 1], {
    easing: Easing.outSmooth,
    ...clamp,
  });
  const logoCY = 1300 + (LOGO_CY - 1300) * raise;
  const dim = interpolate(frame, [RAISE_A + 6, RAISE_B], [0, 0.62], {
    easing: Easing.outSmooth,
    ...clamp,
  });

  const curX = (f: number) =>
    interpolate(f, [168, 192], [1420, 986], { easing: Easing.inOutCubic, ...clamp });
  const curY = (f: number) =>
    interpolate(f, [168, 192], [900, 566], { easing: Easing.inOutCubic, ...clamp });
  const press = interpolate(frame, [CLICK - 4, CLICK, CLICK + 6], [0, 1, 0], clamp);
  const dyn = cursorDynamics(frame, curX, curY, press);
  const curFade = interpolate(frame, [160, 172, BURST, BURST + 6], [0, 1, 1, 0], clamp);

  /* the fill opens out from under the mark, quickly */
  const burst = interpolate(frame, [BURST, BURST + 16], [0, 1], {
    easing: Easing.bezier(0.35, 0, 0.6, 1),
    ...clamp,
  });

  const pill = (w: number) => ({
    height: 52,
    borderRadius: 26,
    background: SURFACE,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 14,
    width: w,
  });

  return (
    <Camera
      world={1}
      style={{ background: BG }}
      keyframes={[
        { at: 0, x: 0.5, y: 0.5, zoom: 1 },
        { at: 130, x: 0.5, y: 0.47, zoom: 1.12, ease: Easing.inOutCubic },
        { at: 220, x: 0.5, y: 0.49, zoom: 1.2, ease: Easing.inOutCubic },
      ]}
    >
      <Layer>
        <div style={{ position: "absolute", inset: 0, background: BG }} />

        {/* ---------- top bar ---------- */}
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: BAR_H, opacity: inP }}>
          <div style={{ position: "absolute", left: 34, top: 26 }}>
            <Menu size={28} color={INK} strokeWidth={2} />
          </div>
          {/* platform mark — a red play glyph */}
          <div
            style={{
              position: "absolute",
              left: 92,
              top: 22,
              width: 52,
              height: 36,
              borderRadius: 9,
              background: "#ff0033",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Play size={18} color="#ffffff" strokeWidth={0} fill="#ffffff" />
          </div>

          {/* search */}
          <div
            style={{
              position: "absolute",
              left: 600,
              top: 18,
              width: 560,
              height: 46,
              borderRadius: "23px 0 0 23px",
              border: `1px solid ${HAIR}`,
              background: "#121212",
              display: "flex",
              alignItems: "center",
              paddingLeft: 22,
            }}
          >
            <span style={{ fontFamily: font, fontSize: 24, color: "#717171" }}>Search</span>
          </div>
          <div
            style={{
              position: "absolute",
              left: 1160,
              top: 18,
              width: 74,
              height: 46,
              borderRadius: "0 23px 23px 0",
              border: `1px solid ${HAIR}`,
              background: SURFACE_2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Search size={24} color={INK} strokeWidth={2} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 1256,
              top: 18,
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: SURFACE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Mic size={22} color={INK} strokeWidth={2} />
          </div>

          <div style={{ position: "absolute", left: 1668, top: 27 }}>
            <VideoIcon size={26} color={INK} strokeWidth={1.9} />
          </div>
          <div style={{ position: "absolute", left: 1734, top: 27 }}>
            <Bell size={26} color={INK} strokeWidth={1.9} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 1800,
              top: 20,
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "linear-gradient(140deg,#e14b15,#ac1860)",
            }}
          />
        </div>

        {/* ---------- the player ---------- */}
        <div
          id="player"
          style={{
            position: "absolute",
            left: PV_L,
            top: PV_T,
            width: PV_W,
            height: PV_H,
            borderRadius: 16,
            overflow: "hidden",
            background: "#000000",
            opacity: inP,
            transform: `scale(${0.97 + 0.03 * inP})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: (PV_W - SHOT_W) / 2,
              top: (PV_H - SHOT_H) / 2 - 10,
              width: SHOT_W,
              height: SHOT_H,
              perspective: 1600,
            }}
          >
            <div
              style={{
                width: SHOT_W,
                height: SHOT_H,
                borderRadius: 12,
                overflow: "hidden",
                transform: `rotateX(${shot.rx}deg) rotateY(${shot.ry}deg) rotateZ(${shot.rz}deg) scale(${shot.s})`,
                boxShadow: "0 40px 90px rgba(0,0,0,0.6)",
              }}
            >
              <div
                style={{
                  width: BROWSER_W,
                  height: BROWSER_H,
                  transform: `scale(${SHOT_W / BROWSER_W})`,
                  transformOrigin: "top left",
                }}
              >
                <BrowserWindow />
              </div>
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              right: 46,
              bottom: 78,
              width: BUBBLE,
              height: BUBBLE,
              borderRadius: "30%",
              overflow: "hidden",
              border: "2px solid rgba(255,255,255,0.35)",
              boxShadow: "0 14px 34px rgba(0,0,0,0.5)",
            }}
          >
            <Video
              src={faceCam}
              loop
              volume={0}
              style={{ width: BUBBLE, height: BUBBLE, objectFit: "cover", display: "block" }}
            />
          </div>

          {/* scrubber */}
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: PV_W,
              height: 54,
              background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 20,
              width: PV_W,
              height: 5,
              background: "rgba(255,255,255,0.25)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 20,
              width: PV_W * progress,
              height: 5,
              background: SCRUB,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: PV_W * progress - 8,
              bottom: 14,
              width: 17,
              height: 17,
              borderRadius: "50%",
              background: SCRUB,
            }}
          />
        </div>

        {/* ---------- title ---------- */}
        <div
          style={{
            position: "absolute",
            left: PV_L,
            top: 780,
            width: PV_W,
            fontFamily: font,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: INK,
            opacity: rise(0),
            transform: `translateY(${(1 - rise(0)) * 18}px)`,
          }}
        >
          <TextAnimation
            text="Introducing Prequel — cinematic screen recordings"
            by="word"
            preset="fadeUp"
            startFrom={14}
            stagger={1}
            duration={12}
          />
        </div>

        {/* ---------- channel row ---------- */}
        <div
          style={{
            position: "absolute",
            left: PV_L,
            top: 848,
            width: PV_W,
            height: 52,
            opacity: rise(8),
            transform: `translateY(${(1 - rise(8)) * 18}px)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: `linear-gradient(140deg, ${brand.sunsetFrom} 0%, ${brand.sunsetTo} 100%)`,
            }}
          />
          <div
            style={{ position: "absolute", left: 72, top: 0, fontFamily: font, fontSize: 28, fontWeight: 500, color: INK }}
          >
            Prequel
          </div>
          <div
            style={{ position: "absolute", left: 72, top: 32, fontFamily: font, fontSize: 22, color: MUTED }}
          >
            2.4K subscribers
          </div>
          <div
            style={{
              position: "absolute",
              left: 320,
              top: 0,
              height: 52,
              paddingLeft: 30,
              paddingRight: 30,
              borderRadius: 26,
              background: INK,
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ fontFamily: font, fontSize: 24, fontWeight: 600, color: BG }}>
              Subscribe
            </span>
          </div>

          {/* like / dislike, split pill */}
          <div style={{ position: "absolute", left: 512, top: 0, ...pill(212) }}>
            <ThumbsUp size={23} color={INK} strokeWidth={2} />
            <span
              style={{ fontFamily: font, fontSize: 24, color: INK, fontVariantNumeric: "tabular-nums" }}
            >
              <CountText from={1046} to={2418} duration={120} startFrom={16} />
            </span>
            <div style={{ width: 1, height: 26, background: HAIR, marginLeft: 6 }} />
            <ThumbsDown size={23} color={INK} strokeWidth={2} />
          </div>

          <div style={{ position: "absolute", left: 756, top: 0, ...pill(146) }}>
            <Share2 size={23} color={INK} strokeWidth={2} />
            <span style={{ fontFamily: font, fontSize: 24, color: INK }}>Share</span>
          </div>
          <div style={{ position: "absolute", left: 934, top: 0, ...pill(186) }}>
            <Download size={23} color={INK} strokeWidth={2} />
            <span style={{ fontFamily: font, fontSize: 24, color: INK }}>Download</span>
          </div>
        </div>

        {/* ---------- description ---------- */}
        <div
          style={{
            position: "absolute",
            left: PV_L,
            top: 932,
            width: PV_W,
            height: 92,
            borderRadius: 14,
            background: SURFACE_2,
            opacity: rise(14),
            transform: `translateY(${(1 - rise(14)) * 18}px)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 26,
              top: 18,
              fontFamily: font,
              fontSize: 24,
              fontWeight: 600,
              color: INK,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <CountText from={11842} to={18630} duration={120} startFrom={16} />
            <span>{" views"}</span>
            <span style={{ color: MUTED, fontWeight: 400 }}>{"    2 days ago"}</span>
          </div>
          <div
            style={{
              position: "absolute",
              left: 26,
              top: 56,
              width: 680,
              height: 11,
              borderRadius: 6,
              background: "#3a3a3a",
            }}
          />
        </div>

        {/* ---------- up next ---------- */}
        {SHELF.map((src, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: SIDE_L,
              top: PV_T + i * 138,
              width: SIDE_W,
              height: THUMB_H,
              opacity: rise(6 + i * 4),
              transform: `translateY(${(1 - rise(6 + i * 4)) * 16}px)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: THUMB_W,
                height: THUMB_H,
                borderRadius: 10,
                overflow: "hidden",
                background: "#181818",
              }}
            >
              <Img
                src={src}
                style={{
                  width: THUMB_W,
                  height: THUMB_H,
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: 8,
                  bottom: 8,
                  width: 42,
                  height: 18,
                  borderRadius: 4,
                  background: "rgba(0,0,0,0.78)",
                }}
              />
            </div>

            <div
              style={{
                position: "absolute",
                left: THUMB_W + 20,
                top: 4,
                width: 260,
                height: 13,
                borderRadius: 7,
                background: "#4a4a4a",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: THUMB_W + 20,
                top: 28,
                width: 190,
                height: 13,
                borderRadius: 7,
                background: "#3a3a3a",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: THUMB_W + 20,
                top: 66,
                width: 140,
                height: 11,
                borderRadius: 6,
                background: "#333333",
              }}
            />
          </div>
        ))}
      </Layer>

      {/* Screen-locked: the closing beat must not ride the camera's push. */}
      <Overlay>
        <div style={{ position: "absolute", inset: 0, background: "#000000", opacity: dim }} />

        {/* fill opens out from under the mark */}
        <div
          style={{
            position: "absolute",
            left: 960 - burst * BURST_R,
            top: LOGO_CY - burst * BURST_R,
            width: burst * BURST_R * 2,
            height: burst * BURST_R * 2,
            borderRadius: "50%",
            background: "#ffffff",
          }}
        />

        {/* the mark stays on top of the fill — scene 7 opens on exactly this */}
        <div
          id="closing-mark"
          style={{
            position: "absolute",
            left: 960 - LOGO / 2,
            top: logoCY - LOGO / 2,
            width: LOGO,
            height: LOGO,
            borderRadius: `${squircle * 100}%`,
            overflow: "hidden",
            opacity: raise,
            transform: `scale(${(0.82 + 0.18 * raise) * (1 - 0.06 * press)})`,
            boxShadow: "0 30px 70px rgba(0,0,0,0.45)",
          }}
        >
          <Img
            src={prequelLogo}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>

        {/* last, so it sits above the mark it is clicking */}
        <Cursor
          x={curX(frame)}
          y={curY(frame)}
          scale={dyn.scale}
          rotate={dyn.rotate}
          opacity={curFade}
        />
      </Overlay>
    </Camera>
  );
}
