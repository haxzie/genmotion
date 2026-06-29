export interface SceneDuration {
  id: string;
  durationInFrames: number;
}

/** Cumulative start frame of each scene: [0, d0, d0+d1, ...] (length = scenes.length). */
export function sceneStartFrames(scenes: SceneDuration[]): number[] {
  const starts: number[] = [];
  let acc = 0;
  for (const scene of scenes) {
    starts.push(acc);
    acc += scene.durationInFrames;
  }
  return starts;
}

export function totalDurationInFrames(scenes: SceneDuration[]): number {
  return scenes.reduce((sum, s) => sum + s.durationInFrames, 0);
}

export interface LocalFrame {
  sceneIndex: number;
  localFrame: number;
}

/**
 * Map a global timeline frame to the scene that owns it and the frame within
 * that scene. Frames past the end clamp to the last frame of the last scene.
 */
export function globalToLocal(
  scenes: SceneDuration[],
  globalFrame: number,
): LocalFrame | null {
  if (scenes.length === 0) return null;
  let acc = 0;
  for (let i = 0; i < scenes.length; i++) {
    const duration = scenes[i]!.durationInFrames;
    if (globalFrame < acc + duration) {
      return { sceneIndex: i, localFrame: Math.max(0, globalFrame - acc) };
    }
    acc += duration;
  }
  const lastIndex = scenes.length - 1;
  return {
    sceneIndex: lastIndex,
    localFrame: scenes[lastIndex]!.durationInFrames - 1,
  };
}

export function localToGlobal(
  scenes: SceneDuration[],
  sceneIndex: number,
  localFrame: number,
): number {
  let acc = 0;
  for (let i = 0; i < sceneIndex; i++) acc += scenes[i]!.durationInFrames;
  return acc + localFrame;
}

export function framesToTimecode(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = Math.floor(frame % fps);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(frames).padStart(2, "0")}`;
}
