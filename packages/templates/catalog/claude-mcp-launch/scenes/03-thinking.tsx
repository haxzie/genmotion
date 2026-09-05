import {
  AbsoluteFill,
  Img,
  Sequence,
  TextAnimation,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { Check } from "lucide-react";
import claudeMark from "../assets/claude.svg";
import mark from "../assets/sequel-logo.png";
import { brand } from "../components/brand";
import { claude, scale } from "../components/claude";
import { source } from "../components/integrations";

// matches scene 2's apparent scale at the cut (S 2.2 seen at zoom 1.15)
const px = scale(2.53);

// --- beats -----------------------------------------------------------------
const MARK_IN = 0;
const THINK_IN = 6;
const CALL_IN = 44;
const ALL_DONE = 186;
const OUT = 196;
const END = 220;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const STEPS = [
  { id: "google-analytics", label: "Searching Google Analytics", start: 62, done: 106 },
  { id: "search-console", label: "Analyzing search data", start: 98, done: 146 },
  { id: "posthog", label: "Understanding PostHog sessions", start: 136, done: 186 },
].map((s) => ({ ...s, src: source(s.id).src }));

const R = px(9); // spinner radius
const CIRC = 2 * Math.PI * R;

export default function Scene() {
  const frame = useCurrentFrame();

  const markIn = interpolate(frame, [MARK_IN, MARK_IN + 14], [0, 1], {
    ...clamp,
    easing: Easing.outSmooth,
  });
  // spins while it works, then coasts to a stop once every step is done
  const spin =
    Math.min(frame, ALL_DONE) * 1.6 +
    interpolate(frame, [ALL_DONE, ALL_DONE + 22], [0, 26], {
      ...clamp,
      easing: Easing.outCubic,
    });

  const out = interpolate(frame, [OUT, OUT + 18], [0, 1], {
    ...clamp,
    easing: Easing.inOutCubic,
  });

  return (
    <AbsoluteFill
      id="scene-root"
      style={{
        background: claude.pageGradient,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: brand.font,
      }}
    >
      <div
        id="thinking-block"
        style={{
          width: px(520),
          opacity: 1 - out,
          transform: `translateY(${-out * px(18)}px)`,
        }}
      >
        {/* ---- header ---- */}
        <div
          id="thinking-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: px(12),
            height: px(30),
            marginBottom: px(20),
          }}
        >
          <Img
            src={claudeMark}
            style={{
              width: px(24),
              height: px(24),
              objectFit: "contain",
              flexShrink: 0,
              opacity: markIn,
              transform: `scale(${0.6 + markIn * 0.4}) rotate(${spin}deg)`,
            }}
          />
          <div
            style={{
              position: "relative",
              flex: 1,
              height: px(24),
              fontSize: px(17),
              color: claude.muted,
              letterSpacing: "-0.005em",
              whiteSpace: "nowrap",
            }}
          >
            <Sequence from={THINK_IN} durationInFrames={CALL_IN - THINK_IN}>
              <Row>
                <TextAnimation text="Thinking…" by="none" preset="fadeIn" exit="auto" hold="shimmer" />
              </Row>
            </Sequence>
            <Sequence from={CALL_IN}>
              <Row>
                <TextAnimation text="Calling Sequel…" by="none" preset="fadeIn" hold="shimmer" />
              </Row>
            </Sequence>
          </div>
        </div>

        {/* ---- sub tool calls ---- */}
        <div style={{ marginLeft: px(36), display: "flex", flexDirection: "column", gap: px(6) }}>
          {STEPS.map((s) => {
            const p = interpolate(frame, [s.start, s.start + 14], [0, 1], {
              ...clamp,
              easing: Easing.outSmooth,
            });
            const done = interpolate(frame, [s.done, s.done + 8], [0, 1], {
              ...clamp,
              easing: Easing.outSmooth,
            });
            return (
              <div
                key={s.id}
                id={`step-${s.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: px(11),
                  height: px(34),
                  opacity: p,
                  transform: `translateY(${(1 - p) * px(7)}px)`,
                }}
              >
                {/* the pair reads as one unit, so it sits tighter than the
                    row's gap to the label */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: px(4),
                    flexShrink: 0,
                  }}
                >
                  <Badge src={mark} />
                  <Badge src={s.src} />
                </div>

                <span
                  style={{
                    flex: 1,
                    fontSize: px(15),
                    color: claude.textSoft,
                    letterSpacing: "-0.005em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.label}
                  <span style={{ opacity: 1 - done }}>…</span>
                </span>

                <div
                  style={{
                    position: "relative",
                    width: px(22),
                    height: px(22),
                    flexShrink: 0,
                  }}
                >
                  {/* spinner */}
                  <svg
                    width={px(22)}
                    height={px(22)}
                    viewBox={`0 0 ${px(22)} ${px(22)}`}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 1 - done,
                      transform: `rotate(${frame * 8}deg)`,
                    }}
                  >
                    <circle
                      cx={px(11)}
                      cy={px(11)}
                      r={R}
                      fill="none"
                      stroke="rgba(31,30,29,0.12)"
                      strokeWidth={px(2)}
                    />
                    <circle
                      cx={px(11)}
                      cy={px(11)}
                      r={R}
                      fill="none"
                      stroke={claude.coral}
                      strokeWidth={px(2)}
                      strokeLinecap="round"
                      strokeDasharray={CIRC}
                      strokeDashoffset={CIRC * 0.72}
                    />
                  </svg>

                  {/* check */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: done,
                      transform: `scale(${0.5 + done * 0.5})`,
                    }}
                  >
                    <Check size={px(18)} color={claude.green} strokeWidth={2.6} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** <Sequence> renders a centred fill container — this pins content left. */
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

/** A logo on a small white tile — Sequel, then the app it's querying. */
function Badge({ src }: { src: string }) {
  return (
    <div
      style={{
        width: px(26),
        height: px(26),
        borderRadius: px(7),
        background: claude.surface,
        border: `${px(1)}px solid ${claude.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Img src={src} style={{ width: px(15), height: px(15), objectFit: "contain" }} />
    </div>
  );
}
