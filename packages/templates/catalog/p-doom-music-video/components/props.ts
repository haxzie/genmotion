import * as THREE from "three";

/** A paperclip as a tube along its two nested loops (about 1 × 2.9 units). */
export function paperclipGeometry(radius = 0.045, tubular = 48) {
  const pts = [
    [0.2, 0.9], [0.2, -0.9], [0, -1.1], [-0.2, -0.9], [-0.2, 1.2], [0, 1.4], [0.35, 1.2], [0.35, -1.2], [0, -1.45], [-0.35, -1.2], [-0.35, 0.6],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), tubular, radius, 5, false);
}

/** A puffy extruded heart, centred, about 3 units wide. */
export function heartGeometry() {
  const hs = new THREE.Shape();
  hs.moveTo(0, -1.2);
  hs.bezierCurveTo(-0.3, -0.9, -1.5, -0.2, -1.5, 0.55);
  hs.bezierCurveTo(-1.5, 1.35, -0.55, 1.6, 0, 0.95);
  hs.bezierCurveTo(0.55, 1.6, 1.5, 1.35, 1.5, 0.55);
  hs.bezierCurveTo(1.5, -0.2, 0.3, -0.9, 0, -1.2);
  const g = new THREE.ExtrudeGeometry(hs, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 6, curveSegments: 32 });
  g.center();
  return g;
}
