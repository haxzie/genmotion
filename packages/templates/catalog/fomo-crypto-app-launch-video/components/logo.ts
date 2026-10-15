/**
 * The fomo coin: a blue disc with a white wall, two white eyes with slanted
 * ink pupils on its face, and a magnifier handle that slides out from behind
 * it. Built in a unit radius (R = 1); scale the group to the measured radius
 * in px.
 *
 * The face is one shader so the eyes can blink and look around per frame
 * without redrawing a texture: `pose(coin, { blink, lookX, lookY })`.
 */
import * as THREE from "three";
import { C } from "./brand";

const FACE_VERT = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FACE_FRAG = /* glsl */ `
  uniform vec3 uBlue;
  uniform vec3 uWhite;
  uniform vec3 uInk;
  uniform float uBlink;    // 0 open → 1 pupils a thin line
  uniform vec2 uLook;      // pupil offset in R
  uniform float uSkew;     // pupil lean (x per y; negative leans "/")
  uniform float uOpacity;
  uniform float uEyes;     // 0 hides the eyes (plain back of a coin)
  varying vec2 vP;

  float aa(float d) { return clamp(0.5 - d / fwidth(d), 0.0, 1.0); }

  // signed distance-ish to an ellipse (good enough for AA at this size)
  float ell(vec2 p, vec2 c, vec2 r) {
    vec2 q = (p - c) / r;
    return (length(q) - 1.0) * min(r.x, r.y);
  }

  float pupil(vec2 p, vec2 eye, vec2 er) {
    float hh = 0.205 * mix(1.0, 0.09, uBlink);
    vec2 pc = eye + vec2(0.165, -0.02 * uBlink) + uLook;
    vec2 q = p - pc;
    q.x += uSkew * q.y;
    float d = max(abs(q.x) - 0.17, abs(q.y) - hh);
    float inEye = ell(p, eye, er);
    return max(d, inEye);
  }

  void main() {
    vec3 col = uBlue;
    if (uEyes > 0.5) {
      vec2 el = vec2(-0.335, 0.0);
      vec2 er = vec2(0.335, 0.0);
      vec2 rr = vec2(0.395, 0.43);
      float w = min(ell(vP, el, rr), ell(vP, er, rr));
      col = mix(col, uWhite, aa(w));
      float pd = min(pupil(vP, el, rr), pupil(vP, er, rr));
      col = mix(col, uInk, aa(pd));
    }
    float edge = aa(length(vP) - 1.0);
    gl_FragColor = vec4(col, uOpacity * edge);
  }
`;

export interface Coin extends THREE.Group {
  userData: {
    face: THREE.ShaderMaterial;
    handle: THREE.Object3D;
    handleSlide: THREE.Object3D;
    mats: THREE.Material[];
  };
}

const raw = (hex: string) => new THREE.Color().setStyle(hex, THREE.NoColorSpace);

/** thickness as a fraction of R */
export function coin(thickness = 0.3, name = "fomo-coin"): Coin {
  const g = new THREE.Group() as Coin;
  g.name = name;

  const faceMat = new THREE.ShaderMaterial({
    vertexShader: FACE_VERT,
    fragmentShader: FACE_FRAG,
    transparent: true,
    uniforms: {
      uBlue: { value: raw(C.blue) },
      uWhite: { value: raw(C.white) },
      uInk: { value: raw(C.ink) },
      uBlink: { value: 0 },
      uLook: { value: new THREE.Vector2(0, 0) },
      uSkew: { value: -0.25 },
      uOpacity: { value: 1 },
      uEyes: { value: 1 },
    },
  });
  const backMat = faceMat.clone();
  backMat.uniforms.uEyes.value = 0;

  const front = new THREE.Mesh(new THREE.CircleGeometry(1.01, 96), faceMat);
  front.position.z = thickness / 2;
  front.name = `${name}-face`;
  const back = new THREE.Mesh(new THREE.CircleGeometry(1.01, 96), backMat);
  back.rotation.y = Math.PI;
  back.position.z = -thickness / 2;
  back.name = `${name}-back`;

  const wallMat = new THREE.MeshBasicMaterial({ color: C.rim, transparent: true });
  const wallGeo = new THREE.CylinderGeometry(1, 1, thickness, 96, 1, true);
  wallGeo.rotateX(Math.PI / 2);
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.name = `${name}-wall`;

  // magnifier handle: a rounded bar at −45°, sliding out from behind the disc
  const handle = new THREE.Group();
  handle.rotation.z = -Math.PI / 4;
  const slide = new THREE.Group();
  const hw = 0.27;
  const hl = 0.95;
  const shape = new THREE.Shape();
  const r = hw / 2;
  shape.moveTo(0, -r);
  shape.lineTo(hl - r, -r);
  shape.absarc(hl - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(0, r);
  shape.lineTo(0, -r);
  const hGeo = new THREE.ExtrudeGeometry(shape, { depth: thickness * 0.8, bevelEnabled: false, curveSegments: 16 });
  hGeo.translate(0, 0, -thickness * 0.4);
  const handleMat = new THREE.MeshBasicMaterial({ color: "#f4f5fe", transparent: true });
  const bar = new THREE.Mesh(hGeo, handleMat);
  bar.position.x = 0.62; // the bar's inner end sits under the disc
  bar.name = `${name}-handle`;
  slide.add(bar);
  handle.add(slide);

  g.add(handle, wall, back, front);
  g.userData.face = faceMat;
  g.userData.handle = handle;
  g.userData.handleSlide = slide;
  g.userData.mats = [faceMat, backMat, wallMat, handleMat];
  return g;
}

export interface CoinPose {
  blink?: number;
  lookX?: number;
  lookY?: number;
  skew?: number;
  /** 0 = handle hidden behind the disc, 1 = fully out */
  handle?: number;
  opacity?: number;
}

export function pose(c: Coin, p: CoinPose) {
  const u = c.userData.face.uniforms;
  if (p.blink !== undefined) u.uBlink.value = p.blink;
  if (p.lookX !== undefined) (u.uLook.value as THREE.Vector2).x = p.lookX;
  if (p.lookY !== undefined) (u.uLook.value as THREE.Vector2).y = p.lookY;
  if (p.skew !== undefined) u.uSkew.value = p.skew;
  if (p.handle !== undefined) {
    c.userData.handleSlide.position.x = -0.62 * (1 - p.handle);
    c.userData.handle.visible = p.handle > 0.001;
  }
  if (p.opacity !== undefined) {
    for (const m of c.userData.mats) {
      if ((m as THREE.ShaderMaterial).uniforms?.uOpacity) (m as THREE.ShaderMaterial).uniforms.uOpacity.value = p.opacity;
      else m.opacity = p.opacity;
    }
  }
}

/** Recolour a coin's parts (eye whites, wall) for scenes graded differently. */
export function tint(c: Coin, colors: { eyes?: string; wall?: string; face?: string }) {
  const u = c.userData.face.uniforms;
  if (colors.eyes) (u.uWhite.value as THREE.Color).setStyle(colors.eyes, THREE.NoColorSpace);
  if (colors.face) (u.uBlue.value as THREE.Color).setStyle(colors.face, THREE.NoColorSpace);
  if (colors.wall) (c.userData.mats[2] as THREE.MeshBasicMaterial).color.setStyle(colors.wall);
}

/**
 * Orient a coin from what the reference shows on screen (orthographic):
 *  - major: angle of the face ellipse's long axis (deg, screen y-down)
 *  - tilt: θ, the face's turn away from camera (0 = face-on, 90 = edge, 180 = back)
 *  - eyes: screen angle of the line through the eyes (deg, y-down)
 * `axis` is a parent group of `c`; `sign` picks which side the wall shows on.
 */
export function orient(axis: THREE.Object3D, c: THREE.Object3D, major: number, tilt: number, eyes: number, sign = 1) {
  const D = Math.PI / 180;
  axis.rotation.set(0, 0, -major * D);
  const psi = (eyes - major) * D;
  const ct = Math.cos(tilt * D);
  const phi = Math.atan2(-Math.sin(psi), Math.cos(psi) * (Math.abs(ct) < 0.02 ? 0.02 * Math.sign(ct || 1) : ct));
  c.rotation.order = "XYZ";
  c.rotation.set(sign * tilt * D, 0, phi);
}
