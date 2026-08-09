/**
 * Live DOM → a painted canvas, once per frame.
 *
 * modern-screenshot serializes the node into an SVG `<foreignObject>` and draws
 * it to a canvas. The expensive setup — resolving default computed styles in a
 * sandbox iframe, fetching fonts and inlining them as data URIs — is cached on
 * its `Context`, so we build **one** context per export and reuse it for every
 * frame. Creating a context per frame is what makes the naive version of this
 * loop unusably slow.
 *
 * See ../templates/README.md for the authoring rules that keep the output
 * faithful: inline styles, same-origin fonts, `data:` URI images, no filters or
 * blend modes.
 */

import { createContext, destroyContext, domToCanvas, type Context } from "modern-screenshot";

/**
 * The style properties copied onto every cloned element.
 *
 * By default modern-screenshot copies the entire computed style — ~340
 * properties per element, per frame. Restricting it to what the templates
 * actually use is the single biggest win in the frame loop. Anything a template
 * needs must be listed here; that constraint is documented in the templates
 * README, and the practical check is verification step 5 (compare an exported
 * frame against the preview).
 */
const STYLE_PROPERTIES = [
  // Box
  "position", "top", "right", "bottom", "left", "inset",
  "display", "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis",
  "align-items", "align-self", "justify-content", "gap", "row-gap", "column-gap",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "box-sizing", "overflow", "overflow-x", "overflow-y", "z-index",
  // Paint
  "background-color", "background-image", "background-size", "background-position",
  "background-repeat", "background-clip", "background-origin",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
  "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "border-top-left-radius", "border-top-right-radius",
  "border-bottom-left-radius", "border-bottom-right-radius",
  "opacity", "box-shadow", "color",
  // The rolling number fades each digit slot at its top and bottom edges so
  // glyphs in transit don't read as broken text. Both spellings: Safari and
  // older Chromium only honour the prefixed one.
  "mask-image", "-webkit-mask-image",
  // Type
  "font-family", "font-size", "font-weight", "font-style", "font-variant-numeric",
  "line-height", "letter-spacing", "word-spacing", "text-align", "text-transform",
  "text-decoration-line", "text-overflow", "white-space", "vertical-align",
  "-webkit-text-fill-color", "-webkit-background-clip",
  // Transform
  "transform", "transform-origin", "rotate", "scale", "translate",
  // Media
  "object-fit", "object-position",
  // SVG (the chart template draws inline SVG)
  "fill", "fill-opacity", "stroke", "stroke-width", "stroke-linecap",
  "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset", "stroke-opacity",
];

export interface Rasterizer {
  /** Paint the node's current state into `ctx`, replacing what's there. */
  drawFrame(ctx: CanvasRenderingContext2D): Promise<void>;
  dispose(): void;
}

export async function createRasterizer(
  node: HTMLElement,
  width: number,
  height: number,
): Promise<Rasterizer> {
  const context: Context<HTMLElement> = await createContext(node, {
    width,
    height,
    // The offscreen host is already at native resolution; scaling again would
    // resample and soften the output.
    scale: 1,
    // Templates paint their own background; anything behind them is not ours.
    backgroundColor: null,
    // We reuse this context for every frame and destroy it ourselves.
    autoDestruct: false,
    includeStyleProperties: STYLE_PROPERTIES,
    // The Safari/Firefox svg+xml decode workaround re-draws each image after a
    // delay. Keep the fix (it prevents blank frames there) but drop the delay
    // from 100ms — at 180 frames the default would add minutes.
    drawImageInterval: 0,
  });

  return {
    async drawFrame(ctx) {
      const frame = await domToCanvas(context);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(frame, 0, 0, width, height);
    },
    dispose() {
      destroyContext(context);
    },
  };
}
