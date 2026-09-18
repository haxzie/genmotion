import { AbsoluteFill, useCurrentFrame, useWindowDuration, interpolate, Easing } from "@genmotion/motion";
import { Orb, Rings } from "../components/Orb";
import { Mesh } from "../components/Mesh";

const ORB_SIZE = 440;
// Where the orb ends up: the "Reception" avatar slot in scene 07.
export const AVATAR = { x: 540, y: 410, size: 44 };

// Beat 6 — the orange disc ignites into the voice orb, breathes, then shrinks
// away to become the avatar as the blurred mesh world fades up behind it.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();
  const heat = interpolate(frame, [0, 16], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const move = interpolate(frame, [end - 30, end - 4], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const size = ORB_SIZE + (AVATAR.size - ORB_SIZE) * move;
  const cx = 960 + (AVATAR.x - 960) * move;
  const cy = 540 + (AVATAR.y - 540) * move;
  const breathe = 1 + Math.sin(frame * 0.12) * 0.015 * (1 - move);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - move, background: "radial-gradient(900px 700px at 20% 80%, rgba(60,110,50,0.55) 0%, transparent 60%), radial-gradient(800px 600px at 85% 20%, rgba(110,90,40,0.5) 0%, transparent 60%)" }} />
      <Mesh frame={frame} opacity={move} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - move }}>
        <Rings frame={frame + 22} at={0} base={ORB_SIZE + 160} step={230} />
      </div>
      <div style={{ position: "absolute", left: cx - size / 2, top: cy - size / 2, transform: `scale(${breathe})` }}>
        <Orb id="orb" frame={frame + 75} size={size} heat={heat} glow={1 - move * 0.6} />
      </div>
    </AbsoluteFill>
  );
}
