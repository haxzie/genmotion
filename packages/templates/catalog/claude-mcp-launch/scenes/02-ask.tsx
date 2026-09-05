import {
  Camera,
  Layer,
  Img,
  TextAnimation,
  Easing,
  interpolate,
  stagger,
  useCurrentFrame,
} from "@genmotion/motion";
import {
  Plus,
  ChevronDown,
  ArrowUp,
  MousePointer2,
  PenLine,
  GraduationCap,
  Code,
  Coffee,
  Sparkles,
} from "lucide-react";
import claudeMark from "../assets/claude.svg";
import mark from "../assets/sequel-logo.png";
import { brand } from "../components/brand";
import { claude, scale } from "../components/claude";

/** claude.ai's home screen at real proportions, magnified. */
const px = scale(2.2);

// --- world (world={3} of 1920x1080 => 5760x3240) ---------------------------
const WORLD_W = 5760;
const WORLD_H = 3240;
const CX = WORLD_W / 2;

const COL_W = px(740);
const COL_X0 = CX - COL_W / 2;

const GREET_H = px(56);
const COMP_H = px(132);
const CHIP_H = px(36);
const GAP_1 = px(28);
const GAP_2 = px(24);

const STACK_H = GREET_H + GAP_1 + COMP_H + GAP_2 + CHIP_H;
const STACK_Y0 = WORLD_H / 2 - STACK_H / 2;
const COMP_Y0 = STACK_Y0 + GREET_H + GAP_1;
const COMP_Y1 = COMP_Y0 + COMP_H;

const SEND_CX = COL_X0 + COL_W - px(32);
const SEND_CY = COMP_Y1 - px(32);
const TEXT_X = COL_X0 + px(16);

const C_TEXT = claude.text;
const C_MUTED = claude.muted;
const C_BORDER = claude.border;
const C_CORAL = claude.coral;
const SERIF = claude.serif;

// --- beats -----------------------------------------------------------------
const MARK_IN = 4;
const GREET_IN = 10;
const COMP_IN = 14;
const CHIPS_IN = 26;
const PUSH_A = 30;
const PUSH_B = 78;
const TYPE_IN = 74;
const DRIFT_END = 140;
const PAN_A = 148;
const PAN_B = 182; // pulled back: whole composer, sentence and button in frame
const ZOOM_A = 186;
const ZOOM_B = 218; // then in tight on the send button for the click
const CURSOR_IN = 158;
const CURSOR_LAND = 208;
const CLICK = 212;
const SENT = 218;
const END = 250;

// Zoom is capped so the whole sentence stays in frame: at 1.7 the text
// (581 world px) sits well inside the 1129px crop, and the final 1.15 pull-back
// fits the entire composer — sentence and send button together.
const CAM_TYPE_X = 2330;
const CAM_DRIFT_X = 2470;
const CAM_Y_IN = (COMP_Y0 + COMP_Y1) / 2 / WORLD_H;
const ZOOM_TYPE = 1.7;
const ZOOM_SEND = 1.15;
const ZOOM_CLICK = 2.4;

const PROMPT = "How are users finding my product?";
const SPEED = 2; // frames per character
const TYPE_END = TYPE_IN + PROMPT.length * SPEED;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const CHIPS = [
  { id: "write", label: "Write", Icon: PenLine },
  { id: "learn", label: "Learn", Icon: GraduationCap },
  { id: "code", label: "Code", Icon: Code },
  { id: "life", label: "Life stuff", Icon: Coffee },
  { id: "choice", label: "Claude’s choice", Icon: Sparkles },
];

export default function Scene() {
  const frame = useCurrentFrame();

  // the wide shot dissolves as the camera commits to the push
  const pushP = interpolate(frame, [PUSH_A, PUSH_A + 28], [0, 1], {
    ...clamp,
    easing: Easing.inOutCubic,
  });

  const markIn = interpolate(frame, [MARK_IN, MARK_IN + 14], [0, 1], {
    ...clamp,
    easing: Easing.outSmooth,
  });
  const compIn = interpolate(frame, [COMP_IN, COMP_IN + 16], [0, 1], {
    ...clamp,
    easing: Easing.outSmooth,
  });

  const placeholder = interpolate(
    frame,
    [TYPE_IN - 4, TYPE_IN + 2, SENT + 16, SENT + 26],
    [1, 0, 0, 1],
    clamp
  );
  const sent = interpolate(frame, [SENT, SENT + 18], [0, 1], {
    ...clamp,
    easing: Easing.outCubic,
  });

  // the sentence types in, then clears once the message has flown out
  const typed = Math.max(0, Math.min(PROMPT.length, Math.floor((frame - TYPE_IN) / SPEED)));
  const cleared = frame >= SENT + 18;
  const shown = cleared ? "" : PROMPT.slice(0, typed);

  // a real text caret: solid while typing, blinking when idle, gone mid-send
  const typing = frame >= TYPE_IN && frame < TYPE_END;
  const blink = Math.floor(frame / 15) % 2 === 0 ? 1 : 0;
  const caret = sent > 0.02 && !cleared ? 0 : typing ? 1 : blink;

  const press = interpolate(frame, [CLICK, CLICK + 4, CLICK + 10], [0, 1, 0], clamp);
  // Claude swaps send for a stop control once a message is in flight — and in
  // this close-up the button needs to do something after it's pressed
  const stop = interpolate(frame, [CLICK + 4, CLICK + 12], [0, 1], {
    ...clamp,
    easing: Easing.outSmooth,
  });
  const hover = interpolate(frame, [CURSOR_LAND - 10, CURSOR_LAND], [0, 1], clamp);

  // x decelerates while y eases, which bends the cursor path into an arc
  const curX = interpolate(frame, [CURSOR_IN, CURSOR_LAND], [3100, SEND_CX - px(6)], {
    ...clamp,
    easing: Easing.outCubic,
  });
  const curY = interpolate(frame, [CURSOR_IN, CURSOR_LAND], [2020, SEND_CY - px(6)], {
    ...clamp,
    easing: Easing.inOutCubic,
  });
  const curOpacity = interpolate(
    frame,
    [CURSOR_IN, CURSOR_IN + 8, END - 22, END - 12],
    [0, 1, 1, 0],
    clamp
  );

  return (
    <Camera
      world={3}
      style={{
        background: claude.pageGradient,
        fontFamily: brand.font,
      }}
      drift={{ amount: 4, speed: 0.18 }}
      keyframes={[
        { at: 0, x: 0.5, y: 0.5, zoom: 0.95 },
        { at: PUSH_A, x: 0.5, y: 0.5, zoom: 0.95 },
        {
          at: PUSH_B,
          x: CAM_TYPE_X / WORLD_W,
          y: CAM_Y_IN,
          zoom: ZOOM_TYPE,
          ease: Easing.inOutCubic,
        },
        { at: DRIFT_END, x: CAM_DRIFT_X / WORLD_W, ease: Easing.inOutCubic },
        { at: PAN_A, x: CAM_DRIFT_X / WORLD_W },
        { at: PAN_B, x: 0.5, y: CAM_Y_IN, zoom: ZOOM_SEND, ease: Easing.inOutCubic },
        { at: ZOOM_A, x: 0.5, y: CAM_Y_IN, zoom: ZOOM_SEND },
        {
          at: ZOOM_B,
          x: SEND_CX / WORLD_W,
          y: SEND_CY / WORLD_H,
          zoom: ZOOM_CLICK,
          ease: Easing.inOutCubic,
        },
        { at: END, x: SEND_CX / WORLD_W, y: SEND_CY / WORLD_H, zoom: ZOOM_CLICK },
      ]}
    >
      <Layer>
        {/* ---- greeting ---- */}
        <div
          id="claude-greeting"
          style={{
            position: "absolute",
            left: COL_X0,
            top: STACK_Y0,
            width: COL_W,
            height: GREET_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: px(14),
            opacity: 1 - pushP,
          }}
        >
          <Img
            src={claudeMark}
            style={{
              width: px(30),
              height: px(30),
              objectFit: "contain",
              opacity: markIn,
              transform: `scale(${0.6 + markIn * 0.4}) rotate(${(1 - markIn) * -90}deg)`,
            }}
          />
          <span
            style={{
              fontFamily: SERIF,
              fontSize: px(40),
              color: C_TEXT,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            <TextAnimation
              text="Good evening"
              by="word"
              preset="fadeUp"
              startFrom={GREET_IN}
              stagger={3}
              duration={12}
            />
          </span>
        </div>

        {/* ---- composer ---- */}
        <div
          id="claude-composer"
          style={{
            position: "absolute",
            left: COL_X0,
            top: COMP_Y0,
            width: COL_W,
            height: COMP_H,
            borderRadius: px(20),
            background: "#ffffff",
            border: `${px(1)}px solid ${C_BORDER}`,
            boxShadow:
              "0 2px 4px rgba(31,30,29,0.04), 0 12px 32px rgba(31,30,29,0.06), 0 40px 80px rgba(31,30,29,0.05)",
            opacity: compIn,
            transform: `translateY(${(1 - compIn) * px(26)}px)`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: px(16),
            boxSizing: "border-box",
          }}
        >
          <div
            id="prompt-text"
            style={{
              position: "relative",
              height: px(24),
              fontSize: px(16),
              color: C_TEXT,
              letterSpacing: "-0.005em",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                color: "#9c9b93",
                opacity: placeholder,
              }}
            >
              How can I help you today?
            </span>
            {/* typing is hand-rolled so the caret stays glued to the last
                character — <Typewriter>'s own caret is a terminal block */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                opacity: 1 - sent,
                transform: `translateY(${-sent * px(22)}px)`,
              }}
            >
              <span style={{ whiteSpace: "pre" }}>{shown}</span>
              <span
                id="prompt-caret"
                style={{
                  width: px(1.5),
                  height: px(19),
                  marginLeft: px(1),
                  background: C_TEXT,
                  opacity: caret,
                  flexShrink: 0,
                }}
              />
            </div>
          </div>

          <div style={{ height: px(32), display: "flex", alignItems: "center", gap: px(8) }}>
            <div
              style={{
                width: px(30),
                height: px(30),
                borderRadius: 999,
                border: `${px(1)}px solid ${C_BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Plus size={px(16)} color={C_MUTED} strokeWidth={1.8} />
            </div>

            {/* Sequel, connected as a tool */}
            <div
              id="sequel-chip"
              style={{
                height: px(30),
                borderRadius: 999,
                border: `${px(1)}px solid ${C_BORDER}`,
                display: "flex",
                alignItems: "center",
                gap: px(7),
                padding: `0 ${px(12)}px`,
                flexShrink: 0,
              }}
            >
              <Img src={mark} style={{ width: px(15), height: px(15), objectFit: "contain" }} />
              <span style={{ fontSize: px(13), color: C_MUTED, whiteSpace: "nowrap" }}>
                Sequel
              </span>
            </div>

            <div style={{ flex: 1 }} />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: px(4),
                flexShrink: 0,
                marginRight: px(6),
              }}
            >
              <span style={{ fontSize: px(13), color: C_MUTED, whiteSpace: "nowrap" }}>
                Claude Sonnet 4.5
              </span>
              <ChevronDown size={px(13)} color={C_MUTED} strokeWidth={1.8} />
            </div>

            <div
              id="send-button"
              style={{
                width: px(32),
                height: px(32),
                borderRadius: px(9),
                background: C_CORAL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transform: `scale(${1 - press * 0.09 + hover * 0.03})`,
                boxShadow: `0 ${px(2)}px ${px(10)}px rgba(217,119,87,${0.22 + hover * 0.25})`,
                filter: `brightness(${1 - hover * 0.06})`,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: px(18),
                  height: px(18),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    display: "flex",
                    opacity: 1 - stop,
                    transform: `translateY(${-stop * px(5)}px)`,
                  }}
                >
                  <ArrowUp size={px(18)} color="#ffffff" strokeWidth={2.2} />
                </div>
                <div
                  style={{
                    position: "absolute",
                    width: px(10),
                    height: px(10),
                    borderRadius: px(2.5),
                    background: "#ffffff",
                    opacity: stop,
                    transform: `scale(${0.5 + stop * 0.5})`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---- suggestion chips ---- */}
        <div
          id="claude-chips"
          style={{
            position: "absolute",
            left: COL_X0,
            top: COMP_Y1 + GAP_2,
            width: COL_W,
            height: CHIP_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: px(8),
            opacity: 1 - pushP,
          }}
        >
          {CHIPS.map((c, i) => {
            const p = stagger({ frame, index: i, each: 3, duration: 14, delay: CHIPS_IN });
            return (
              <div
                key={c.id}
                style={{
                  height: px(34),
                  borderRadius: 999,
                  border: `${px(1)}px solid ${C_BORDER}`,
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: px(7),
                  padding: `0 ${px(14)}px`,
                  flexShrink: 0,
                  opacity: p,
                  transform: `translateY(${(1 - p) * px(8)}px)`,
                }}
              >
                <c.Icon size={px(15)} color={C_MUTED} strokeWidth={1.8} />
                <span style={{ fontSize: px(14), color: "#3d3d3a", whiteSpace: "nowrap" }}>
                  {c.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ---- cursor ---- */}
        <div
          id="cursor"
          style={{
            position: "absolute",
            left: curX + press * px(2),
            top: curY + press * px(2),
            opacity: curOpacity,
          }}
        >
          <MousePointer2 size={px(20)} color="#ffffff" fill="#1f1e1d" strokeWidth={1.4} />
        </div>
      </Layer>
    </Camera>
  );
}
