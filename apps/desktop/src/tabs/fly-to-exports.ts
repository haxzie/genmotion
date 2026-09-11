/**
 * The "it's in your downloads" gesture.
 *
 * When an export is started, the dialog closes and a small clip flies from
 * where the button was to the Exports icon in the tab strip, shrinking as it
 * goes; the icon bumps as it lands. It is the same cue a browser gives for a
 * download — the file is not gone, it is up there — and it is what tells the
 * user where to look now that the dialog no longer holds them.
 *
 * Plain DOM and the Web Animations API: the chip lives outside React so it
 * survives the dialog unmounting underneath it.
 */

/** The strip's Exports button carries this id so the chip knows where to land. */
export const EXPORTS_TARGET_ID = "gm-exports-target";

const PULSE_EVENT = "gm:exports-pulse";

/** Subscribe to landings — the button uses this to bump and refresh its badge. */
export function onExportsPulse(listener: () => void): () => void {
  window.addEventListener(PULSE_EVENT, listener);
  return () => window.removeEventListener(PULSE_EVENT, listener);
}

const CHIP_W = 56;
const CHIP_H = 36;

export function flyToExports(from: DOMRect, label: string): void {
  const target = document.getElementById(EXPORTS_TARGET_ID)?.getBoundingClientRect();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!target || reduced) {
    window.dispatchEvent(new Event(PULSE_EVENT));
    return;
  }

  const chip = document.createElement("div");
  chip.setAttribute("aria-hidden", "true");
  chip.textContent = label.toUpperCase();
  Object.assign(chip.style, {
    position: "fixed",
    zIndex: "1000",
    left: `${from.left + from.width / 2 - CHIP_W / 2}px`,
    top: `${from.top + from.height / 2 - CHIP_H / 2}px`,
    width: `${CHIP_W}px`,
    height: `${CHIP_H}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    background: "var(--color-accent)",
    color: "#fff",
    font: "600 11px/1 ui-sans-serif, system-ui, sans-serif",
    letterSpacing: "0.04em",
    boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
    pointerEvents: "none",
    willChange: "transform, opacity",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(chip);

  const dx = target.left + target.width / 2 - (from.left + from.width / 2);
  const dy = target.top + target.height / 2 - (from.top + from.height / 2);
  // A slight arc: lift first, then fall onto the icon — a thrown object, not a
  // slide. The lift scales with the distance so short trips don't overshoot.
  const lift = -Math.min(120, Math.abs(dy) * 0.25 + 40);

  const animation = chip.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1, offset: 0 },
      { transform: `translate(${dx * 0.45}px, ${lift}px) scale(0.85)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0.2, offset: 1 },
    ],
    { duration: 650, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)", fill: "forwards" },
  );
  animation.onfinish = () => {
    chip.remove();
    window.dispatchEvent(new Event(PULSE_EVENT));
  };
}
