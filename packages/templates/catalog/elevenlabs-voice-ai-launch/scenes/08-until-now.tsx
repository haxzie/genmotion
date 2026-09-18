import { AbsoluteFill, useCurrentFrame, useWindowDuration, interpolate, Easing, TextAnimation } from "@genmotion/motion";
import { OrangeField } from "../components/OrangeField";
import { Rings } from "../components/Orb";
import { brand, headline } from "../components/brand";

const PREV_LEN = 80; // scene 07 length — keeps the orange bloom drifting continuously
export const ORB_SIZE = 440; // the iris lands here; scene 06 opens on an orb this size

// Beat 5 — "Until now." on orange, then the frame irises down to a 440px disc.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();
  const iris = interpolate(frame, [end - 34, end - 4], [1500, ORB_SIZE / 2], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const halo = interpolate(frame, [end - 20, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Halo the orb will sit in — same as scene 06's backdrop */}
      <div style={{ position: "absolute", inset: 0, opacity: halo, background: "radial-gradient(900px 700px at 20% 80%, rgba(60,110,50,0.55) 0%, transparent 60%), radial-gradient(800px 600px at 85% 20%, rgba(110,90,40,0.5) 0%, transparent 60%)" }} />
      <Rings frame={frame} at={end - 22} base={ORB_SIZE + 160} step={230} opacity={halo} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          WebkitMaskImage: `radial-gradient(circle at 50% 50%, #000 ${iris - 1}px, transparent ${iris}px)`,
          maskImage: `radial-gradient(circle at 50% 50%, #000 ${iris - 1}px, transparent ${iris}px)`,
        }}
      >
        <OrangeField frame={frame + PREV_LEN}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <h1 id="until-now" style={{ ...headline, margin: 0, fontSize: 84, color: brand.white }}>
              <TextAnimation text="Until now." by="word" preset="fadeIn" startFrom={6} stagger={8} duration={2} exit={{ at: end - 22, duration: 8 }} />
            </h1>
          </div>
        </OrangeField>
      </div>
    </AbsoluteFill>
  );
}
