import {
  AbsoluteFill,
  Img,
  Sequence,
  TextAnimation,
  Easing,
  interpolate,
  stagger,
  useCurrentFrame,
} from "@genmotion/motion";
import { MousePointer2 } from "lucide-react";
import { brand } from "../components/brand";
import { source, agent } from "../components/integrations";

// 72px is what lets the full sentence — chip included — sit on ONE line
const SIZE = 72;

// slot widths, measured against Inter 72px / -0.02em advance widths
const W_YOUR = 148;
const W_DATA = 147;
const W_SEQUEL = 223;
const GAP = 19; // one word space

// chips hug their contents, so every word gets identical padding
const CHIP_H = 92;
const PAD_L = 16;
const PAD_R = 24;
const CHIP_GAP = 14; // icons -> label
const ICON = 55;
const OVERLAP = 21; // each icon tucks this far under the previous one
const CHIP_FIXED = PAD_L + CHIP_GAP + PAD_R;
const iconsW = (n: number) => ICON * n - OVERLAP * (n - 1);

// --- beats -----------------------------------------------------------------
const LINE_IN = 0;
const TAIL_IN = 8;
const CYCLE_IN = 20;
const EVERY = 24; // per cycled word
const SWAP = 12; // frames a chip takes to flip over
const FINAL = 138; // "your <chip> data" collapses to "Sequel"
const COLLAPSE = 20;
const LINE1_OUT = 186;
const LINE2_IN = 196;
const CURSOR_IN = 218;
const CURSOR_LAND = 244;
const CLICK = 248;
const LINE2_OUT = 258;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = { ...clamp, easing: Easing.inOutCubic } as const;

// textW = the label's advance width at Inter 72px / -0.02em
const CYCLE = [
  { id: "marketing", label: "marketing", textW: 336, apps: ["google-ads", "meta-ads", "hubspot"] },
  { id: "finance", label: "finance", textW: 243, apps: ["stripe", "google-sheets", "bigquery"] },
  { id: "revenue", label: "revenue", textW: 267, apps: ["stripe", "hubspot", "google-ads"] },
  { id: "product", label: "product", textW: 261, apps: ["posthog", "mixpanel", "intercom"] },
  {
    id: "analytics",
    label: "analytics",
    textW: 294,
    apps: ["google-analytics", "search-console", "mixpanel"],
  },
].map((c) => ({ ...c, w: CHIP_FIXED + iconsW(3) + c.textW }));

// the container resizes between words so each chip keeps its own padding
const W_IN: number[] = [];
const W_OUT: number[] = [];
for (let i = 1; i < CYCLE.length; i++) {
  const s = CYCLE_IN + i * EVERY;
  W_IN.push(s, s + SWAP);
  W_OUT.push(CYCLE[i - 1].w, CYCLE[i].w);
}
W_IN.push(FINAL, FINAL + COLLAPSE);
W_OUT.push(CYCLE[CYCLE.length - 1].w, 0);

// --- beat 2: "Available for all your [icons agents]" ------------------------
const AGENT_IDS = ["claude-code", "codex", "cursor", "vscode"];
const PREFIX_2_W = 664;
const AGENTS_TEXT_W = 224;
const AGENTS_CHIP_W = CHIP_FIXED + iconsW(AGENT_IDS.length) + AGENTS_TEXT_W;
const LINE_2_W = PREFIX_2_W + GAP + AGENTS_CHIP_W;
// the chip's centre, so the cursor lands on it rather than near it
const AGENTS_CX = 960 - LINE_2_W / 2 + PREFIX_2_W + GAP + AGENTS_CHIP_W / 2;

export default function Scene() {
  const frame = useCurrentFrame();

  // "your" and the chip collapse to nothing, which slides the centred row back
  // onto "Sequel" without any hand-placed coordinates
  const yourW = interpolate(frame, [FINAL, FINAL + COLLAPSE], [W_YOUR, 0], ease);
  const yourGap = interpolate(frame, [FINAL, FINAL + COLLAPSE], [GAP, 0], ease);
  const yourOp = interpolate(frame, [FINAL, FINAL + 8], [1, 0], clamp);

  const chipW = interpolate(frame, W_IN, W_OUT, ease);
  const chipGap = interpolate(frame, [FINAL, FINAL + COLLAPSE], [GAP, 0], ease);
  const chipOp = interpolate(frame, [FINAL - 2, FINAL + 7], [1, 0], clamp);

  const slotW = interpolate(frame, [FINAL, FINAL + COLLAPSE], [W_DATA, W_SEQUEL], ease);

  // "data" flips up and away, "Sequel" flips in behind it
  const dataRot = interpolate(frame, [FINAL, FINAL + 11], [0, -96], ease);
  const dataOp = interpolate(frame, [FINAL + 2, FINAL + 10], [1, 0], clamp);

  // each line leaves as one block, sliding up
  const out1 = interpolate(frame, [LINE1_OUT, LINE1_OUT + 16], [0, 1], ease);
  const in2 = interpolate(frame, [LINE2_IN, LINE2_IN + 16], [0, 1], {
    ...clamp,
    easing: Easing.outSmooth,
  });
  const out2 = interpolate(frame, [LINE2_OUT, LINE2_OUT + 18], [0, 1], ease);

  // a cursor arrives and clicks the agents chip
  const curX = interpolate(frame, [CURSOR_IN, CURSOR_LAND], [1700, AGENTS_CX - 14], {
    ...clamp,
    easing: Easing.outCubic,
  });
  const curY = interpolate(frame, [CURSOR_IN, CURSOR_LAND], [900, 524], ease);
  const curOp = interpolate(
    frame,
    [CURSOR_IN, CURSOR_IN + 8, LINE2_OUT, LINE2_OUT + 8],
    [0, 1, 1, 0],
    clamp
  );
  const press = interpolate(frame, [CLICK, CLICK + 4, CLICK + 11], [0, 1, 0], clamp);

  return (
    <AbsoluteFill id="scene-root" style={{ background: brand.bg, fontFamily: brand.font }}>
      {/* ---- beat 1 ---- */}
      <Centred>
        <div
          id="connect-line"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: SIZE,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: brand.ink,
            lineHeight: 1.15,
            height: SIZE * 1.5,
            opacity: 1 - out1,
            transform: `translateY(${-out1 * 110}px)`,
          }}
        >
          <div
            id="connect-line-1"
            style={{
              marginRight: GAP,
              whiteSpace: "nowrap",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <TextAnimation
              text="Connect your agents to"
              by="word"
              preset="blurUp"
              startFrom={LINE_IN}
              stagger={3}
              duration={13}
              hold="float"
            />
          </div>

          <div
            id="word-your"
            style={{
              width: yourW,
              marginRight: yourGap,
              opacity: yourOp,
              whiteSpace: "nowrap",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <TextAnimation
              text="your"
              by="none"
              preset="blurUp"
              startFrom={TAIL_IN}
              duration={13}
            />
          </div>

          {/* the cycling chip */}
          <div
            id="word-cycle"
            style={{
              width: chipW,
              marginRight: chipGap,
              opacity: chipOp,
              height: CHIP_H,
              flexShrink: 0,
              position: "relative",
              perspective: 1600,
            }}
          >
            {CYCLE.map((c, i) => {
              const s = CYCLE_IN + i * EVERY;
              const last = i === CYCLE.length - 1;
              const inP = interpolate(frame, [s, s + SWAP], [0, 1], ease);
              const outP = last ? 0 : interpolate(frame, [s + EVERY, s + EVERY + SWAP], [0, 1], ease);
              const op =
                interpolate(frame, [s, s + 6], [0, 1], clamp) *
                (last ? 1 : 1 - interpolate(frame, [s + EVERY + 2, s + EVERY + 10], [0, 1], clamp));
              return (
                <Chip
                  key={c.id}
                  id={`chip-${c.id}`}
                  width={c.w}
                  label={c.label}
                  icons={c.apps.map((a) => source(a).src)}
                  opacity={op}
                  rotate={(1 - inP) * 92 - outP * 96}
                />
              );
            })}
          </div>

          {/* "data" -> "Sequel" */}
          <div
            id="word-slot"
            style={{
              width: slotW,
              height: SIZE * 1.3,
              flexShrink: 0,
              position: "relative",
              perspective: 1400,
            }}
          >
            <div
              id="word-data"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
                transform: `rotateX(${dataRot}deg)`,
                transformOrigin: "center center",
                opacity: dataOp,
              }}
            >
              <TextAnimation
                text="data"
                by="none"
                preset="blurUp"
                startFrom={TAIL_IN}
                duration={13}
              />
            </div>

            <Sequence from={FINAL + 5}>
              <div
                id="word-sequel"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  whiteSpace: "nowrap",
                }}
              >
                <TextAnimation
                  text="Sequel"
                  by="none"
                  preset="flipUp"
                  duration={13}
                  hold="breathe"
                />
              </div>
            </Sequence>
          </div>
        </div>
      </Centred>

      {/* ---- beat 2 ---- */}
      <Centred>
        <div
          id="available-line"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: SIZE,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: brand.ink,
            lineHeight: 1.15,
            height: SIZE * 1.5,
            opacity: in2 * (1 - out2),
            transform: `translateY(${(1 - in2) * 44 - out2 * 110}px)`,
          }}
        >
          <div
            style={{
              marginRight: GAP,
              whiteSpace: "nowrap",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            Available for all your
          </div>

          <div
            style={{
              height: CHIP_H,
              flexShrink: 0,
              position: "relative",
              width: AGENTS_CHIP_W,
              transform: `scale(${1 - press * 0.03})`,
            }}
          >
            <Chip
              id="chip-agents"
              width={AGENTS_CHIP_W}
              label="agents"
              icons={AGENT_IDS.map((a) => agent(a).src)}
              opacity={1}
              rotate={0}
              stagFrom={LINE2_IN + 4}
              frame={frame}
            />
          </div>
        </div>
      </Centred>

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

function Centred({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function Chip({
  id,
  width,
  label,
  icons,
  opacity,
  rotate,
  stagFrom,
  frame,
}: {
  id: string;
  width: number;
  label: string;
  icons: string[];
  opacity: number;
  rotate: number;
  stagFrom?: number;
  frame?: number;
}) {
  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height: CHIP_H,
        borderRadius: 24,
        background: "#f1f1f3",
        display: "flex",
        alignItems: "center",
        paddingLeft: PAD_L,
        paddingRight: PAD_R,
        gap: CHIP_GAP,
        boxSizing: "border-box",
        opacity,
        transform: `rotateX(${rotate}deg)`,
        transformOrigin: "center center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        {icons.map((src, k) => {
          const p =
            stagFrom != null && frame != null
              ? stagger({ frame, index: k, each: 4, duration: 14, delay: stagFrom })
              : 1;
          return (
            <div
              key={k}
              style={{
                width: ICON,
                height: ICON,
                borderRadius: 999,
                background: "#ffffff",
                border: "1px solid rgba(10,10,11,0.07)",
                boxShadow: "0 2px 6px rgba(10,10,11,0.09)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: k === 0 ? 0 : -OVERLAP,
                position: "relative",
                zIndex: icons.length - k,
                opacity: p,
                transform: `scale(${0.7 + p * 0.3})`,
              }}
            >
              <Img
                src={src}
                style={{ width: ICON * 0.56, height: ICON * 0.56, objectFit: "contain" }}
              />
            </div>
          );
        })}
      </div>
      <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{label}</span>
    </div>
  );
}
