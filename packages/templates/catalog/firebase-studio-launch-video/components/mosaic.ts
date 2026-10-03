import * as THREE from "three";
import { W, H } from "./stage";
import { MOSAIC_RAMP } from "./mosaicData";

/**
 * The pixel-mosaic ground of the LoRA / Dedicated beats: a grid of flat cells
 * whose shade is a smooth darkness field sampled at each cell's centre, so the
 * frame reads as a pixelated gradient from near-black to brand purple. The
 * field is a cubic in screen space (coefficients fitted per reference frame),
 * mapped through the measured dark-to-purple ramp. One accent cell and one
 * "lit" cell (the white square that eats the frame) are drawn on top.
 */
const N = MOSAIC_RAMP.length;
const FRAG = /* glsl */ `
uniform vec2 uCell;
uniform vec2 uOff;
uniform float uC[10];
uniform vec3 uAccent[3];    // xy = cell centre (screen px), z = on
uniform vec3 uAccentCol[3];
uniform vec4 uWhite;     // x, y (top-left, screen px), w, h  (w = 0: none)
uniform float uOpacity;
varying vec2 vUv;
float rampR[${N}];
float rampG[${N}];
float rampB[${N}];
void initRamp() {
${MOSAIC_RAMP.map((r, i) => `  rampB[${i}] = ${r[0]!.toFixed(1)}; rampR[${i}] = ${r[1]!.toFixed(1)}; rampG[${i}] = ${r[2]!.toFixed(1)};`).join("\n")}
}
vec3 shadePurple(float b);
// Firebase re-ramp: the fitted field (blue 20..247) runs ember-black -> deep red -> flame red #DD2C00
vec3 shade(float b) {
  float t = clamp((b - 20.0) / 227.0, 0.0, 1.0);
  vec3 c0 = vec3(16.0, 3.0, 1.0) / 255.0;
  vec3 c1 = vec3(96.0, 14.0, 2.0) / 255.0;
  vec3 c2 = vec3(221.0, 44.0, 0.0) / 255.0;
  return t < 0.5 ? mix(c0, c1, t / 0.5) : mix(c1, c2, (t - 0.5) / 0.5);
}
vec3 shadePurple(float b) {
  b = clamp(b, rampB[0], rampB[${N - 1}]);
  for (int i = 1; i < ${N}; i++) {
    if (b <= rampB[i]) {
      float t = (b - rampB[i - 1]) / (rampB[i] - rampB[i - 1]);
      return vec3(mix(rampR[i - 1], rampR[i], t), mix(rampG[i - 1], rampG[i], t), b) / 255.0;
    }
  }
  return vec3(rampR[${N - 1}], rampG[${N - 1}], rampB[${N - 1}]) / 255.0;
}
void main() {
  initRamp();
  vec2 p = vec2(vUv.x * ${W.toFixed(1)}, (1.0 - vUv.y) * ${H.toFixed(1)});
  vec2 cell = floor((p - uOff) / uCell);
  vec2 c = uOff + (cell + 0.5) * uCell;
  float u = c.x / 1000.0, v = c.y / 1000.0;
  float b = uC[0] + uC[1] * u + uC[2] * v + uC[3] * u * u + uC[4] * v * v + uC[5] * u * v
          + uC[6] * u * u * u + uC[7] * v * v * v + uC[8] * u * u * v + uC[9] * u * v * v;
  vec3 col = shade(clamp(b, 20.0, 247.0));
  for (int i = 0; i < 3; i++) {
    if (uAccent[i].z > 0.5 && all(lessThan(abs(c - uAccent[i].xy), uCell * 0.5))) col = uAccentCol[i];
  }
  if (uWhite.z > 0.0 && p.x >= uWhite.x && p.x < uWhite.x + uWhite.z && p.y >= uWhite.y && p.y < uWhite.y + uWhite.w) col = vec3(1.0);
  gl_FragColor = vec4(col, uOpacity);
}`;

export function mosaicLayer(name = "pixel-mosaic") {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uCell: { value: new THREE.Vector2(113, 108) },
      uOff: { value: new THREE.Vector2(0, 0) },
      uC: { value: new Array(10).fill(0) },
      uAccent: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
      uAccentCol: { value: [new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, 1, 1)] },
      uWhite: { value: new THREE.Vector4(0, 0, 0, 0) },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
  mesh.name = name;
  mesh.userData.pickable = false;
  mesh.renderOrder = -5;
  return { mesh, u: mat.uniforms };
}
