import {
  AbsoluteFill,
  Camera,
  Layer,
  Overlay,
  Img,
  Sequence,
  TextAnimation,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  progress,
  random,
  stagger,
  Easing,
} from "@genmotion/motion";

import { BLUE_RADIAL, FONT, INK } from "../components/brand";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

import vr from "../assets/vr.jpg";
import hubble from "../assets/hubble.jpg";
import microscope from "../assets/microscope.jpg";
import whiteboard from "../assets/whiteboard.jpg";
import factory from "../assets/factory.jpg";
import chip from "../assets/chip.jpg";
import classroom from "../assets/classroom.jpg";

// The tiles ride a single big ellipse centred on the frame. Its top and bottom
// arcs sit outside the picture, so a rotation of SWEEP degrees carries every
// tile in from off-frame: right-hand tiles drop in from the top, left-hand
// tiles rise in from the bottom.
const RING = { cx: 960, cy: 540, rx: 700, ry: 900 };
const SWEEP = 100; // degrees travelled during the entrance
const ORBIT = 0.05; // degrees per frame — the ring never stops turning

type Tile = {
  id: string;
  src: string;
  angle: number; // resting angle on the ring, in degrees
  w: number;
  h: number;
  tilt: number;
  radius: number;
};

const TILES: Tile[] = [
  // right arc — these enter from the top
  { id: "tile-whiteboard", src: whiteboard, angle: -26, w: 330, h: 220, tilt: 6, radius: 30 },
  { id: "tile-factory", src: factory, angle: -9, w: 380, h: 254, tilt: -6, radius: 34 },
  { id: "tile-classroom", src: classroom, angle: 8, w: 348, h: 232, tilt: 5, radius: 30 },
  { id: "tile-chip", src: chip, angle: 25, w: 296, h: 198, tilt: -4, radius: 28 },
  // left arc — these enter from the bottom
  { id: "tile-hubble", src: hubble, angle: 156, w: 340, h: 226, tilt: 5, radius: 30 },
  { id: "tile-vr", src: vr, angle: 178, w: 380, h: 254, tilt: -5, radius: 34 },
  { id: "tile-microscope", src: microscope, angle: 202, w: 306, h: 204, tilt: 7, radius: 28 },
];

// The whole stage slides left here, handing the frame to the second line.
const SLIDE_START = 76;
const SLIDE_END = 98;
// third beat picks up as the second line's last word leaves to the left
const BEAT_THREE = 156;
const PUSH_UP_AT = 205; // line three starts sliding up out of its mask
const BEAT_FOUR = 209; // line four rises into the slot as line three leaves it
const BEAT_THREE_END = 240; // line three fully unmounted by here
const LINE_FOUR_OUT = 256; // line four starts sliding off to the right
const PUSH_AT = 266; // blue field starts crossing the frame

export default function Scene() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const slide = interpolate(frame, [SLIDE_START, SLIDE_END], [0, 1], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const slidePrev = interpolate(frame - 1, [SLIDE_START, SLIDE_END], [0, 1], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // px the whole panel travels this frame — the tiles blur against it
  const panelDx = -(slide - slidePrev) * 1920;

  // the blue field sweeping in from the left, landing full-frame on the cut
  const push = interpolate(frame, [PUSH_AT, durationInFrames - 1], [-1920, 0], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Camera style={{ background: "#ffffff" }} drift={{ amount: 5, speed: 0.2 }}>
      <Layer>
        <div
          id="backdrop"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(1200px 780px at 50% 46%, #ffffff 0%, #f4f5f7 100%)",
          }}
        />

        {/* PANEL ONE — the ring and the first headline, carried off to the left */}
        <div
          id="panel-one"
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "0% 50%",
            transform: `perspective(1800px) translateX(${-slide * 1920}px) rotateY(${
              -slide * 26
            }deg) scale(${1 - slide * 0.08})`,
          }}
        >
          {TILES.map((tile, i) => (
            <RingTile
              key={tile.id}
              tile={tile}
              index={i}
              frame={frame}
              panelDx={panelDx}
            />
          ))}

          <div
            id="headline-stage"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <Sequence from={18} durationInFrames={SLIDE_END - 18}>
              <h1
                id="headline-one"
                style={{
                  margin: 0,
                  fontSize: 132,
                  fontWeight: 500,
                  letterSpacing: "-0.035em",
                  color: "#17171a",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <TextAnimation
                  text="The best ideas"
                  by="word"
                  preset="slideIn"
                  stagger={5}
                  duration={12}
                  hold="float"
                />
              </h1>
            </Sequence>
          </div>
        </div>

        {/* PANEL TWO — arrives from the right and grows into the frame */}
        <div
          id="panel-two"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            transformOrigin: "100% 50%",
            transform: `perspective(1800px) translateX(${(1 - slide) * 1920}px) rotateY(${
              (1 - slide) * 42
            }deg) scale(${0.8 + slide * 0.2})`,
          }}
        >
          {/* "Starts with a plan" — arrives out of depth, leaves word by word
              to the left, clearing the frame 6 frames before BEAT_THREE. */}
          <Sequence
            from={SLIDE_START}
            durationInFrames={BEAT_THREE + 6 - SLIDE_START}
          >
            <AbsoluteFill
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <h1
                id="headline-two"
                style={{
                  margin: 0,
                  fontSize: 132,
                  fontWeight: 400,
                  letterSpacing: "-0.035em",
                  color: "#17171a",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <TextAnimation
                  text="Starts with a plan"
                  by="word"
                  preset="slideIn"
                  startFrom={6}
                  stagger={5}
                  duration={12}
                  exit="auto"
                  hold="float"
                />
              </h1>
            </AbsoluteFill>
          </Sequence>

          {/* the next line takes over the moment the last word has gone —
              it slides in like the others, then lifts up out of frame */}
          <Sequence from={BEAT_THREE} durationInFrames={BEAT_THREE_END - BEAT_THREE}>
            <AbsoluteFill
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <PushUpLine
                text="Same goes when building"
                exitAt={PUSH_UP_AT - BEAT_THREE}
              />
            </AbsoluteFill>
          </Sequence>

          {/* pushes up from below into the slot the line above is vacating */}
          <Sequence
            from={BEAT_FOUR}
            durationInFrames={durationInFrames - BEAT_FOUR}
          >
            <AbsoluteFill
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <SlideLine
                id="headline-four"
                text="Generative media applications"
                exitAt={LINE_FOUR_OUT - BEAT_FOUR}
              />
            </AbsoluteFill>
          </Sequence>
        </div>
      </Layer>

      {/* HANDOFF — the blue field pushes in from the left and owns the frame on
          the final frame. Scene 02 opens on exactly this, same gradient. */}
      <Overlay>
        <div
          id="blue-push"
          style={{
            position: "absolute",
            inset: 0,
            background: BLUE_RADIAL,
            transform: `translateX(${push}px)`,
          }}
        />
      </Overlay>
    </Camera>
  );
}

// Words push UP into their mask from below — taking over the slot the previous
// line just vacated — and on the way out they travel right, off the frame.
function SlideLine({
  id,
  text,
  exitAt,
}: {
  id: string;
  text: string;
  exitAt: number;
}) {
  const frame = useCurrentFrame();
  const words = text.split(" ");

  return (
    <h1
      id={id}
      style={{
        margin: 0,
        fontSize: 132,
        fontWeight: 400,
        letterSpacing: "-0.035em",
        color: INK,
        fontFamily: FONT,
        display: "flex",
        gap: "0.28em",
        lineHeight: 1.3,
      }}
    >
      {words.map((word, i) => {
        const enter = stagger({
          frame,
          index: i,
          each: 4,
          duration: 13,
          easing: Easing.outSmooth,
        });
        // exits run backwards through the line: last word leaves first
        const exitIndex = words.length - 1 - i;
        const out = progress(
          frame,
          exitAt + exitIndex * 5,
          exitAt + exitIndex * 5 + 12,
          Easing.inOutCubic,
        );

        return (
          // the mask travels with the word on exit, so the rightward move is
          // never clipped — only the upward arrival is
          <span
            key={word + i}
            style={{
              display: "inline-block",
              height: "1.3em",
              overflow: "hidden",
              verticalAlign: "bottom",
              transform: `translateX(${out * 460}px)`,
              opacity: 1 - out,
              filter: out > 0.01 ? `blur(${out * 5}px)` : undefined,
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - enter) * 118}%)`,
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </h1>
  );
}

// Each word sits in its own mask. It slides in from the right like the rest of
// the scene, then leaves by sliding straight UP out of that mask — no fade, the
// clip does the work — while the next line pushes up into the same slot.
function PushUpLine({ text, exitAt }: { text: string; exitAt: number }) {
  const frame = useCurrentFrame();
  const words = text.split(" ");

  return (
    <h1
      id="headline-three"
      style={{
        margin: 0,
        fontSize: 132,
        fontWeight: 400,
        letterSpacing: "-0.035em",
        color: INK,
        fontFamily: FONT,
        display: "flex",
        gap: "0.28em",
        lineHeight: 1.3,
      }}
    >
      {words.map((word, i) => {
        const enter = stagger({
          frame,
          index: i,
          each: 5,
          duration: 12,
          easing: Easing.outSmooth,
        });
        const up = progress(frame, exitAt + i * 4, exitAt + i * 4 + 12, Easing.outQuart);

        return (
          <span
            key={word + i}
            style={{
              display: "inline-block",
              height: "1.3em",
              overflow: "hidden",
              verticalAlign: "bottom",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateX(${(1 - enter) * 140}px) translateY(${-up * 130}%)`,
                opacity: enter,
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </h1>
  );
}

// Where a tile sits on the ring at a given frame. Sampling this one frame back
// is what gives us a real velocity to drive the motion blur from.
function ringPosition(tile: Tile, index: number, frame: number) {
  // A hair of lag per tile keeps the ring from feeling like one rigid plate.
  const delay = index * 1.5;
  const sweep = interpolate(frame, [delay, delay + 52], [-SWEEP, 0], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const deg = tile.angle + sweep + frame * ORBIT;
  const rad = (deg * Math.PI) / 180;

  return {
    deg,
    x: RING.cx + RING.rx * Math.cos(rad),
    y: RING.cy + RING.ry * Math.sin(rad),
  };
}

function RingTile({
  tile,
  index,
  frame,
  panelDx,
}: {
  tile: Tile;
  index: number;
  frame: number;
  panelDx: number;
}) {
  const { x, y, deg } = ringPosition(tile, index, frame);
  const prev = ringPosition(tile, index, frame - 1);

  // Directional motion blur, derived from how far this tile actually travelled
  // since the previous frame — so it smears hard on the entrance sweep and on
  // the slide-off, and is perfectly sharp while the ring is resting.
  const travelX = x - prev.x + panelDx;
  const travelY = y - prev.y;
  const smear = 0.85 + random(tile.id + "-smear") * 0.7; // progressive per tile
  const blurX = clamp(Math.abs(travelX) * 0.11 * smear, 0, 26);
  const blurY = clamp(Math.abs(travelY) * 0.11 * smear, 0, 26);
  const blurred = blurX > 0.4 || blurY > 0.4;
  const filterId = `${tile.id}-motion-blur`;

  // tiles stay near-upright, but carry a little of the ring's turn
  const wobble = Math.sin(frame * 0.05 + index * 1.7) * 1.2;
  const tilt = tile.tilt + (deg - tile.angle) * 0.06 + wobble;

  // Perspective: every tile turns to FACE the headline in the centre — the
  // edge nearest the middle falls away, the outer edge swings toward camera,
  // like panels on a ring aimed at its own axis. Depth per tile is randomised
  // so the ring never reads as one machined object.
  const dx = clamp((x - 960) / 960, -1, 1);
  const dy = clamp((y - 540) / 540, -1, 1);
  const yawAmount = 11 + random(tile.id + "-yaw") * 11; // 11°–22°
  const pitchAmount = 7 + random(tile.id + "-pitch") * 8; // 7°–15°
  const breathe = Math.sin(frame * 0.04 + index * 2.1) * 1.5;

  const yaw = -dx * yawAmount + breathe;
  const pitch = dy * pitchAmount;

  return (
    <div
      id={tile.id}
      style={{
        position: "absolute",
        left: x - tile.w / 2,
        top: y - tile.h / 2,
        width: tile.w,
        height: tile.h,
        transform: `perspective(1500px) rotateY(${yaw}deg) rotateX(${pitch}deg) rotate(${tilt}deg)`,
        borderRadius: tile.radius,
        overflow: "hidden",
        filter: blurred ? `url(#${filterId})` : undefined,
      }}
    >
      {blurred && (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
          <defs>
            <filter
              id={filterId}
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation={`${blurX} ${blurY}`} />
            </filter>
          </defs>
        </svg>
      )}
      <Img
        src={tile.src}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}
