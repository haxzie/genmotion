import React from "react";
import { interpolate, Easing } from "@genmotion/motion";
import { TypeLine } from "./TypeLine";
import { brand } from "./brand";

// "After a hundred reach-outs today… / maybe someone will respond" — shared by
// scenes 03 and 04 so the cut between them is invisible. `t` is scene 03's clock.
export function HundredLines({ t, exitAt }: { t: number; exitAt?: number }) {
  const x = interpolate(t, [3, 24], [0.31, 0.5], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(t, [36, 54], [0.61, 0.455], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tilt = interpolate(t, [3, 30], [10, 0], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(t, [3, 30], [1.12, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // line 1 swings in from the left in 3D: yawed away from the camera and
  // offset sideways, settling flat as the words finish typing
  const yaw = interpolate(t, [3, 26], [-42, 0], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slideX = interpolate(t, [3, 26], [-160, 0], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const depth = interpolate(t, [3, 26], [-260, 0], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      id="hundred-lines"
      style={{
        position: "absolute",
        left: x * 1920,
        top: y * 1080,
        transform: `translate(-50%, -50%) perspective(1200px) rotateX(${tilt}deg) scale(${scale})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div style={{ position: "relative", perspective: 1400, perspectiveOrigin: "30% 50%" }}>
        <div style={{ transform: `translate3d(${slideX}px, 0, ${depth}px) rotateY(${yaw}deg)`, transformOrigin: "0% 50%" }}>
        <TypeLine
          id="hundred-line-1"
          segments={[{ text: "After a hundred reach-outs today..." }]}
          startFrom={3}
          each={5}
          duration={7}
          exitAt={exitAt}
          clock={t}
          style={{ fontSize: 56 }}
        />
        </div>
      </div>
      <TypeLine
        id="hundred-line-2"
        segments={[{ text: "maybe someone will respond", style: { color: brand.linkBlue } }]}
        startFrom={54}
        each={5}
        duration={7}
        exitAt={exitAt}
        clock={t}
        style={{ fontSize: 36 }}
      />
    </div>
  );
}
