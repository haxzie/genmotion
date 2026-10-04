import * as THREE from "three";

/**
 * Studio environment built from core three only: a dark room with soft light panels.
 * Gives chrome and glossy teal something to reflect.
 */
export function studioEnv(renderer: THREE.WebGLRenderer, tint = "#ffffff") {
  const env = new THREE.Scene();
  env.background = new THREE.Color("#0b0c0d");
  const panel = (w: number, h: number, c: string, i: number, pos: [number, number, number], look: [number, number, number] = [0, 0, 0]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(...look);
    env.add(m);
  };
  panel(8, 3, tint, 3.2, [0, 6, 2]); // top softbox
  panel(2, 8, "#ffffff", 2.4, [-7, 1, 2]); // left strip
  panel(2, 8, tint, 1.6, [7, 0, -1]); // right strip
  panel(10, 2, "#ffffff", 0.6, [0, -6, 0]); // floor bounce
  panel(4, 4, tint, 1.2, [0, 1, -8]); // back
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.035);
  pmrem.dispose();
  return rt.texture;
}

/** The ∞ mark's centre line, traced from the reference (unit ≈ mark width / 2.1). */
const PATH: [number, number][] = [
  [365, 235], [322, 278], [245, 300], [158, 288], [100, 228], [98, 150], [148, 100], [228, 80], [306, 102],
  [368, 158], [430, 216], [498, 272], [578, 300], [658, 287], [714, 228], [714, 152], [664, 98], [586, 80],
  [514, 102], [464, 140],
];

/**
 * The ∞ mark as a chrome ribbon. Width ≈ 1 unit (scale it), centred at the origin, facing +z.
 */
export function infinityGeometry(thickness = 0.085) {
  const pts = PATH.map(([x, y], i) => {
    // a gentle depth swing so the ribbon reads as a twisted band, not a flat stroke
    const z = Math.sin((i / (PATH.length - 1)) * Math.PI * 2) * 0.05;
    return new THREE.Vector3((x - 406) / 630, -(y - 190) / 630, z);
  });
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const tube = new THREE.TubeGeometry(curve, 160, thickness / 2, 18, false);
  const merged: THREE.BufferGeometry[] = [tube];
  for (const t of [0, 1]) {
    const cap = new THREE.SphereGeometry(thickness / 2, 18, 12);
    const at = curve.getPointAt(t);
    cap.translate(at.x, at.y, at.z);
    merged.push(cap);
  }
  const geo = mergeSimple(merged);
  const S = 0.55;
  geo.scale(1, 1, S);
  const n = geo.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    v.set(n.getX(i), n.getY(i), n.getZ(i) / S).normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
  return geo;
}

function mergeSimple(geos: THREE.BufferGeometry[]) {
  const pos: number[] = [];
  const nor: number[] = [];
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

export function chromeMaterial(env: THREE.Texture, color = "#e9eef0") {
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.22, envMap: env, envMapIntensity: 2.4 });
}

/** Chrome ∞ mark mesh, `width` world units wide. */
export function infinityMark(env: THREE.Texture, width: number, name = "infinity-mark") {
  const mesh = new THREE.Mesh(infinityGeometry(), chromeMaterial(env));
  mesh.scale.setScalar(width);
  mesh.name = name;
  return mesh;
}

/** Teal glossy coin with a chrome ∞ on its face. Radius r, faces ±z. */
export function infinityCoin(env: THREE.Texture, r: number, name = "coin") {
  const g = new THREE.Group();
  g.name = name;
  const thick = r * 0.24;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, thick, 96, 1, false),
    [
      new THREE.MeshStandardMaterial({ color: "#7fe3e6", metalness: 1, roughness: 0.12, envMap: env, envMapIntensity: 1.4 }), // rim
      new THREE.MeshPhysicalMaterial({ color: "#45bfc4", metalness: 0.6, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06, envMap: env, envMapIntensity: 2.6 }),
      new THREE.MeshPhysicalMaterial({ color: "#45bfc4", metalness: 0.6, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06, envMap: env, envMapIntensity: 2.6 }),
    ],
  );
  body.rotation.x = Math.PI / 2;
  body.name = `${name}-body`;
  const mark = infinityMark(env, r * 1.05, `${name}-mark`);
  mark.position.z = thick / 2 + r * 0.02;
  mark.scale.z = r * 0.5;
  g.add(body, mark);
  return g;
}
