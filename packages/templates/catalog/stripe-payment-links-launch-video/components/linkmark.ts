import * as THREE from "three";
import { C } from "./brand";

/**
 * Light studio environment: a pale room with big soft panels, so chrome and glossy
 * blurple read bright on a light film instead of reflecting a dark void.
 */
export function studioEnvLight(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color("#dfe4ec");
  const panel = (w: number, h: number, c: string, i: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(10, 4, "#ffffff", 2.2, [0, 6, 2]);
  panel(2.5, 8, "#ffffff", 1.8, [-7, 1, 3]);
  panel(2.5, 8, "#e9e7ff", 1.4, [7, 0, 0]);
  panel(10, 3, "#c8ccd6", 0.7, [0, -6, 0]);
  panel(4, 4, "#ffffff", 1.0, [0, 1, -8]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.04);
  pmrem.dispose();
  return rt.texture;
}

function stadium(len: number, h: number, segs = 40): THREE.Vector3[] {
  const r = h / 2, s = len / 2 - r;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < segs; i++) {
    const a = -Math.PI / 2 + (i / segs) * Math.PI;
    pts.push(new THREE.Vector3(s + Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  for (let i = 0; i < segs; i++) {
    const a = Math.PI / 2 + (i / segs) * Math.PI;
    pts.push(new THREE.Vector3(-s + Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  return pts;
}

function merge(geos: THREE.BufferGeometry[]) {
  const pos: number[] = [], nor: number[] = [];
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    pos.push(...(g.attributes.position.array as Float32Array));
    nor.push(...(g.attributes.normal.array as Float32Array));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

/**
 * The Payment Links motif in 3D: two interlocking chain loops on a diagonal, as
 * rounded tubes. Centred, 1 unit wide (its bounding box), facing +z.
 */
export function linkGeometry(tube = 0.058) {
  const loops: THREE.BufferGeometry[] = [];
  for (const [dx, tilt] of [[-0.23, 0.22], [0.23, -0.22]] as const) {
    const pts = stadium(0.66, 0.34).map((p) => p.clone().add(new THREE.Vector3(dx, 0, 0)));
    // lift one half of each loop so the two pass through each other like a real chain
    for (const p of pts) p.z = Math.sin(((p.x - dx) / 0.33) * Math.PI * 0.5) * tilt * 0.22;
    const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
    loops.push(new THREE.TubeGeometry(curve, 200, tube, 20, true));
  }
  const geo = merge(loops);
  geo.rotateZ(Math.PI / 4);
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const w = bb.max.x - bb.min.x;
  geo.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);
  geo.scale(1 / w, 1 / w, 1 / w);
  return geo;
}

export function chromeLight(env: THREE.Texture, color = "#ffffff") {
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.16, envMap: env, envMapIntensity: 1.4 });
}

/** Glossy blurple coin with a chrome chain-link on its face. Radius r, faces ±z. */
export function linkCoin(env: THREE.Texture, r: number, name = "link-coin") {
  const g = new THREE.Group();
  g.name = name;
  const thick = r * 0.24;
  const face = new THREE.MeshPhysicalMaterial({ color: "#5148F0", metalness: 0.2, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, envMap: env, envMapIntensity: 1.05, sheen: 0.4, sheenColor: new THREE.Color("#B9B5FF") });
  const rim = new THREE.MeshStandardMaterial({ color: "#d9d6ff", metalness: 1, roughness: 0.12, envMap: env, envMapIntensity: 1.5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, thick, 96, 1, false), [rim, face, face]);
  body.rotation.x = Math.PI / 2;
  body.name = `${name}-body`;
  const mark = new THREE.Mesh(linkGeometry(), chromeLight(env));
  mark.name = `${name}-mark`;
  mark.scale.set(r * 1.05, r * 1.05, r * 0.9);
  mark.position.z = thick / 2 + r * 0.04;
  g.add(body, mark);
  return g;
}
