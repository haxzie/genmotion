import * as THREE from "three";

/**
 * A polyline as a flat ribbon of constant pixel width. Reveal it progressively
 * with `setProgress(0..1)` (a drawRange, so nothing is reallocated per frame).
 */
export function ribbon(points: THREE.Vector2[], width: number, color: string, additive = false, name = "ribbon") {
  const n = points.length;
  const pos = new Float32Array(n * 2 * 3);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * (width / 2);
    const ny = (dx / l) * (width / 2);
    pos.set([p.x + nx, p.y + ny, 0, p.x - nx, p.y - ny, 0], i * 6);
  }
  const idx: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.frustumCulled = false;
  const total = (n - 1) * 6;
  const setProgress = (p: number) => {
    const segs = Math.max(0, Math.min(n - 1, Math.floor(p * (n - 1))));
    geo.setDrawRange(0, segs * 6);
  };
  setProgress(1);
  return { mesh, mat, setProgress, total, head: (p: number) => points[Math.max(0, Math.min(n - 1, Math.floor(p * (n - 1))))] };
}

/** Soft radial glow sprite (additive), for hotspots and spark heads. */
export function glowDot(radius: number, color: string, name = "glow") {
  const c = new OffscreenCanvas(128, 128);
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  m.name = name;
  m.userData.pickable = false;
  return m;
}

/** A flat rectangle (for bands, bars, panels). Origin centre. */
export function rect(w: number, h: number, color: string, opacity = 1, name = "rect", additive = false) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }),
  );
  m.name = name;
  return m;
}
