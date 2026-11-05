/**
 * The wire format the Browser tab's picture arrives in.
 *
 * `multipart/x-mixed-replace` is the one streaming image format an `<img>`
 * renders on its own: the renderer holds no decode loop, no frame buffer and
 * no backpressure logic, and a tab that cannot keep up drops frames inside
 * Chromium rather than queueing them in the main process.
 *
 * Its own module so the probe can drive the real framing rather than a copy
 * of it — the bug this shape invites is an off-by-one in the CRLFs, which
 * shows up as a picture that never paints and nothing in a log.
 */

export const MJPEG_BOUNDARY = "gmframe";

export function mjpegHeaders(): Record<string, string> {
  return {
    "content-type": `multipart/x-mixed-replace; boundary=${MJPEG_BOUNDARY}`,
    "cache-control": "no-store",
    connection: "keep-alive",
  };
}

/** One frame: its own part header, the bytes, and the CRLF that closes it. */
export function mjpegChunk(jpeg: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from(
      `--${MJPEG_BOUNDARY}\r\ncontent-type: image/jpeg\r\ncontent-length: ${jpeg.length}\r\n\r\n`,
    ),
    jpeg,
    Buffer.from("\r\n"),
  ]);
}
