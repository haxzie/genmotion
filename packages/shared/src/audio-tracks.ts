/** Maximum number of project-level audio lanes on the timeline. */
export const MAX_AUDIO_TRACKS = 4;

export interface ClipPlacement {
  track: number;
  startFrame: number;
  durationInFrames: number;
}

/** Two clips overlap when their [start, end) frame ranges intersect. */
export function clipsOverlap(a: ClipPlacement, b: ClipPlacement): boolean {
  return (
    a.startFrame < b.startFrame + b.durationInFrames &&
    b.startFrame < a.startFrame + a.durationInFrames
  );
}

/**
 * Pick the lane a new clip should live on. Honors `requestedTrack` when it's in
 * range and free; otherwise returns the lowest lane where the clip doesn't
 * overlap an existing clip (opening a fresh lane if earlier ones are busy).
 * Returns null when every lane already has something at this time range —
 * callers decide whether to reject or bump the clip elsewhere. `existing`
 * should exclude the clip being placed (when moving/resizing an existing one).
 */
export function resolveAudioTrack(
  existing: ClipPlacement[],
  startFrame: number,
  durationInFrames: number,
  requestedTrack?: number | null,
): number | null {
  const candidate = { startFrame, durationInFrames };
  const fits = (track: number) =>
    !existing.some(
      (c) => c.track === track && clipsOverlap(c, { ...candidate, track }),
    );

  if (
    requestedTrack != null &&
    Number.isInteger(requestedTrack) &&
    requestedTrack >= 0 &&
    requestedTrack < MAX_AUDIO_TRACKS &&
    fits(requestedTrack)
  ) {
    return requestedTrack;
  }

  for (let t = 0; t < MAX_AUDIO_TRACKS; t++) {
    if (fits(t)) return t;
  }
  return null;
}
