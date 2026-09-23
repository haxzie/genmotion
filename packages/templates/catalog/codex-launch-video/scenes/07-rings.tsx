import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { CodexBlob } from "../components/CodexBlob";
import { clamp } from "../components/brand";
import { mix } from "../components/BlurWord";
import { glide } from "../components/glide";

// 10.83–12.00s — ripples expand while a blue bloom condenses into the Codex mark.
export default function Scene() {
  const f = useCurrentFrame();
  const e = { ...clamp, easing: Easing.outSmooth };

  const outer = interpolate(f, [0, 35], [640, 1250], e);
  const inner = glide(f, [0, 12, 35], [300, 480, 600], { easeIn: false });
  const glowR = interpolate(f, [0, 30], [480, 160], e);
  const glowA = interpolate(f, [0, 16, 30], [0.95, 0.85, 0], clamp);

  // glide: one continuous shrink (per-segment easing stopped it every 10 frames).
  const blob = glide(f, [0, 10, 20, 30, 35], [330, 260, 220, 150, 128], { easeIn: false });
  const blobBlur = interpolate(f, [0, 9], [26, 0], clamp);
  const haloA = interpolate(f, [8, 16], [0, 1], clamp);
  const haloW = interpolate(f, [20, 32], [0, 1], clamp);

  const ring = (r: number, id: string) => (
    <div
      id={id}
      style={{
        position: "absolute", left: 960 - r, top: 540 - r, width: r * 2, height: r * 2, borderRadius: "50%",
        backgroundColor: "#fbfcfe",
        boxShadow: "0 0 70px 10px rgba(120,175,245,0.45), inset 0 0 40px rgba(170,205,250,0.25)",
      }}
    />
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#f7f9fc" }}>
      {ring(outer, "ring-outer")}
      {ring(inner, "ring-inner")}
      <div
        style={{
          position: "absolute", left: 960 - glowR * 1.3, top: 540 - glowR * 1.3, width: glowR * 2.6, height: glowR * 2.6,
          borderRadius: "50%", opacity: glowA,
          background: "radial-gradient(circle, rgba(110,130,250,0.95) 0%, rgba(140,180,250,0.6) 40%, rgba(190,215,250,0) 70%)",
        }}
      />
      <div
        id="blob-halo"
        style={{
          position: "absolute", left: 960 - blob * 0.95, top: 540 - blob * 0.95, width: blob * 1.9, height: blob * 1.9,
          borderRadius: "50%", opacity: haloA,
          backgroundColor: mix("#c9d6fb", "#ffffff", haloW),
          boxShadow: `0 ${blob * 0.12}px ${blob * 0.3}px rgba(110,160,240,${0.35 * haloW})`,
        }}
      />
      <div id="codex-blob" style={{ position: "absolute", left: 960 - blob / 2, top: 540 - blob / 2 }}>
        <CodexBlob size={blob} blur={blobBlur} rotate={f * 0.6} />
      </div>
    </AbsoluteFill>
  );
}
