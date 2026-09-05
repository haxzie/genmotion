import {
  Camera,
  Layer,
  Img,
  useCurrentFrame,
  useWindowDuration,
  interpolate,
  stagger,
  random,
  Easing,
} from "@genmotion/motion";

import { BLUE_RADIAL, FONT, HERO_FRAME } from "../components/brand";

import artA from "../assets/art-gemini.jpg";
import artB from "../assets/art-omni.jpg";
import artC from "../assets/art-veo.jpg";
import artD from "../assets/art-lyria.jpg";

// A stack of square cards, overlapping like books pulled part-way off a shelf.
const CARD = 460;
const STEP_X = 374; // wide enough that every card's centre stays visible
const STEP_Y = 16;
const STEP_Z = 0.055; // each card reads as one step closer to the camera

const PANELS = [
  { id: "art-a", src: artA, word: "Gemini" },
  { id: "art-b", src: artB, word: "Omni" },
  { id: "art-c", src: artC, word: "Veo" },
  { id: "art-d", src: artD, word: "Lyria" },
];

// the last card never leaves — it opens out to fill the frame and scene 03
// picks the film up from exactly that image
const HERO = PANELS.length - 1;

const STACK_W = CARD + STEP_X * (PANELS.length - 1);

export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();

  // Scene 01 handed the frame over with this exact gradient sliding left→right.
  // We keep that momentum for a few frames rather than stopping dead on the cut.
  const carry = interpolate(frame, [0, 16], [46, 0], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Camera
      style={{ background: BLUE_RADIAL }}
      drift={{ amount: 7, speed: 0.18 }}
      keyframes={[
        { at: 0, x: 0.5, y: 0.5, zoom: 1.06 },
        { at: 54, x: 0.5, y: 0.5, zoom: 1 },
      ]}
    >
      {/* slow ambient light behind everything */}
      <Layer z={2200}>
        <div
          id="glow-warm"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(900px 620px at 22% 30%, rgba(120,150,255,0.42) 0%, rgba(120,150,255,0) 70%)",
            opacity: interpolate(frame, [0, 70, 140], [0.5, 0.9, 0.5], {
              easing: Easing.inOutCubic,
              extrapolateRight: "clamp",
            }),
          }}
        />
      </Layer>

      <Layer>
        <div
          id="panel-row"
          style={{
            position: "absolute",
            inset: 0,
            perspective: 1700,
            transform: `translateX(${carry}px)`,
          }}
        >
          {PANELS.map((panel, i) => (
            <StackCard key={panel.id} panel={panel} index={i} frame={frame} end={end} />
          ))}
        </div>
      </Layer>
    </Camera>
  );
}

function StackCard({
  panel,
  index,
  frame,
  end,
}: {
  panel: (typeof PANELS)[number];
  index: number;
  frame: number;
  end: number;
}) {
  // cards keep travelling left→right, arriving one after the other
  const enter = stagger({
    frame,
    index,
    each: 4,
    duration: 16,
    delay: 6,
    easing: Easing.outSmooth,
  });

  const isHero = index === HERO;

  // every card but the hero leaves the way it came, clearing before the cut
  const out = isHero
    ? 0
    : interpolate(frame, [end - 46, end - 30], [0, 1], {
        easing: Easing.inOutCubic,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  // the hero opens out to fill the frame — this IS the cut into scene 03
  const open = isHero
    ? interpolate(frame, [end - 28, end - 6], [0, 1], {
        easing: Easing.inOutCubic,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const float = Math.sin(frame * 0.035 + index * 1.6) * 8 * (1 - open);
  const seed = random(panel.id) * 2 - 1;

  // the whole deck faces the same way: right edge turned inward, into depth
  const yaw = (-21 + seed * 2) * (1 - open);

  const restLeft = (1920 - STACK_W) / 2 + index * STEP_X;
  const restTop = (1080 - CARD) / 2 + index * STEP_Y - 30;
  const lerp = (a: number, b: number) => a + (b - a) * open;

  // the word fades up once its card has landed, and clears as the card opens
  const label =
    interpolate(frame, [14 + index * 4, 26 + index * 4], [0, 1], {
      easing: Easing.outSmooth,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * (1 - Math.min(1, open * 2.4));

  return (
    <div
      id={panel.id}
      style={{
        position: "absolute",
        left: lerp(restLeft, HERO_FRAME.left),
        top: lerp(restTop, HERO_FRAME.top),
        width: lerp(CARD, HERO_FRAME.width),
        height: lerp(CARD, HERO_FRAME.height),
        zIndex: index,
        borderRadius: lerp(28, 0),
        overflow: "hidden",
        border: open > 0.9 ? "none" : "1px solid rgba(255,255,255,0.16)",
        // each card is painted over the one before it, so its shadow — thrown
        // back and to the left — lands on its neighbour's face
        boxShadow: `-18px 14px 28px rgba(2,5,18,${
          0.5 * enter * (1 - out) * (1 - open)
        }), -70px 40px 90px rgba(2,5,18,${0.45 * enter * (1 - out) * (1 - open)})`,
        opacity: enter * (1 - out),
        transformOrigin: "50% 50%",
        // depth runs forward through the deck — the last card is nearest camera
        transform: `translateX(${(1 - enter) * -420 + out * 340}px) translateY(${float}px) rotateY(${yaw}deg) scale(${
          (0.93 + enter * 0.07) * (1 + index * STEP_Z * (1 - open))
        })`,
      }}
    >
      <Img
        src={panel.src}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />

      {/* scrim so the word stays legible over whatever the art is doing */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 1 - open,
          background:
            "radial-gradient(70% 60% at 50% 50%, rgba(5,9,28,0.62) 0%, rgba(5,9,28,0.22) 100%)",
        }}
      />
      <div
        id={`${panel.id}-word`}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 72,
          fontWeight: 500,
          letterSpacing: "-0.025em",
          color: "#ffffff",
          fontFamily: FONT,
          opacity: label,
          transform: `translateY(${(1 - label) * 16}px)`,
        }}
      >
        {panel.word}
      </div>
    </div>
  );
}
