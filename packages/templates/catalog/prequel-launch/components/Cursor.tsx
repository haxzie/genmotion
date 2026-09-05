/** Velocity-derived pointer dynamics: sample the path either side of the current
    frame, bank into the direction of travel, and stretch a little with speed.
    Because it comes from the real path, it stays in sync automatically whenever
    the timing changes. */
export function cursorDynamics(
  frame: number,
  posX: (f: number) => number,
  posY: (f: number) => number,
  press = 0,
) {
  const vx = (posX(frame + 1.5) - posX(frame - 1.5)) / 3;
  const vy = (posY(frame + 1.5) - posY(frame - 1.5)) / 3;
  const speed = Math.hypot(vx, vy);
  const bank = Math.max(-24, Math.min(24, vx * 0.85));
  return {
    // the click adds a quick counter-flick on top of the bank
    rotate: bank - 13 * press,
    scale: (1 - 0.14 * press) * (1 + Math.min(0.1, speed * 0.004)),
  };
}

/** The macOS pointer, drawn dark with a light outline so it stays legible over
    both the bright wallpaper and the dark UI chrome it moves across.
    Positioned by its TIP, in whatever coordinate space the caller is using. */
export function Cursor({
  x,
  y,
  scale = 1,
  rotate = 0,
  opacity = 1,
  id = "cursor",
}: {
  x: number | string;
  y: number | string;
  scale?: number;
  /** Degrees. Pivots about the TIP, the way a real hand swings a pointer. */
  rotate?: number;
  opacity?: number;
  id?: string;
}) {
  // Strings let a caller position by percentage — useful for riding a text run
  // whose real width only the browser knows.
  const at = (v: number | string) => (typeof v === "number" ? v - 5 : `calc(${v} - 5px)`);
  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: at(x),
        top: at(y),
        width: 58,
        height: 77,
        opacity,
        transformOrigin: "top left",
        transform: `rotate(${rotate}deg) scale(${scale})`,
        filter: "drop-shadow(0 6px 14px rgba(12,8,16,0.42))",
      }}
    >
      <svg viewBox="0 0 24 32" width="58" height="77">
        <path
          d="M2 2 L2 26.5 L8.3 20.6 L12.4 29.8 L16.6 27.9 L12.5 18.9 L20.6 18.6 Z"
          fill="#16161a"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
