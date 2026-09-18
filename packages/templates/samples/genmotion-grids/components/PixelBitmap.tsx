import React from "react";
import type { Bitmap } from "./brand";

/**
 * Renders a "#"/"." bitmap as hard-edged square pixels.
 * `ink` paints every cell one color; `rowInk` paints per row (used by the logo).
 */
export function PixelBitmap({
  bitmap,
  unit,
  ink,
  rowInk,
  id,
}: {
  bitmap: Bitmap;
  unit: number;
  ink?: string;
  rowInk?: readonly string[];
  id?: string;
}) {
  const cols = bitmap[0].length;
  return (
    <div
      id={id}
      style={{
        position: "relative",
        width: cols * unit,
        height: bitmap.length * unit,
      }}
    >
      {bitmap.map((row, r) =>
        row.split("").map((ch, c) =>
          ch === "#" ? (
            <div
              key={`${r}-${c}`}
              style={{
                position: "absolute",
                left: c * unit,
                top: r * unit,
                // half-pixel overlap kills hairline seams between cells
                width: unit + 0.5,
                height: unit + 0.5,
                backgroundColor: rowInk ? rowInk[r % rowInk.length] : ink,
              }}
            />
          ) : null,
        ),
      )}
    </div>
  );
}
