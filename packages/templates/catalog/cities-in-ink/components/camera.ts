import * as THREE from "three";

export type V3 = [number, number, number];

/**
 * Hermite interpolation *in time*: every key is reached exactly at its frame,
 * and velocity is continuous through it (tangent = neighbour difference over
 * neighbour time), so speed never jumps at a key.
 *   easeIn  — start from rest (otherwise already moving: an incoming cut)
 *   easeOut — come to rest on the last key (otherwise still moving: an outgoing cut)
 */
export function track(frames: number[], values: number[][], easeIn = true, easeOut = true) {
  const n = frames.length, dim = values[0].length;
  const tan: number[][] = [];
  for (let i = 0; i < n; i++) {
    const m: number[] = [];
    for (let d = 0; d < dim; d++) {
      if (i === 0) m.push(easeIn ? 0 : (values[1][d] - values[0][d]) / (frames[1] - frames[0]));
      else if (i === n - 1) m.push(easeOut ? 0 : (values[i][d] - values[i - 1][d]) / (frames[i] - frames[i - 1]));
      else m.push((values[i + 1][d] - values[i - 1][d]) / (frames[i + 1] - frames[i - 1]));
    }
    tan.push(m);
  }
  return (f: number, out: number[] = new Array(dim)) => {
    if (f <= frames[0]) { for (let d = 0; d < dim; d++) out[d] = values[0][d]; return out; }
    if (f >= frames[n - 1]) { for (let d = 0; d < dim; d++) out[d] = values[n - 1][d]; return out; }
    let i = 0;
    while (f > frames[i + 1]) i++;
    const h = frames[i + 1] - frames[i], t = (f - frames[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    const a = 2 * t3 - 3 * t2 + 1, b = t3 - 2 * t2 + t, c = -2 * t3 + 3 * t2, e = t3 - t2;
    for (let d = 0; d < dim; d++) out[d] = a * values[i][d] + b * h * tan[i][d] + c * values[i + 1][d] + e * h * tan[i + 1][d];
    return out;
  };
}

export interface CamKey { f: number; p: V3; look: V3; roll?: number }

/**
 * A camera rig. Position follows a time-Hermite track; the aim is interpolated
 * as a *direction* (then normalised), so it turns at a steady angular rate
 * no matter how near or far each key's look target is.
 */
export function cameraRig(keys: CamKey[], opts: { easeIn?: boolean; easeOut?: boolean } = {}) {
  const fs = keys.map((k) => k.f);
  const pos = track(fs, keys.map((k) => k.p), opts.easeIn ?? true, opts.easeOut ?? true);
  const dirs = keys.map((k) => {
    const v = new THREE.Vector3(...k.look).sub(new THREE.Vector3(...k.p)).normalize();
    return [v.x, v.y, v.z, k.roll ?? 0];
  });
  const aim = track(fs, dirs, opts.easeIn ?? true, opts.easeOut ?? true);
  const p = [0, 0, 0], a = [0, 0, 0, 0];
  const target = new THREE.Vector3();
  return (camera: THREE.Camera, frame: number) => {
    pos(frame, p);
    aim(frame, a);
    camera.position.set(p[0], p[1], p[2]);
    target.set(a[0], a[1], a[2]).normalize().add(camera.position);
    camera.lookAt(target);
    if (a[3]) camera.rotateZ(a[3]);
  };
}
