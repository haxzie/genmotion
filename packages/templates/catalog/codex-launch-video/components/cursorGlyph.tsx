/**
 * The project's one cursor glyph — Fluent "cursor-16-filled"
 * (source: assets/fluent-cursor-16-filled.svg), drawn dark with a white border.
 *
 * Inlined as a path rather than an <Img> so it can take a stroke and a fill.
 * Both <Cursor> and <MotionCursor> render it through <CursorGlyph>, so every
 * scene shows the same pointer.
 */
export const CURSOR_VIEWBOX = 16;
export const CURSOR_PATH =
  "M4.002 2.998a1 1 0 0 1 1.6-.8L13.6 8.2c.768.576.36 1.8-.6 1.8H9.053a1 1 0 0 0-.793.39l-2.466 3.215c-.581.758-1.793.347-1.793-.609z";

/** Hotspot — the rounded tip, in glyph units. Rotation and positioning pivot here. */
export const CURSOR_TIP = { x: 4.25, y: 2.55 };

/** Direction the glyph points at rest (tail → tip), degrees. Tip → body centroid ≈ (3.3, 5.9). */
export const CURSOR_REST_HEADING = (Math.atan2(-5.9, -3.3) * 180) / Math.PI; // ≈ -119°

/**
 * This glyph fills less of its box than the old arrow did; scale it so a given
 * `size` prop still reads at the same on-screen height as before.
 */
export const CURSOR_SIZE_COMP = 1.15;

export const CURSOR_FILL = "#111114";
export const CURSOR_BORDER = "#ffffff";

/** The glyph, in its own 16-unit space. Wrap it in a transform to place it. */
export function CursorGlyph() {
  return (
    <path
      d={CURSOR_PATH}
      fill={CURSOR_FILL}
      stroke={CURSOR_BORDER}
      strokeWidth={1.35}
      strokeLinejoin="round"
      strokeLinecap="round"
      paintOrder="stroke"
    />
  );
}
