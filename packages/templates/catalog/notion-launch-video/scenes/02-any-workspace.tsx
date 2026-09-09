import {
  AbsoluteFill,
  Sequence,
  TextAnimation,
  Img,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { icon } from "../components/assets";
import { NOTION_HANDOFF_PX } from "./01-notion-dock";

/* ------------------------------------------------------------------ *
 * Two sentences on white, each sliding through right to left.
 *
 * Scene 1 ends on the Notion mark, dead centre on white. This scene opens
 * on exactly that, so the cut is invisible — then the mark slides out to
 * the left and the first line follows it in, which is what carries the
 * viewer across the boundary.
 *
 * The size is IMPORTED from scene 1 rather than copied, so the two can
 * never drift apart if the dock is ever re-sized.
 * ------------------------------------------------------------------ */

const LOGO = NOTION_HANDOFF_PX; // 224 x 1.08 magnification x 1.03 zoom

const LOGO_OUT_START = 6;
const LOGO_OUT_END = 18;

const L1_FROM = 10;
const L1_DUR = 56;
const L2_FROM = 62; // overlaps line 1's exit by a few frames
const L2_DUR = 78;

export default function Scene() {
  const frame = useCurrentFrame();

  // accelerates away, the way something leaving frame should
  const logoX = interpolate(frame, [LOGO_OUT_START, LOGO_OUT_END], [0, -1180], {
    easing: Easing.bezier(0.4, 0, 1, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{ backgroundColor: "#ffffff", fontFamily: "Inter, sans-serif", overflow: "hidden" }}
    >
      {frame <= LOGO_OUT_END && (
        <div
          id="handoff-notion"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: LOGO,
            height: LOGO,
            marginLeft: -LOGO / 2,
            marginTop: -LOGO / 2,
            transform: `translateX(${logoX}px)`,
          }}
        >
          <Img
            src={icon("notion").src}
            style={{ width: LOGO, height: LOGO, objectFit: "contain", display: "block" }}
          />
        </div>
      )}

      <Sequence from={L1_FROM} durationInFrames={L1_DUR}>
        <Line id="line-1" text="Any workspace." />
      </Sequence>

      <Sequence from={L2_FROM} durationInFrames={L2_DUR}>
        <Line id="line-2" text="One way to do it" />
      </Sequence>
    </AbsoluteFill>
  );
}

function Line({ id, text }: { id: string; text: string }) {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <h1
        id={id}
        style={{
          margin: 0,
          fontSize: 150,
          fontWeight: 600,
          letterSpacing: "-0.035em",
          color: "#16161a",
          whiteSpace: "nowrap",
        }}
      >
        {/* slideIn travels in from the right and keeps going left on the way
            out, so "auto" gives a single continuous right-to-left pass */}
        <TextAnimation text={text} preset="slideIn" exit="auto" hold="breathe" />
      </h1>
    </AbsoluteFill>
  );
}
