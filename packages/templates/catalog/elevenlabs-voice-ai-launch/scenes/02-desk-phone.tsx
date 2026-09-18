import { AbsoluteFill, useCurrentFrame, useWindowDuration } from "@genmotion/motion";
import { Paper } from "../components/Paper";
import { IncomingPill } from "../components/Devices";
import { PhoneStage } from "../components/PhoneStage";
import { leanOut } from "../components/Phone3D";
import { deskMesh } from "../components/deskPhoneMesh";
import { BookJobPaper } from "../components/PaperBeats";
import { brand } from "../components/brand";

const PREV_LEN = 90; // scene 01 length — keeps the field drift and float continuous across the cut
const REVEAL_LEN = 18; // frames of wipe at the end of this beat
const LEAD = 12; // the incoming paper beat is already this far along when the wipe starts

// Beat 2 — the desk phone rings on the dither field; "To book a job." blocks in.
// The paper sits underneath as plain DOM; the phone surface (one canvas)
// discards its own pixels cell by cell to reveal it, leaning back as it goes.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();
  const revealAt = end - REVEAL_LEN;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <Paper>
        <BookJobPaper f={frame - revealAt + LEAD} />
      </Paper>
      <PhoneStage
        mesh={deskMesh}
        frame={frame}
        timeOffset={PREV_LEN / 30}
        wipe={{ from: revealAt, to: end - 2, mode: "reveal", seed: "out-2" }}
        tiltX={leanOut(revealAt - 6, end)}
      />
      <IncomingPill frame={frame} until={revealAt + 2} x={1130} y={380} />
    </AbsoluteFill>
  );
}
