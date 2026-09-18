import { useCurrentFrame, useWindowDuration, interpolate } from "@genmotion/motion";
import { PaperCamera, NobodyPaper } from "../components/PaperBeats";
import { BlockReveal } from "../components/BlockReveal";
import { OrangeField } from "../components/OrangeField";

const CARRY = 30; // wipe (18) + lead (12) frames of this beat already shown in the previous scene

// Beat 7 — "But nobody's around to pickup." holds while the paper drifts,
// then breaks into blocks as the orange field floods in. Ends fully orange.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();
  const reveal = interpolate(frame, [end - 24, end - 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <PaperCamera
      frame={frame}
      end={end}
      overlay={
        <BlockReveal progress={reveal} seed="to-orange">
          <OrangeField frame={frame} />
        </BlockReveal>
      }
    >
      <NobodyPaper f={frame + CARRY} />
    </PaperCamera>
  );
}
