/**
 * The small pieces both export paths share.
 *
 * There are two: `export-video` screenshots a React DOM template per frame, and
 * `export-canvas-video` blits a canvas a scene has already drawn. They have
 * nothing in common but the cancel signal, the yield, and saving the file, and
 * keeping those here is what lets the canvas path load without dragging
 * modern-screenshot and the player in behind it.
 */

export class ExportCancelled extends Error {
  constructor() {
    super("Export cancelled");
    this.name = "ExportCancelled";
  }
}

/**
 * Let the browser paint (progress bar, cancel button) between chunks of work.
 *
 * Raced against a timer rather than left on `requestAnimationFrame` alone:
 * rAF stops firing entirely when the window is occluded or the tab is in the
 * background, and an export that yields on it would not slow down there, it
 * would stop until the user came back to look at it.
 */
export const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    requestAnimationFrame(done);
    setTimeout(done, 32);
  });

/** Save an exported blob to disk. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}
