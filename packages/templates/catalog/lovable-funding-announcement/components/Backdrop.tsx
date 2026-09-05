import { c } from "./brand";

/**
 * Creme ground plus two slow-drifting brand glows. Never fully static.
 */
export function Backdrop({ frame }: { frame: number }) {
  const ax = Math.sin(frame * 0.012) * 40;
  const ay = Math.cos(frame * 0.009) * 26;
  const bx = Math.cos(frame * 0.01) * 46;
  const by = Math.sin(frame * 0.013) * 30;

  return (
    <div style={{ position: "absolute", inset: 0, background: c.creme }}>
      <div
        style={{
          position: "absolute",
          inset: -300,
          transform: `translate(${ax}px, ${ay}px)`,
          background:
            "radial-gradient(900px 720px at 24% 22%, rgba(255,109,27,0.20), rgba(247,244,237,0) 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: -300,
          transform: `translate(${bx}px, ${by}px)`,
          background:
            "radial-gradient(1000px 780px at 78% 76%, rgba(75,115,255,0.18), rgba(247,244,237,0) 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: -300,
          transform: `translate(${-bx}px, ${ay}px)`,
          background:
            "radial-gradient(700px 560px at 68% 18%, rgba(255,1,120,0.10), rgba(247,244,237,0) 70%)",
        }}
      />
    </div>
  );
}
