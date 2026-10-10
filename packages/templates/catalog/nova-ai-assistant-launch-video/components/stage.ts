import * as THREE from "three";

/**
 * A camera-locked layer where 1 unit = 1 design pixel of a 1080-tall frame,
 * origin at the frame centre, y up. Everything 2D in the film lives here, so
 * sizes and positions can be read straight off the reference (scaled to 1080).
 */
export const DH = 1080;

export function screenLayer(scene: THREE.Scene, camera: THREE.PerspectiveCamera): THREE.Group {
  const dist = DH / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  if (!camera.parent) scene.add(camera);
  const layer = new THREE.Group();
  layer.name = "screen-layer";
  layer.position.z = -dist;
  camera.add(layer);
  camera.far = Math.max(camera.far, dist * 1.5);
  camera.updateProjectionMatrix();
  return layer;
}

/** Design width of the frame in layer units (1920 at 16:9). */
export const designWidth = (width: number, height: number) => (DH * width) / height;

/** Fraction of frame (0..1 from top-left) -> layer units. */
export function fx(f: number, width: number, height: number) {
  return (f - 0.5) * designWidth(width, height);
}
export function fy(f: number) {
  return (0.5 - f) * DH;
}

/**
 * Keyframe track [frame, value][] with monotone cubic (Fritsch–Carlson)
 * interpolation: velocity is continuous through every key, so motion never
 * stalls at a key, and it never overshoots between keys.
 */
export function track(keys: [number, number][]) {
  const n = keys.length;
  const t = keys.map((k) => k[0]);
  const v = keys.map((k) => k[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((v[i + 1]! - v[i]!) / (t[i + 1]! - t[i]!));
  const m: number[] = new Array(n).fill(0);
  if (n > 1) {
    m[0] = d[0]!;
    m[n - 1] = d[n - 2]!;
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) {
        m[i] = 0;
        m[i + 1] = 0;
        continue;
      }
      const a = m[i]! / d[i]!;
      const b = m[i + 1]! / d[i]!;
      const h = a * a + b * b;
      if (h > 9) {
        const k = 3 / Math.sqrt(h);
        m[i] = k * a * d[i]!;
        m[i + 1] = k * b * d[i]!;
      }
    }
  }
  return (x: number) => {
    if (x <= t[0]!) return v[0]!;
    if (x >= t[n - 1]!) return v[n - 1]!;
    let i = 0;
    while (x > t[i + 1]!) i++;
    const h = t[i + 1]! - t[i]!;
    const u = (x - t[i]!) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v[i]! + (u3 - 2 * u2 + u) * h * m[i]! + (-2 * u3 + 3 * u2) * v[i + 1]! + (u3 - u2) * h * m[i + 1]!;
  };
}
