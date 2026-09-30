/** Scene 2 pieces: wireframe globes, the orb, icon badges. */
import * as THREE from "three";
import { canvasMesh, disc, ring } from "./kit";
import { orbGradient } from "./ui";

/** Lat/long wireframe globe as line segments. */
export function wireGlobe(r: number, name: string, opacity = 0.55) {
  const pts: number[] = [];
  const lat = 9, lon = 14, seg = 64;
  for (let i = 1; i < lat; i++) {
    const phi = (i / lat) * Math.PI;
    const y = Math.cos(phi) * r, rr = Math.sin(phi) * r;
    for (let s = 0; s < seg; s++) {
      const a0 = (s / seg) * Math.PI * 2, a1 = ((s + 1) / seg) * Math.PI * 2;
      pts.push(Math.cos(a0) * rr, y, Math.sin(a0) * rr, Math.cos(a1) * rr, y, Math.sin(a1) * rr);
    }
  }
  for (let j = 0; j < lon; j++) {
    const th = (j / lon) * Math.PI * 2;
    for (let s = 0; s < seg; s++) {
      const p0 = (s / seg) * Math.PI, p1 = ((s + 1) / seg) * Math.PI;
      pts.push(
        Math.sin(p0) * Math.cos(th) * r, Math.cos(p0) * r, Math.sin(p0) * Math.sin(th) * r,
        Math.sin(p1) * Math.cos(th) * r, Math.cos(p1) * r, Math.sin(p1) * Math.sin(th) * r,
      );
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({ color: "#d8dbd9", transparent: true, opacity, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.name = name;
  // a dark core so back lines read dimmer, like the reference
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.985, 48, 32),
    new THREE.MeshBasicMaterial({ color: "#050605", transparent: true, opacity: 0.55, depthWrite: false }),
  );
  core.userData.pickable = false;
  const g = new THREE.Group();
  g.name = `${name}-group`;
  g.add(core, lines);
  return { group: g, lines, mat, coreMat: core.material as THREE.MeshBasicMaterial };
}

/** The glowing yellow/red orb disc with its concentric halo. */
export function orb(r: number) {
  const g = new THREE.Group();
  g.name = "orb";
  const halos: THREE.Mesh[] = [];
  for (const [rr, c, o] of [[200, "#1b1c1c", 0.55], [150, "#202121", 0.7], [96, "#232424", 0.9]] as const) {
    const d = disc(rr, c, o);
    d.userData.pickable = false;
    halos.push(d);
    g.add(d);
  }
  const edge = ring(r + 16, 2, "#5a5d5c", 0.9);
  edge.userData.pickable = false;
  g.add(edge);
  const face = canvasMesh(r * 2, r * 2, (c) => {
    c.beginPath();
    c.arc(r, r, r, 0, Math.PI * 2);
    c.fillStyle = orbGradient(c, r * 2, r * 2);
    c.fill();
    for (const [x, y, s] of [[0.5, 0.28, 0.14], [0.26, 0.76, 0.12], [0.76, 0.74, 0.1]] as const) {
      const b = c.createRadialGradient(x * 2 * r, y * 2 * r, 0, x * 2 * r, y * 2 * r, s * 2 * r);
      b.addColorStop(0, "rgba(255,215,82,0.55)");
      b.addColorStop(1, "rgba(255,215,82,0)");
      c.fillStyle = b;
      c.fillRect(0, 0, 2 * r, 2 * r);
    }
  }, { res: 3, name: "orb-face" });
  face.position.z = 0.5;
  g.add(face);
  return { group: g, face, halos, edge };
}

/** Dark circular badge with a white icon texture inside. */
export function badge(tex: THREE.Texture, name: string, r = 34) {
  const g = new THREE.Group();
  g.name = name;
  const bgd = disc(r, "#1a1b1b", 1);
  const edge = ring(r, 1.5, "#3c3e3d", 1);
  const icon = new THREE.Mesh(
    new THREE.PlaneGeometry(r * 0.95, r * 0.95),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  icon.position.z = 0.2;
  icon.name = `${name}-icon`;
  bgd.name = `${name}-disc`;
  edge.name = `${name}-edge`;
  g.add(bgd, edge, icon);
  return g;
}
