import React from "react";
import { useCurrentFrame, interpolate, Easing, random } from "@genmotion/motion";
import { PixelBitmap } from "./PixelBitmap";
import { ICONS, VARIANTS, type Variant } from "./brand";

/** Icons are drawn to a constant 126px box, whatever their bitmap resolution. */
export const ICON_BOX = 126;
export const unitFor = (bitmap: readonly string[]) => ICON_BOX / bitmap[0].length;

export const ROLL_PERIOD = 24;
export const ROLL_DURATION = 11;

/** Build a deterministic deck: empty -> n variants -> empty. */
export function buildDeck(seed: string, n: number): (Variant | null)[] {
  const deck: (Variant | null)[] = [null];
  let last = -1;
  for (let i = 0; i < n; i++) {
    let pick = Math.floor(random(`${seed}-${i}`) * VARIANTS.length);
    // never repeat the previous face
    if (pick === last) pick = (pick + 1 + Math.floor(random(`${seed}-${i}-b`) * 3)) % VARIANTS.length;
    last = pick;
    deck.push(VARIANTS[pick]);
  }
  deck.push(null);
  return deck;
}

function TileFace({ variant, size }: { variant: Variant | null; size: number }) {
  if (!variant) return null;
  const bitmap = ICONS[variant.icon];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: variant.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <PixelBitmap bitmap={bitmap} unit={unitFor(bitmap)} ink={variant.ink} />
    </div>
  );
}

/**
 * One grid cell that slot-machines vertically through its deck.
 * `dir` = 1 rolls upward (next face enters from below), -1 rolls downward.
 */
export function TileRoller({
  id,
  deck,
  offset,
  dir,
  size,
  left,
  top,
}: {
  id: string;
  deck: (Variant | null)[];
  offset: number;
  dir: 1 | -1;
  size: number;
  left: number;
  top: number;
}) {
  const frame = useCurrentFrame();
  // +ROLL_PERIOD so the first face rolls in AT `offset` rather than a period later
  const local = frame - offset + ROLL_PERIOD;

  const rawStep = Math.floor(local / ROLL_PERIOD);
  const step = Math.max(0, Math.min(deck.length - 1, rawStep));
  const t = local - rawStep * ROLL_PERIOD;

  const p =
    rawStep < 1 || rawStep > deck.length - 1
      ? 1
      : interpolate(t, [0, ROLL_DURATION], [0, 1], {
          easing: Easing.inOutCubic,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  const outgoing = deck[Math.max(0, step - 1)];
  const incoming = deck[step];

  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        overflow: "hidden",
      }}
    >
      {p < 1 ? (
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${-dir * p * size}px)` }}>
          <TileFace variant={outgoing} size={size} />
        </div>
      ) : null}
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${dir * (1 - p) * size}px)` }}>
        <TileFace variant={incoming} size={size} />
      </div>
    </div>
  );
}
