import * as THREE from "three";
import { canvasTexture } from "./ui";

/**
 * The light scenes' backdrop: a lattice of tiny 4-dash crosshairs (measured:
 * 103.3 px across, 98.25 px down, a row on y = 540, columns offset half a
 * cell from x = 960). One InstancedMesh; `pose(i, scale, angle)` per mark.
 */
export function sparkleGrid(name = "sparkle-grid", color = "#cfcfd6", dx = 103.3, dy = 98.25) {
  const S = 36;
  const tex = canvasTexture(S, S, (g) => {
    g.strokeStyle = color;
    g.lineWidth = 2.2;
    g.lineCap = "round";
    const c = S / 2;
    for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      g.beginPath();
      g.moveTo(c + x * 5, c + y * 5);
      g.lineTo(c + x * 15.5, c + y * 15.5);
      g.stroke();
    }
  });
  const cols: number[] = [];
  for (let i = -10; i < 10; i++) cols.push((i + 0.5) * dx);
  const rows: number[] = [];
  for (let j = -6; j <= 6; j++) rows.push(j * dy);
  const pts: { x: number; y: number }[] = [];
  for (const y of rows) for (const x of cols) if (Math.abs(x) < 1000 && Math.abs(y) < 580) pts.push({ x, y });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(S, S), mat, pts.length);
  mesh.name = name;
  mesh.userData.pickable = false;
  mesh.renderOrder = -5;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const z = new THREE.Vector3(0, 0, 1);
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const pose = (i: number, scale: number, angle: number) => {
    const pt = pts[i]!;
    p.set(pt.x, pt.y, 0);
    q.setFromAxisAngle(z, angle);
    const k = Math.max(scale, 1e-4);
    s.set(k, k, 1);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  };
  const done = () => {
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { mesh, pts, pose, done, material: mat };
}
