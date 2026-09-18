import { AbsoluteFill, useCurrentFrame, useWindowDuration } from "@genmotion/motion";
import { Paper } from "../components/Paper";
import { IncomingPill } from "../components/Devices";
import { PhoneStage } from "../components/PhoneStage";
import { leanOut } from "../components/Phone3D";
import { videoMesh } from "../components/videoPhoneMesh";
import { NobodyPaper } from "../components/PaperBeats";
import { brand } from "../components/brand";

const PREV_LEN = 60; // scene 05 length
const REVEAL_LEN = 18;
const LEAD = 12;

// Beat 6 — the video desk phone rings; "But nobody's around..." blocks in
// underneath as the phone surface discards itself cell by cell and leans away.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();
  const revealAt = end - REVEAL_LEN;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <Paper>
        <NobodyPaper f={frame - revealAt + LEAD} />
      </Paper>
      <PhoneStage
        mesh={videoMesh}
        model="video"
        frame={frame}
        timeOffset={PREV_LEN / 30}
        wipe={{ from: revealAt, to: end - 2, mode: "reveal", seed: "out-6" }}
        tiltX={leanOut(revealAt - 6, end)}
      />
      <IncomingPill frame={frame} until={revealAt + 2} x={1260} y={230} />
    </AbsoluteFill>
  );
}
