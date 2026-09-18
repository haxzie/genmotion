import { AbsoluteFill, useCurrentFrame, useWindowDuration, interpolate } from "@genmotion/motion";
import { Paper } from "../components/Paper";
import { BlockReveal } from "../components/BlockReveal";
import { IncomingField, SmartPhone } from "../components/Devices";
import { MeetingPaper } from "../components/PaperBeats";

const PREV_LEN = 60;
const REVEAL_LEN = 18; // frames of wipe at the end of this beat
const LEAD = 12; // the incoming paper beat is already this far along when the wipe starts

// Beat 4 — the smartphone rings; "To schedule a meeting." blocks in.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();
  const revealAt = end - REVEAL_LEN;
  const reveal = interpolate(frame, [revealAt, end - 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#1f6db5" }}>
      <IncomingField frame={frame + PREV_LEN} pill={{ x: 1090, y: 300 }}>
        <SmartPhone frame={frame + PREV_LEN} />
      </IncomingField>
      <BlockReveal progress={reveal} seed="out-4">
        <Paper>
          <MeetingPaper f={frame - revealAt + LEAD} />
        </Paper>
      </BlockReveal>
    </AbsoluteFill>
  );
}
