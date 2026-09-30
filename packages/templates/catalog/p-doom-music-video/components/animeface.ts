import * as THREE from "three";
import { C } from "./brand";
import { rng } from "./music";

/* ------------------------------------------------------------------ eye */

const EYE_FRAG = /* glsl */ `
  uniform float uBlink, uTime, uSpark, uCircuit, uGlow, uDilate;
  uniform vec2 uLook;
  uniform vec3 uIrisA, uIrisB, uLash;
  varying vec2 vUv;

  float topC(float x) { return 0.60 - 0.62 * pow(x + 0.06, 2.0); }
  float botC(float x) { return -0.58 + 0.34 * x * x; }
  float band(float v, float a, float b, float aa) { return smoothstep(a - aa, a + aa, v) * (1.0 - smoothstep(b - aa, b + aa, v)); }
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float star(vec2 d, float s) {
    d = abs(d) / s;
    return clamp(exp(-d.x * 9.0) * exp(-d.y * 1.6) + exp(-d.y * 9.0) * exp(-d.x * 1.6) + exp(-length(d) * 5.0), 0.0, 1.0);
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float aa = fwidth(p.y) * 1.2;
    float yt0 = topC(p.x);
    float yb = botC(p.x);
    float open = yt0 - yb;
    float yt = mix(yt0, yb + 0.02, uBlink);
    float xm = smoothstep(-0.98, -0.9, p.x) * (1.0 - smoothstep(0.93, 1.0, p.x)) * step(0.0, open);
    float inside = band(p.y, yb, yt, aa) * xm;

    // sclera, shaded blue-lilac under the lid
    vec3 col = vec3(1.0, 0.99, 1.0);
    col = mix(col, vec3(0.72, 0.74, 0.95), smoothstep(yt - 0.42, yt, p.y) * 0.85);

    // the iris: a tall oval, dark at the top, luminous at the bottom
    vec2 ic = uLook + vec2(0.0, -0.06);
    vec2 q = (p - ic) / vec2(0.5, 0.66);
    float ir = length(q);
    float iaa = fwidth(ir) * 1.5;
    float iris = 1.0 - smoothstep(1.0 - iaa, 1.0 + iaa, ir);
    float gy = clamp((q.y + 1.0) * 0.5, 0.0, 1.0);
    vec3 irc = mix(uIrisB * 1.35, uIrisA * 0.35, smoothstep(0.05, 0.85, gy));
    float ang = atan(q.y, q.x);
    irc *= 0.82 + 0.18 * sin(ang * 36.0 + ir * 7.0 + uTime * 0.6);
    irc += uIrisB * 0.55 * band(ir, 0.52, 0.72, 0.05) * smoothstep(0.7, 0.2, gy);
    irc = mix(irc, uIrisA * 0.18, smoothstep(0.84, 0.98, ir));
    // circuit mode: traces and nodes light up across the iris
    if (uCircuit > 0.001) {
      float ringL = band(fract(ir * 5.0), 0.46, 0.54, 0.03) * step(0.5, h21(vec2(floor(ir * 5.0), floor(ang * 3.0 + 3.0))));
      float spoke = band(fract(ang * 12.0 / 6.28318 + 0.5), 0.47, 0.53, 0.02) * step(0.25, ir) * step(0.55, h21(vec2(floor(ang * 12.0 / 6.28318 + 0.5), 7.0)));
      float node = 1.0 - smoothstep(0.03, 0.06, length(vec2(fract(ir * 5.0) - 0.5, (fract(ang * 12.0 / 6.28318 + 0.5) - 0.5) * 0.6)));
      float pulse = 0.6 + 0.4 * sin(uTime * 8.0 - ir * 12.0);
      irc = mix(irc, irc * 0.5 + vec3(0.25, 0.95, 1.0) * 1.8 * pulse, clamp(ringL + spoke + node, 0.0, 1.0) * uCircuit);
    }
    // pupil
    float pr = length((p - ic - vec2(0.0, 0.04)) / (vec2(0.19, 0.28) * (1.0 + uDilate)));
    irc = mix(irc, uIrisA * 0.06, 1.0 - smoothstep(0.9, 1.1, pr));
    col = mix(col, irc * uGlow, iris);
    // the lid's shadow falls across the top of the iris
    col *= 1.0 - 0.5 * smoothstep(yt - 0.28, yt, p.y);

    // catchlights and sparkles
    float hl = 1.0 - smoothstep(0.9, 1.05, length((p - ic - vec2(-0.2, 0.26)) / vec2(0.15, 0.2)));
    hl += 1.0 - smoothstep(0.85, 1.1, length((p - ic - vec2(0.22, -0.32)) / vec2(0.075, 0.075)));
    float tw = 0.5 + 0.5 * sin(uTime * 7.0);
    hl += star(p - ic - vec2(0.18, 0.18), 0.09 * (0.6 + tw * 0.6 + uSpark)) * (0.6 + uSpark);
    hl += star(p - ic - vec2(-0.26, -0.22), 0.06 * (0.6 + (1.0 - tw) * 0.6 + uSpark)) * (0.5 + uSpark);
    hl += star(p - ic - vec2(0.02, -0.42), 0.05 * (0.4 + uSpark * 1.5)) * uSpark;
    col = mix(col, vec3(1.0), clamp(hl, 0.0, 1.0) * iris);

    // lash line: thicker toward the outer corner, with flicks
    float th = 0.05 + 0.15 * smoothstep(0.0, 0.95, p.x);
    float lx = smoothstep(-1.0, -0.9, p.x) * (1.0 - smoothstep(1.08, 1.12, p.x));
    float lash = band(p.y, yt - 0.01, yt + th, aa) * lx;
    for (int i = 0; i < 3; i++) {
      float fx = 0.78 + float(i) * 0.1;
      float base = mix(topC(fx), botC(fx) + 0.02, uBlink) + 0.05;
      vec2 d = p - vec2(fx, base);
      float along = clamp(d.x * 0.6 + d.y, 0.0, 0.26 - float(i) * 0.05);
      float w = 0.035 * (1.0 - along / 0.26);
      lash = max(lash, (1.0 - smoothstep(w, w + aa, abs(d.x * 0.8 - d.y * 0.6 + along * 0.1 - along * 0.55))) * step(0.0, d.y) * step(d.y, 0.28 - float(i) * 0.06));
    }
    float lower = band(p.y, yb - 0.03, yb + 0.005, aa) * smoothstep(-0.2, 0.3, p.x) * (1.0 - smoothstep(0.85, 0.95, p.x)) * (1.0 - uBlink);
    float crease = band(p.y, yt0 + 0.2, yt0 + 0.235, aa) * smoothstep(-0.55, -0.2, p.x) * (1.0 - smoothstep(0.7, 0.9, p.x)) * 0.55;

    vec4 outC = vec4(col, inside);
    outC.rgb = mix(outC.rgb, uLash, clamp(lash + lower * 0.8, 0.0, 1.0));
    outC.a = max(outC.a, clamp(lash + lower * 0.8, 0.0, 1.0));
    outC.rgb = mix(outC.rgb, vec3(0.78, 0.5, 0.55), crease * (1.0 - outC.a));
    outC.a = max(outC.a, crease);
    gl_FragColor = outC;
    #include <colorspace_fragment>
  }`;

export type AnimeEye = ReturnType<typeof animeEye>;

/** One anime eye drawn in a shader on a plane. `mirror` flips it for the left side. */
export function animeEye(name: string, size: number, irisA: string, irisB: string, mirror = false) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uBlink: { value: 0 },
      uTime: { value: 0 },
      uSpark: { value: 0 },
      uCircuit: { value: 0 },
      uGlow: { value: 1 },
      uDilate: { value: 0 },
      uLook: { value: new THREE.Vector2() },
      uIrisA: { value: new THREE.Color(irisA) },
      uIrisB: { value: new THREE.Color(irisB) },
      uLash: { value: new THREE.Color("#2a1236") },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: EYE_FRAG,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.name = name;
  if (mirror) mesh.scale.x = -1;
  return { mesh, mat, mirror };
}

/* ------------------------------------------------------------------ face */

const FACE_FRAG = /* glsl */ `
  uniform float uBlush, uTime, uDim;
  uniform vec2 uEyeL, uEyeR;
  varying vec2 vP;
  float band(float v, float a, float b, float aa) { return smoothstep(a - aa, a + aa, v) * (1.0 - smoothstep(b - aa, b + aa, v)); }
  void main() {
    vec2 p = vP;
    vec3 skin = vec3(1.0, 0.925, 0.905);
    // soft shading toward the cheeks' edges and a cool shadow cast by the bangs
    skin *= 1.0 - 0.06 * smoothstep(5.0, 10.0, abs(p.x));
    float hairShadow = smoothstep(1.9 + sin(p.x * 1.7) * 0.35 + sin(p.x * 4.3) * 0.12, 2.6, p.y);
    skin = mix(skin, vec3(0.86, 0.76, 0.86), hairShadow * 0.75);
    // blush: pink ovals with anime hatching
    for (int s = 0; s < 2; s++) {
      vec2 c = s == 0 ? vec2(uEyeL.x - 0.3, -2.25) : vec2(uEyeR.x + 0.3, -2.25);
      float e = length((p - c) / vec2(1.7, 0.75));
      float blush = (1.0 - smoothstep(0.4, 1.0, e)) * uBlush;
      skin = mix(skin, vec3(1.0, 0.62, 0.72), blush * 0.55);
      float hatch = band(fract((p.x + p.y * 0.55) * 2.6), 0.42, 0.52, 0.05) * (1.0 - smoothstep(0.2, 0.7, e));
      skin = mix(skin, vec3(0.98, 0.45, 0.6), hatch * uBlush * 0.8);
    }
    // a tiny nose hint
    float nose = 1.0 - smoothstep(0.03, 0.07, length((p - vec2(0.15, -2.55)) / vec2(1.0, 1.6)));
    skin = mix(skin, vec3(0.86, 0.66, 0.66), nose * 0.8);
    skin = mix(skin, skin * vec3(0.3, 0.26, 0.42), uDim);
    gl_FragColor = vec4(skin, 1.0);
    #include <colorspace_fragment>
  }`;

/** A hair strand: a curved blade from the scalp to a point. */
function strandShape(w: number, len: number, bend: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.bezierCurveTo(-w / 2 + bend * 0.2, -len * 0.45, bend * 0.6 - w * 0.12, -len * 0.8, bend, -len);
  s.bezierCurveTo(bend * 0.6 + w * 0.2, -len * 0.75, w / 2 + bend * 0.25, -len * 0.4, w / 2, 0);
  s.lineTo(-w / 2, 0);
  return s;
}

/**
 * An anime face in close-up: skin, two shader eyes, brows and layered bangs.
 * About 20 × 12 world units, eyes at y≈0.3, x≈±3.2. Faces +z.
 */
/** The face wraps around the head: a gentle ellipsoidal bow. */
const curveZ = (x: number, y: number) => -0.036 * x * x - 0.02 * (y - 0.2) * (y - 0.2);

export function createAnimeFace(name = "anime-face") {
  const group = new THREE.Group();
  group.name = name;
  const EYE_X = 3.25;
  const EYE_Y = 0.2;

  const faceMat = new THREE.ShaderMaterial({
    uniforms: { uBlush: { value: 1 }, uTime: { value: 0 }, uDim: { value: 0 }, uEyeL: { value: new THREE.Vector2(-EYE_X, EYE_Y) }, uEyeR: { value: new THREE.Vector2(EYE_X, EYE_Y) } },
    vertexShader: /* glsl */ `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: FACE_FRAG,
  });
  const faceGeo = new THREE.PlaneGeometry(24, 16, 64, 24);
  const fp = faceGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < fp.count; i++) fp.setZ(i, curveZ(fp.getX(i), fp.getY(i)));
  faceGeo.computeVertexNormals();
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.name = `${name}-skin`;
  group.add(face);

  const left = animeEye(`${name}-eye-left`, 4.1, "#3a1470", C.pink, true);
  const right = animeEye(`${name}-eye-right`, 4.1, "#0d2a5a", C.cyan);
  left.mesh.position.set(-EYE_X, EYE_Y, curveZ(EYE_X, EYE_Y) + 0.06);
  right.mesh.position.set(EYE_X, EYE_Y, curveZ(EYE_X, EYE_Y) + 0.06);
  // turn each eye with the curve of the face
  left.mesh.rotation.y = Math.atan(-2 * 0.036 * EYE_X);
  right.mesh.rotation.y = -Math.atan(-2 * 0.036 * EYE_X);
  group.add(left.mesh, right.mesh);

  // brows: thin arcs, partly under the fringe
  const browMat = new THREE.MeshBasicMaterial({ color: "#8f76c9" });
  const brow = (side: number) => {
    const s = new THREE.Shape();
    s.moveTo(-1.2, 0);
    s.quadraticCurveTo(0, 0.32, 1.25, 0.05);
    s.quadraticCurveTo(0, 0.2, -1.2, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s, 16), browMat);
    m.name = side < 0 ? `${name}-brow-left` : `${name}-brow-right`;
    m.position.set(side * EYE_X, EYE_Y + 2.15, curveZ(EYE_X, EYE_Y + 2.15) + 0.05);
    m.rotation.y = side * -Math.atan(-2 * 0.036 * EYE_X);
    m.scale.x = side;
    group.add(m);
    return m;
  };
  const browL = brow(-1);
  const browR = brow(1);

  // bangs: outlined strands in three depth layers, each swaying from its root
  const r = rng(3);
  const hairTop = new THREE.Color("#f1ecff");
  const hairTip = new THREE.Color("#b6a3ee");
  const outlineMat = new THREE.MeshBasicMaterial({ color: "#5b4596" });
  const hairMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const strands: { pivot: THREE.Group; ph: number; amp: number }[] = [];
  const hair = new THREE.Group();
  hair.name = `${name}-bangs`;
  group.add(hair);
  const layers = [
    { z: 0.55, n: 11, lenMin: 3.2, lenMax: 4.6, wMin: 1.6, wMax: 2.4 },
    { z: 1.05, n: 9, lenMin: 2.4, lenMax: 3.8, wMin: 1.4, wMax: 2.1 },
    { z: 1.7, n: 5, lenMin: 3.6, lenMax: 5.2, wMin: 0.9, wMax: 1.3 },
  ];
  let idx = 0;
  layers.forEach((L, li) => {
    for (let i = 0; i < L.n; i++) {
      const x = -11 + (i + 0.5 + (r() - 0.5) * 0.4) * (22 / L.n);
      // keep the fringe clear of the eyes except for a few wisps
      const overEye = Math.abs(Math.abs(x) - EYE_X) < 1.6 && li < 2;
      const len = (L.lenMin + r() * (L.lenMax - L.lenMin)) * (overEye ? 0.62 : 1);
      const w = L.wMin + r() * (L.wMax - L.wMin);
      const bend = (x < 0 ? 1 : -1) * (0.2 + r() * 0.7) * (li === 2 ? 1.6 : 1);
      const geo = new THREE.ShapeGeometry(strandShape(w, len, bend), 12);
      // vertex-colour gradient from root to tip, with an anime shine band
      const pos = geo.attributes.position;
      const cols = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let v = 0; v < pos.count; v++) {
        const k = THREE.MathUtils.clamp(-pos.getY(v) / len, 0, 1);
        c.copy(hairTop).lerp(hairTip, k);
        const shine = Math.exp(-Math.pow((k - 0.28) / 0.07, 2)) * 0.5;
        c.lerp(new THREE.Color("#ffffff"), shine);
        cols.set([c.r, c.g, c.b], v * 3);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
      const pivot = new THREE.Group();
      pivot.position.set(x, 6.3 + r() * 0.6, L.z + curveZ(x, 4));
      const m = new THREE.Mesh(geo, hairMat);
      m.name = `${name}-hair-${idx}`;
      const outline = new THREE.Mesh(geo, outlineMat);
      outline.scale.set(1.07, 1.03, 1);
      outline.position.z = -0.02;
      outline.name = `${name}-hair-${idx}-line`;
      pivot.add(outline, m);
      hair.add(pivot);
      strands.push({ pivot, ph: r() * 6, amp: 0.02 + r() * 0.03 });
      idx++;
    }
  });
  // a solid hairline behind the strands so no skin peeks at the top
  const capMat = new THREE.MeshBasicMaterial({ color: "#e9e2ff" });
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(26, 4), capMat);
  cap.position.set(0, 8, 0.2);
  cap.name = `${name}-hair-mass`;
  hair.add(cap);

  const eyes = [left, right];
  /**
   * blink 0..1 (both, or per eye), look in eye-space (-0.3..0.3), spark 0..1,
   * circuit 0..1 on the right eye, dilate 0..1, sway amount.
   */
  const update = (t: number, s: { blinkL: number; blinkR: number; look: THREE.Vector2; spark?: number; circuit?: number; dilate?: number; glow?: number; sway?: number; blush?: number; dim?: number }) => {
    const dim = s.dim ?? 0;
    faceMat.uniforms.uDim.value = dim;
    hairMat.color.setScalar(1 - 0.62 * dim);
    capMat.color.set("#e9e2ff").multiplyScalar(1 - 0.62 * dim);
    browMat.color.set("#8f76c9").multiplyScalar(1 - 0.5 * dim);
    faceMat.uniforms.uTime.value = t;
    faceMat.uniforms.uBlush.value = s.blush ?? 1;
    eyes.forEach((e, i) => {
      const u = e.mat.uniforms;
      u.uTime.value = t;
      u.uBlink.value = THREE.MathUtils.clamp(i === 0 ? s.blinkL : s.blinkR, 0, 1);
      // the left eye is mirrored, so its look.x is flipped back
      u.uLook.value.set(e.mirror ? -s.look.x : s.look.x, s.look.y);
      u.uSpark.value = s.spark ?? 0;
      u.uCircuit.value = i === 1 ? s.circuit ?? 0 : 0;
      u.uDilate.value = s.dilate ?? 0;
      u.uGlow.value = s.glow ?? 1;
    });
    // brows lift a touch when the eyes open wide, drop when they blink
    const lift = -Math.max(s.blinkL, s.blinkR) * 0.18;
    browL.position.y = EYE_Y + 2.15 + lift;
    browR.position.y = EYE_Y + 2.15 + lift;
    const sway = s.sway ?? 1;
    strands.forEach((st) => (st.pivot.rotation.z = Math.sin(t * 1.3 + st.ph) * st.amp * sway));
  };
  update(0, { blinkL: 0, blinkR: 0, look: new THREE.Vector2() });
  return { group, update, eyeL: left, eyeR: right, EYE_X, EYE_Y };
}
