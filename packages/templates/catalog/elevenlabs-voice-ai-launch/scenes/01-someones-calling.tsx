import { AbsoluteFill, useCurrentFrame, useWindowDuration, interpolate, Easing } from "@genmotion/motion";
import { PaperCamera, AppointmentProps } from "../components/PaperBeats";
import { IncomingPill } from "../components/Devices";
import { PhoneStage } from "../components/PhoneStage";
import { leanIn } from "../components/Phone3D";
import { deskMesh } from "../components/deskPhoneMesh";
import { brand, headline } from "../components/brand";

const GROW = [26, 38] as const; // caption scales up and scatters
const TAIL = 42; // "...to make an appointment." begins

const SMALL = { size: 30, a: { x: 700, y: 500 }, b: { x: 862, y: 500 } };
const BIG = { size: 96, a: { x: 300, y: 540 }, b: { x: 1000, y: 440 } };

// Beat 1 — "Someone's calling" types out as a caption, blows up into the
// scattered headline, the sentence finishes with salon objects, and the desk
// phone dithers in block by block. Ends fully on the IncomingField.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();
  const typed = Math.min(17, Math.floor(frame * 0.8));
  const caret = typed < 17 && Math.floor(frame / 6) % 2 === 0;
  const g = interpolate(frame, [GROW[0], GROW[1]], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const size = SMALL.size + (BIG.size - SMALL.size) * g;
  const ax = SMALL.a.x + (BIG.a.x - SMALL.a.x) * g;
  const ay = SMALL.a.y + (BIG.a.y - SMALL.a.y) * g;
  const bx = SMALL.b.x + (BIG.b.x - SMALL.b.x) * g;
  const by = SMALL.b.y + (BIG.b.y - SMALL.b.y) * g;

  const wordStyle = { ...headline, position: "absolute" as const, color: brand.ink, whiteSpace: "nowrap" as const, fontSize: size, letterSpacing: g < 0.5 ? "0" : "-0.02em" };

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <PaperCamera frame={frame} end={end} panFrom={GROW[1]}>
          <span id="word-someones" style={{ ...wordStyle, left: ax, top: ay }}>
            {"Someone's".slice(0, typed)}
            {typed < 9 && caret ? "|" : ""}
          </span>
          <span id="word-calling" style={{ ...wordStyle, left: bx, top: by }}>
            {"calling".slice(0, Math.max(0, typed - 10))}
            {typed >= 10 && caret ? "|" : ""}
          </span>
          <AppointmentProps f={frame - TAIL} />
      </PaperCamera>
      {/* The phone surface switches on cell by cell over the paper, settling flat as it lands */}
      <PhoneStage mesh={deskMesh} frame={frame} wipe={{ from: end - 22, to: end - 4, mode: "cover", seed: "in-1" }} tiltX={leanIn(end - 22, end)} />
      <IncomingPill frame={frame} at={end - 8} x={1130} y={380} />
    </AbsoluteFill>
  );
}
