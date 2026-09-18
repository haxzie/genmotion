import { AbsoluteFill, useCurrentFrame, useWindowDuration } from "@genmotion/motion";
import { PaperCamera, MeetingPaper } from "../components/PaperBeats";
import { IncomingPill } from "../components/Devices";
import { PhoneStage } from "../components/PhoneStage";
import { leanIn } from "../components/Phone3D";
import { videoMesh } from "../components/videoPhoneMesh";
import { brand } from "../components/brand";

const CARRY = 30; // wipe (18) + lead (12) frames of this beat already shown in the previous scene

// Beat 5 — "To schedule a meeting." with the Meeting card; the video desk
// phone surface switches on cell by cell over the paper, settling flat as it lands.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();
  const wipeFrom = end - 18;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <PaperCamera frame={frame} end={end}>
        <MeetingPaper f={frame + CARRY} />
      </PaperCamera>
      <PhoneStage
        mesh={videoMesh}
        model="video"
        frame={frame}
        wipe={{ from: wipeFrom, to: end - 2, mode: "cover", seed: "in-5" }}
        tiltX={leanIn(wipeFrom, end)}
      />
      <IncomingPill frame={frame} at={end - 6} x={1260} y={230} />
    </AbsoluteFill>
  );
}
