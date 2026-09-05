import {
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { brand, grid } from "./brand";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * Structural rules of the layout — these are the ones you read as a frame.
 * The bottom pair mirrors the top pair, so the margin below the chart matches
 * the margin above the header.
 */
const H_RULES = [88, grid.headerRule, grid.baseline, grid.footerRule];
const V_RULES = [grid.margin, grid.W - grid.margin];

/** Crosshairs sit where a structural vertical meets a structural horizontal. */
const CROSSES = V_RULES.flatMap((x) => H_RULES.map((y) => ({ x, y })));

/**
 * The blueprint: a hairline field grid, the structural rules that box the
 * layout in, and crosshairs at every intersection. Draws itself on in the
 * first ~20 frames and then holds — it is the furniture the scene sits on,
 * so it never exits.
 */
export function GridBackdrop() {
  const frame = useCurrentFrame();

  const field = interpolate(frame, [2, 24], [0, 1], {
    easing: Easing.outCubic,
    ...CLAMP,
  });

  // Very slow ambient wash so the paper is never dead flat.
  const wash = interpolate(
    frame,
    [0, 120, 240, 360],
    [0.5, 0.95, 0.6, 0.95],
    { easing: Easing.inOutCubic, ...CLAMP },
  );

  const fineV = Math.floor(grid.W / grid.cell) + 1;
  const fineH = Math.floor(grid.H / grid.cell) + 1;

  return (
    <div
      id="grid-backdrop"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {/* warm paper wash, breathing */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(1500px 900px at 50% 34%, rgba(250,93,25,0.055) 0%, rgba(250,93,25,0) 62%)",
          opacity: wash,
        }}
      />

      {/* hairline field grid */}
      <div style={{ position: "absolute", inset: 0, opacity: field * 0.9 }}>
        {Array.from({ length: fineV }, (_, i) => (
          <div
            key={`fv-${i}`}
            style={{
              position: "absolute",
              left: i * grid.cell,
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: brand.ruleFaint,
            }}
          />
        ))}
        {Array.from({ length: fineH }, (_, i) => (
          <div
            key={`fh-${i}`}
            style={{
              position: "absolute",
              top: i * grid.cell,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: brand.ruleFaint,
            }}
          />
        ))}
      </div>

      {/* structural horizontals — wipe in from the left */}
      {H_RULES.map((y, i) => {
        const p = interpolate(frame, [i * 3, i * 3 + 14], [0, 1], {
          easing: Easing.outQuart,
          ...CLAMP,
        });
        return (
          <div
            key={`h-${y}`}
            style={{
              position: "absolute",
              top: y,
              left: 0,
              width: grid.W,
              height: 1,
              backgroundColor: brand.rule,
              transform: `scaleX(${p})`,
              transformOrigin: "left center",
            }}
          />
        );
      })}

      {/* structural verticals — wipe in from the top */}
      {V_RULES.map((x, i) => {
        const p = interpolate(frame, [4 + i * 3, 4 + i * 3 + 16], [0, 1], {
          easing: Easing.outQuart,
          ...CLAMP,
        });
        return (
          <div
            key={`v-${x}`}
            style={{
              position: "absolute",
              left: x,
              top: 0,
              height: grid.H,
              width: 1,
              backgroundColor: brand.rule,
              transform: `scaleY(${p})`,
              transformOrigin: "center top",
            }}
          />
        );
      })}

      {/* crosshairs at the intersections */}
      {CROSSES.map(({ x, y }, i) => {
        const p = interpolate(frame, [12 + i * 2, 20 + i * 2], [0, 1], {
          easing: Easing.outCubic,
          ...CLAMP,
        });
        return (
          <div
            key={`x-${x}-${y}`}
            style={{
              position: "absolute",
              left: x - 9,
              top: y - 9,
              width: 18,
              height: 18,
              opacity: p,
              transform: `scale(${0.6 + p * 0.4}) rotate(${(1 - p) * 45}deg)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 8.5,
                left: 0,
                width: 18,
                height: 1,
                backgroundColor: brand.flame,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 8.5,
                top: 0,
                height: 18,
                width: 1,
                backgroundColor: brand.flame,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
