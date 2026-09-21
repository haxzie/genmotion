import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  useCurrentFrame,
} from "@genmotion/motion";
import {
  C,
  METRICS,
  RULES,
  RULE_X,
  OUTRO_BLOCKS,
  SPECIMEN,
} from "../components/brand";
import food01 from "../assets/food-01.jpg";
import food02 from "../assets/food-02.jpg";
import food03 from "../assets/food-03.jpg";
import food04 from "../assets/food-04.jpg";
import food05 from "../assets/food-05.jpg";
import food06 from "../assets/food-06.jpg";
import food07 from "../assets/food-07.jpg";
import food08 from "../assets/food-08.jpg";
import food09 from "../assets/food-09.jpg";

// Beat 4 — the tagline handed over by 03 pulls back into depth: it travels to
// frame centre, scales down and blurs, so it reads as receding on Z. The
// photography orbits it on an ellipse, each frame tilted slightly and drifting.
// Three of the shots then break orbit for the outro block positions and the
// field goes to ink, which is what 05 opens on.

const IMAGES = [
  food01,
  food02,
  food03,
  food04,
  food05,
  food06,
  food07,
  food08,
  food09,
];

// Which orbiting shots survive into 05, and the block each becomes. Each is
// the card already closest to its target when the convergence starts, so they
// settle in place instead of flying across the ring and colliding.
// Recomputed for the nine-card ring at the current SPIN — a faster orbit puts
// different cards next to the blocks by the time convergence starts.
const SURVIVES: Record<number, number> = { 3: 0, 0: 1, 7: 2 };

// Orbit geometry — an ellipse, so the ring fills a 16:9 frame instead of
// leaving the sides empty.
const CX = 960;
const CY = 540;
const RX = 620;
const RY = 330;
const CARD_W = 400;
const CARD_H = 267;

/** Degrees the whole ring turns per frame. */
const SPIN = 0.95;

// Where the held tagline's ink actually sits as 03 leaves it, in page
// coordinates — measured off a rendered frame, not guessed. Re-measure these
// if the last SPECIMEN word changes; its side bearings move the centre.
const TEXT_CX = 618;
const TEXT_CY = 547; // visual centre between cap (474) and baseline (620)

const CONVERGE_FROM = 64;
const CONVERGE_TO = 82;

export default function Scene() {
  const frame = useCurrentFrame();
  const last = SPECIMEN[SPECIMEN.length - 1];
  const lastM = METRICS[last.metrics];

  // The tagline's journey into depth.
  const recede = interpolate(frame, [0, 20], [0, 1], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Rules belong to the specimen, not here — they clear as it departs.
  const rules = interpolate(frame, [0, 12], [1, 0], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textOut = interpolate(frame, [CONVERGE_FROM, CONVERGE_FROM + 12], [1, 0], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const toInk = interpolate(frame, [CONVERGE_FROM, CONVERGE_TO], [0, 1], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const converge = interpolate(frame, [CONVERGE_FROM, CONVERGE_TO], [0, 1], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Travel from 03's left-aligned position to frame centre, shrinking.
  // Scale and blur keep creeping after the move lands, so the tagline reads as
  // still falling away rather than parking at a fixed depth.
  const dx = (960 - TEXT_CX) * recede;
  const dy = (540 - TEXT_CY) * recede;
  const scale = interpolate(frame, [0, 20, CONVERGE_FROM], [1, 0.34, 0.29], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blur = interpolate(frame, [0, 20, CONVERGE_FROM], [0, 9, 12], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const spin = (frame * SPIN * Math.PI) / 180;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: toInk > 0.5 ? C.ink : C.paper,
        overflow: "hidden",
      }}
    >
      {/* Held from 03 so the cut is invisible, then cleared. */}
      <div style={{ opacity: rules }}>
        {[RULES.cap, RULES.median, RULES.baseline].map((top) => (
          <div
            key={top}
            style={{
              position: "absolute",
              left: RULE_X.from,
              top,
              width: RULE_X.to - RULE_X.from,
              height: 1.5,
              backgroundColor: C.rule,
            }}
          />
        ))}
      </div>

      {/* The tagline, receding. Same DOM shape and baseline maths as 03, so
          frame 0 here is pixel-identical to 03's last frame. */}
      <div
        id="tagline-depth"
        style={{
          position: "absolute",
          left: RULE_X.from,
          top: RULES.baseline,
          height: 0,
          display: "flex",
          alignItems: "flex-end",
          transformOrigin: `${TEXT_CX - RULE_X.from}px ${
            TEXT_CY - RULES.baseline
          }px`,
          transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
          filter: `blur(${blur}px)`,
          opacity: textOut,
        }}
      >
        <span
          style={{
            fontFamily: last.family,
            fontWeight: last.weight,
            fontSize: lastM.size,
            letterSpacing: last.tracking,
            lineHeight: 1,
            color: C.ink,
            whiteSpace: "pre",
            display: "block",
            transform: `translateY(${lastM.shift})`,
          }}
        >
          {last.text}
        </span>
      </div>

      {IMAGES.map((src, i) => {
        const at = 8 + i * 4;
        const enter = interpolate(frame, [at, at + 8], [0, 1], {
          easing: Easing.outSmooth,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Position on the orbit.
        const a = (i / IMAGES.length) * Math.PI * 2 + spin;
        const ringX = CX + RX * Math.cos(a) - CARD_W / 2;
        const ringY = CY + RY * Math.sin(a) - CARD_H / 2;

        // Each frame carries its own slight tilt, plus a slow drift so the
        // ring never reads as a rigid turntable.
        const baseTilt = (random(`t${i}`) - 0.5) * 15;
        const wobble = Math.sin((frame + i * 24) / 17) * 3.2;
        const bob = Math.cos((frame + i * 17) / 14) * 8;

        const blockIdx = SURVIVES[i];
        const target = blockIdx != null ? OUTRO_BLOCKS[blockIdx] : null;

        const x = target ? ringX + (target.x - ringX) * converge : ringX;
        const y = target ? ringY + (target.y - ringY) * converge : ringY;
        const w = target ? CARD_W + (target.w - CARD_W) * converge : CARD_W;
        const h = target ? CARD_H + (target.h - CARD_H) * converge : CARD_H;

        const opacity = target
          ? enter
          : enter *
            interpolate(frame, [CONVERGE_FROM, CONVERGE_FROM + 10], [1, 0], {
              easing: Easing.inOutCubic,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

        return (
          <div
            key={i}
            id={`orbit-${i}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: w,
              height: h,
              backgroundColor: C.ink,
              opacity,
              // Tilt straightens out as a card breaks orbit for its block.
              transform: `translateY(${bob * (1 - converge)}px) scale(${
                0.86 + enter * 0.14
              }) rotate(${(baseTilt + wobble) * (1 - converge)}deg)`,
              boxShadow: `0 ${26 * (1 - toInk)}px ${60 * (1 - toInk)}px rgba(16,16,16,${
                0.2 * (1 - toInk)
              })`,
              overflow: "hidden",
            }}
          >
            <Img
              src={src}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Crossfade to the white block rather than switching background
                colour at a threshold, which popped in a single frame. */}
            {target && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "#FFFFFF",
                  opacity: converge,
                }}
              />
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
