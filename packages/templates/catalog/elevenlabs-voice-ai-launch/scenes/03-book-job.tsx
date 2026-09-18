import { useCurrentFrame, useWindowDuration, interpolate } from "@genmotion/motion";
import { PaperCamera, BookJobPaper } from "../components/PaperBeats";
import { BlockReveal } from "../components/BlockReveal";
import { IncomingField, SmartPhone } from "../components/Devices";

const CARRY = 30; // wipe (18) + lead (12) frames of this beat already shown in the previous scene

// Beat 3 — "To book a job." The cursor clicks the book button while the paper
// drifts left; the smartphone dithers in at the end.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();
  const reveal = interpolate(frame, [end - 18, end - 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <PaperCamera
      frame={frame}
      end={end}
      overlay={
        <BlockReveal progress={reveal} seed="in-3">
          <IncomingField frame={frame} pill={{ x: 1090, y: 300 }}>
            <SmartPhone frame={frame} />
          </IncomingField>
        </BlockReveal>
      }
    >
      <BookJobPaper f={frame + CARRY} />
    </PaperCamera>
  );
}
