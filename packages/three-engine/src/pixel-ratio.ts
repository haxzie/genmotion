/**
 * The drawing buffer is sized in device pixels because the export captures at
 * the display's DPR and ffmpeg scales back down. Capped at 2: past that the
 * memory is real and the supersampling is already spent.
 */
export function capturePixelRatio(): number {
  return Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 2);
}
