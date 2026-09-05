import { AbsoluteFill, Img, Easing, interpolate, stagger, useCurrentFrame } from "@genmotion/motion";
import {
  Search,
  ArrowRight,
  MousePointer2,
  ArrowLeft,
  RotateCw,
  Star,
  Puzzle,
  MoreVertical,
  Plus,
} from "lucide-react";
import { brand } from "../components/brand";
import { source } from "../components/integrations";

/** Chrome (macOS, light) drawn at real proportions, magnified to fill frame. */
const S = 2.4;
const px = (n: number) => n * S;

// --- chrome ----------------------------------------------------------------
const STRIP_H = px(40);
const TAB_W = px(240);
const TAB_H = px(34);
const TAB_X = px(80);
const BAR_Y = STRIP_H;
const BAR_H = px(40);
const PAGE_Y = BAR_Y + BAR_H;

const C_FRAME = "#dee1e6";
const C_ICON = "#5f6368";
const C_OMNI = "#f1f3f4";
const C_TEXT = "#202124";
const C_TAB_TEXT = "#3c4043";

// --- the new-tab page ------------------------------------------------------
const IN_W = 1400;
const IN_H = 130;
const IN_X = 960 - IN_W / 2;
const IN_Y = 476;
const MID_Y = IN_Y + IN_H / 2;

const GO = 96;
const GO_CX = IN_X + IN_W - 22 - GO / 2;

// a circle centred on the button has to reach the far corner to cover frame
const REACH = Math.hypot(Math.max(GO_CX, 1920 - GO_CX), Math.max(MID_Y, 1080 - MID_Y));

const SHORTCUTS = [
  { id: "google-analytics", label: "Analytics" },
  { id: "stripe", label: "Stripe" },
  { id: "hubspot", label: "HubSpot" },
  { id: "posthog", label: "PostHog" },
  { id: "mixpanel", label: "Mixpanel" },
];
const TILE = 130;
const TILE_GAP = 70;
const TILES_W = SHORTCUTS.length * TILE + (SHORTCUTS.length - 1) * TILE_GAP;

// --- beats -----------------------------------------------------------------
const PAGE_IN = 0;
const TYPE_IN = 26;
const SPEED = 3;
const CURSOR_IN = 56;
const CURSOR_LAND = 92;
const CLICK = 96;
const EXPAND = 100;
const EXPAND_END = 134;

const URL = "sequel.sh";
const TYPE_END = TYPE_IN + URL.length * SPEED;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = { ...clamp, easing: Easing.inOutCubic } as const;

export default function Scene() {
  const frame = useCurrentFrame();

  const pageIn = interpolate(frame, [PAGE_IN, PAGE_IN + 16], [0, 1], {
    ...clamp,
    easing: Easing.outSmooth,
  });

  const typed = Math.max(0, Math.min(URL.length, Math.floor((frame - TYPE_IN) / SPEED)));
  const typing = frame >= TYPE_IN && frame < TYPE_END;
  const blink = Math.floor(frame / 15) % 2 === 0 ? 1 : 0;
  const caret = typing ? 1 : blink;

  const curX = interpolate(frame, [CURSOR_IN, CURSOR_LAND], [1720, GO_CX - 12], {
    ...clamp,
    easing: Easing.outCubic,
  });
  const curY = interpolate(frame, [CURSOR_IN, CURSOR_LAND], [960, MID_Y - 10], ease);
  const curOp = interpolate(
    frame,
    [CURSOR_IN, CURSOR_IN + 8, EXPAND, EXPAND + 6],
    [0, 1, 1, 0],
    clamp
  );

  const hover = interpolate(frame, [CURSOR_LAND - 10, CURSOR_LAND], [0, 1], clamp);
  const press = interpolate(frame, [CLICK, CLICK + 4, CLICK + 10], [0, 1, 0], clamp);

  // the button becomes the frame
  const expand = interpolate(frame, [EXPAND, EXPAND_END], [GO / 2, REACH], ease);

  return (
    <AbsoluteFill id="scene-root" style={{ background: C_FRAME, fontFamily: brand.font }}>
      {/* ---- tab strip ---- */}
      <div style={{ position: "absolute", left: px(20), top: STRIP_H / 2 - px(6), display: "flex", gap: px(8) }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: px(12), height: px(12), borderRadius: 999, background: c }} />
        ))}
      </div>

      <div
        id="new-tab"
        style={{
          position: "absolute",
          left: TAB_X,
          top: STRIP_H - TAB_H,
          width: TAB_W,
          height: TAB_H,
          borderRadius: `${px(8)}px ${px(8)}px 0 0`,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          paddingLeft: px(16),
          fontSize: px(12),
          color: C_TEXT,
          whiteSpace: "nowrap",
        }}
      >
        New Tab
      </div>

      <div
        style={{
          position: "absolute",
          left: TAB_X + TAB_W + px(6),
          top: STRIP_H - TAB_H / 2 - px(14),
          width: px(28),
          height: px(28),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Plus size={px(18)} color={C_ICON} strokeWidth={1.8} />
      </div>

      {/* ---- toolbar ---- */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: BAR_Y,
          height: BAR_H,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          paddingLeft: px(12),
          paddingRight: px(12),
          gap: px(8),
        }}
      >
        <ArrowLeft size={px(18)} color="#b6b9bd" strokeWidth={1.8} />
        <ArrowRight size={px(18)} color="#b6b9bd" strokeWidth={1.8} />
        <RotateCw size={px(17)} color={C_ICON} strokeWidth={1.8} />
        <div
          style={{
            flex: 1,
            marginLeft: px(10),
            marginRight: px(10),
            height: px(28),
            borderRadius: 999,
            background: C_OMNI,
            display: "flex",
            alignItems: "center",
            paddingLeft: px(14),
            gap: px(10),
            fontSize: px(13),
            color: "#7b7f83",
          }}
        >
          <Search size={px(14)} color={C_ICON} strokeWidth={2} />
          Search Google or type a URL
        </div>
        <Star size={px(16)} color={C_ICON} strokeWidth={1.8} />
        <Puzzle size={px(17)} color={C_ICON} strokeWidth={1.8} />
        <MoreVertical size={px(17)} color={C_ICON} strokeWidth={1.8} />
      </div>

      {/* ---- new-tab page ---- */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: PAGE_Y,
          bottom: 0,
          background: "#ffffff",
        }}
      />

      {/* the start input */}
      <div
        id="start-input"
        style={{
          position: "absolute",
          left: IN_X,
          top: IN_Y,
          width: IN_W,
          height: IN_H,
          borderRadius: 999,
          background: "#ffffff",
          border: "1px solid #dfe1e5",
          boxShadow: "0 2px 10px rgba(32,33,36,0.10), 0 10px 34px rgba(32,33,36,0.08)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 44,
          paddingRight: 22,
          gap: 26,
          boxSizing: "border-box",
          opacity: pageIn,
          transform: `translateY(${(1 - pageIn) * 22}px)`,
        }}
      >
        <Search size={42} color={C_ICON} strokeWidth={2.2} />

        <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <span
            style={{
              fontSize: 56,
              color: C_TEXT,
              letterSpacing: "-0.01em",
              whiteSpace: "pre",
            }}
          >
            {URL.slice(0, typed)}
          </span>
          <span
            style={{
              width: 3,
              height: 62,
              marginLeft: 4,
              background: C_TEXT,
              opacity: caret,
              flexShrink: 0,
            }}
          />
        </div>

        <div
          id="go-button"
          style={{
            width: GO,
            height: GO,
            borderRadius: 999,
            background: "#0a0a0b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transform: `scale(${1 - press * 0.08 + hover * 0.04})`,
            boxShadow: `0 4px ${16 + hover * 14}px rgba(10,10,11,${0.20 + hover * 0.18})`,
          }}
        >
          <ArrowRight size={44} color="#ffffff" strokeWidth={2.4} />
        </div>
      </div>

      {/* most-visited shortcuts */}
      <div
        style={{
          position: "absolute",
          left: 960 - TILES_W / 2,
          top: 726,
          width: TILES_W,
          display: "flex",
          gap: TILE_GAP,
        }}
      >
        {SHORTCUTS.map((s, i) => {
          const p = stagger({ frame, index: i, each: 3, duration: 14, delay: PAGE_IN + 6 });
          return (
            <div
              key={s.id}
              style={{
                width: TILE,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                opacity: p,
                transform: `translateY(${(1 - p) * 12}px)`,
              }}
            >
              <div
                style={{
                  width: TILE,
                  height: TILE,
                  borderRadius: 999,
                  background: "#f1f3f4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Img
                  src={source(s.id).src}
                  style={{ width: 62, height: 62, objectFit: "contain" }}
                />
              </div>
              <span style={{ fontSize: 30, color: C_TAB_TEXT, whiteSpace: "nowrap" }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* the button expands until it IS the frame */}
      <div
        id="black-wipe"
        style={{
          position: "absolute",
          left: GO_CX - expand,
          top: MID_Y - expand,
          width: expand * 2,
          height: expand * 2,
          borderRadius: 999,
          background: "#0a0a0b",
          opacity: frame >= EXPAND ? 1 : 0,
        }}
      />

      <div
        id="cursor"
        style={{
          position: "absolute",
          left: curX + press * 3,
          top: curY + press * 3,
          opacity: curOp,
        }}
      >
        <MousePointer2 size={52} color="#ffffff" fill="#0a0a0b" strokeWidth={1.4} />
      </div>
    </AbsoluteFill>
  );
}
