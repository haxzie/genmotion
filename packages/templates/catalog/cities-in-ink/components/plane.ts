/**
 * The storyline's protagonist: a letter folded into a paper plane, drawn in
 * the same ink as the cities. It flies a time-keyed track, banks into its
 * turns, and leaves a dashed pencil route behind it like a line on a map.
 */
import * as THREE from "three";
import { Ink, beams } from "./ink";
import { track, V3 } from "./camera";

export interface FlyKey { f: number; p: V3 }

const TRAIL = 40; // frames of route drawn behind the plane

export function paperPlane(parent: THREE.Object3D, ink: Ink, keys: FlyKey[], opts: { size: number; easeIn?: boolean; easeOut?: boolean; trail?: boolean }) {
  const s = opts.size;
  const path = track(keys.map((k) => k.f), keys.map((k) => k.p), opts.easeIn ?? false, opts.easeOut ?? false);

  // nose along +z; a classic dart: two wings folded off a central keel
  const N = [0, 0, 0.62], T = [0, 0.02, -0.38], K = [0, -0.13, -0.38];
  const L = [-0.42, 0.07, -0.42], R = [0.42, 0.07, -0.42];
  const tri = [...N, ...T, ...L, ...N, ...R, ...T, ...N, ...K, ...T];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(tri.map((v) => v * s), 3));
  geo.computeVertexNormals();
  const paper = ink.round({ tone: 0.22, hatch: s * 0.03 });
  paper.side = THREE.DoubleSide;
  const body = new THREE.Mesh(geo, paper);
  body.name = "letter-plane-paper";

  const E: number[] = [];
  const edge = (a: number[], b: number[]) => E.push(...a.map((v) => v * s), ...b.map((v) => v * s));
  edge(N, L); edge(L, T); edge(N, R); edge(R, T); edge(N, T); edge(N, K); edge(K, T);
  // the letter's writing, faint on the wings
  for (const side of [-1, 1]) {
    for (let i = 1; i <= 3; i++) {
      const t = i / 4.2;
      edge([side * 0.05, 0.03, 0.4 - t * 0.75], [side * (0.08 + t * 0.26), 0.05, 0.25 - t * 0.62]);
    }
  }
  const eg = new THREE.BufferGeometry();
  eg.setAttribute("position", new THREE.Float32BufferAttribute(E, 3));
  const foldMat = ink.line({ fade: 0.6 });
  const outline = new THREE.LineSegments(eg, foldMat);
  outline.name = "letter-plane-folds";
  const folds = beams(E.slice(0, 7 * 6), s * 0.014, foldMat, "letter-plane-edges");

  const plane = new THREE.Group();
  plane.name = "letter-plane";
  plane.add(body, outline, folds);

  // dashed route: positions refreshed in place each frame (no allocation)
  const routePos = new Float32Array(TRAIL * 6);
  const routeGeo = new THREE.BufferGeometry();
  routeGeo.setAttribute("position", new THREE.BufferAttribute(routePos, 3));
  const route = new THREE.LineSegments(routeGeo, ink.line({ fade: 0.8, opacity: 0.55 }));
  route.name = "letter-route";
  route.frustumCulled = false;
  route.visible = opts.trail !== false;

  const group = new THREE.Group();
  group.name = "letter";
  group.add(plane, route);
  parent.add(group);

  const p0 = [0, 0, 0], p1 = [0, 0, 0], pa = [0, 0, 0], pb = [0, 0, 0];
  const UP = new THREE.Vector3(0, 1, 0);
  const v = new THREE.Vector3(), acc = new THREE.Vector3(), right = new THREE.Vector3(), tgt = new THREE.Vector3();
  const startF = keys[0].f;

  return (frame: number, time: number) => {
    path(frame, p0);
    path(frame + 1, p1);
    path(frame - 4, pa);
    path(frame + 4, pb);
    v.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    if (v.lengthSq() < 1e-8) v.set(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]);
    if (v.lengthSq() < 1e-8) v.set(0, 0, 1);
    // lateral acceleration (curvature) sets the bank, like a real glider
    acc.set(pb[0] - 2 * p0[0] + pa[0], pb[1] - 2 * p0[1] + pa[1], pb[2] - 2 * p0[2] + pa[2]);
    right.crossVectors(v, UP).normalize();
    const bank = THREE.MathUtils.clamp(-acc.dot(right) / Math.max(v.length(), 1e-3) * 2.2, -0.75, 0.75);
    plane.position.set(p0[0], p0[1] + Math.sin(time * 2.1) * s * 0.03, p0[2]);
    tgt.copy(plane.position).add(v);
    plane.lookAt(tgt);
    plane.rotateZ(bank + Math.sin(time * 3.3) * 0.04);

    // the route: TRAIL segments, every other one drawn (dashed)
    for (let i = 0; i < TRAIL; i++) {
      const fa = Math.max(frame - (i + 1) * 1.0, startF), fb = Math.max(frame - (i + 0.45) * 1.0, startF);
      path(fa, pa);
      path(fb, pb);
      routePos.set([pa[0], pa[1], pa[2], pb[0], pb[1], pb[2]], i * 6);
    }
    routeGeo.attributes.position.needsUpdate = true;
  };
}
