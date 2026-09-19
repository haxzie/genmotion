import { BrowserWindow } from "electron";

/**
 * The offscreen window every capture path draws in.
 *
 * Offscreen rather than merely hidden: a hidden window stops painting, and the
 * capture comes back blank. Background throttling is off for the same reason.
 */

/**
 * Session partition for windows rendered at a reduced scale.
 *
 * `zoomFactor` is how a composition laid out at its full size gets painted at
 * a quarter of the pixels — the layout viewport stays 1920×1080 CSS px while
 * the window is 480×270, which is what keeps a body that centres its
 * composition centring it in the same place. But Chromium keeps zoom per
 * host, per session: zooming a page from the loopback server would zoom the
 * preview iframe, which loads from the same host. So scaled windows live in
 * their own in-memory session, and the zoom stays there. Anything the page
 * loads through a custom protocol has to be registered on this partition too
 * (see `registerAssetProtocol` in main.ts).
 */
export const SCALED_PARTITION = "scaled-capture";

export function openOffscreenWindow(size: {
  width: number;
  height: number;
  /** 1 renders the composition pixel for pixel; below that, smaller and cheaper. */
  scale?: number;
}): BrowserWindow {
  const scale = size.scale ?? 1;
  const scaled = scale !== 1;
  return new BrowserWindow({
    width: Math.max(1, Math.ceil(size.width * scale)),
    height: Math.max(1, Math.ceil(size.height * scale)),
    show: false,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
      nodeIntegration: false,
      contextIsolation: true,
      ...(scaled ? { zoomFactor: scale, partition: SCALED_PARTITION } : {}),
    },
  });
}
