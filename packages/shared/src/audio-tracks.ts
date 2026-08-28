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

/**
 * Frames a clip starting at `startFrame` on `track` may occupy before it runs
 * into the next clip on that lane. `Infinity` when the lane is clear from there
 * on, and 0 when a clip already covers `startFrame` — that lane has no room at
 * this position at all.
 */
export function availableFramesAt(
  existing: ClipPlacement[],
  track: number,
  startFrame: number,
): number {
  let room = Infinity;
  for (const c of existing) {
    if (c.track !== track) continue;
    if (c.startFrame <= startFrame && startFrame < c.startFrame + c.durationInFrames) {
      return 0;
    }
    if (c.startFrame > startFrame) {
      room = Math.min(room, c.startFrame - startFrame);
    }
  }
  return room;
}

export interface AudioPlacement {
  track: number;
  durationInFrames: number;
}

/**
 * Where a new clip lands, and how long it is allowed to be there.
 *
 * A clip arrives at its whole natural length; the only thing that shortens it
 * is something already in the way. In order:
 *
 * 1. The lane it was dropped on, if the whole clip fits there.
 * 2. The lane it was dropped on, trimmed to the gap in front of the next clip
 *    — dropping a song just before an existing one lays down the part that
 *    fits, because where you put it is where you meant it to go.
 * 3. Any lane that can hold the whole clip, opening a fresh one if need be —
 *    nothing is cut while an empty lane is going spare.
 * 4. Failing all that, the roomiest gap on offer.
 *
 * Returns null when every lane is already playing AT `startFrame`: there is no
 * gap to trim to, and the caller should reject the placement.
 */
export function resolveAudioPlacement(
  existing: ClipPlacement[],
  startFrame: number,
  durationInFrames: number,
  requestedTrack?: number | null,
): AudioPlacement | null {
  const requested =
    requestedTrack != null &&
    Number.isInteger(requestedTrack) &&
    requestedTrack >= 0 &&
    requestedTrack < MAX_AUDIO_TRACKS
      ? requestedTrack
      : null;

  if (requested !== null) {
    const room = availableFramesAt(existing, requested, startFrame);
    if (room >= 1) {
      return {
        track: requested,
        durationInFrames: Math.min(durationInFrames, room),
      };
    }
  }

  const whole = resolveAudioTrack(existing, startFrame, durationInFrames);
  if (whole !== null) return { track: whole, durationInFrames };

  let best: AudioPlacement | null = null;
  for (let track = 0; track < MAX_AUDIO_TRACKS; track++) {
    const room = availableFramesAt(existing, track, startFrame);
    if (room < 1) continue;
    const frames = Math.min(durationInFrames, room);
    if (!best || frames > best.durationInFrames) best = { track, durationInFrames: frames };
  }
  return best;
}
