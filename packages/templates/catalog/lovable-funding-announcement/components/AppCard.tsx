import { random } from "@genmotion/motion";
import { c, meshWarm, meshCool, meshVert, soft } from "./brand";

const GRADS = [meshWarm, meshCool, meshVert];

type Props = {
  seed: string;
  width: number;
  height: number;
  radius?: number;
  /** 0..1 — how much of the mini-site has been "built" yet. */
  build?: number;
  id?: string;
  style?: React.CSSProperties;
};

/**
 * An abstract representation of a site someone shipped with Lovable.
 * No text inside — pure shape, so it stays readable at any scale.
 */
export function AppCard({
  seed,
  width,
  height,
  radius = 22,
  build = 1,
  id,
  style,
}: Props) {
  const grad = GRADS[Math.floor(random("g" + seed) * GRADS.length)];
  const rows = 2 + Math.floor(random("r" + seed) * 2);
  const bandH = height * (0.3 + random("b" + seed) * 0.14);
  const u = radius / 22; // unit scale so inner detail tracks card size

  // Staggered so the pieces land in order: heading, body lines, then button.
  const show = (k: number) => Math.max(0, Math.min(1, build * 6.5 - k * 1.15));

  return (
    <div
      id={id}
      style={{
        width,
        height,
        borderRadius: radius,
        background: c.white,
        border: `1px solid ${c.line}`,
        boxShadow: soft,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div style={{ height: bandH, background: grad, flexShrink: 0 }} />
      <div
        style={{
          flex: 1,
          padding: 20 * u,
          display: "flex",
          flexDirection: "column",
          gap: 13 * u,
        }}
      >
        <div
          style={{
            height: 14 * u,
            width: "58%",
            borderRadius: 999,
            background: c.block,
            opacity: show(0),
            transform: `translateY(${(1 - show(0)) * 8}px)`,
          }}
        />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 8 * u,
              width: `${48 + random("w" + seed + i) * 42}%`,
              borderRadius: 999,
              background: c.blockSoft,
              opacity: show(1 + i),
              transform: `translateY(${(1 - show(1 + i)) * 8}px)`,
            }}
          />
        ))}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            gap: 10 * u,
            opacity: show(4),
            transform: `translateY(${(1 - show(4)) * 12}px) scale(${0.94 + show(4) * 0.06})`,
            transformOrigin: "left center",
          }}
        >
          <div
            style={{
              height: 20 * u,
              width: 62 * u,
              borderRadius: 999,
              background: grad,
            }}
          />
          <div
            style={{
              height: 20 * u,
              width: 40 * u,
              borderRadius: 999,
              background: c.blockSoft,
            }}
          />
        </div>
      </div>
    </div>
  );
}
