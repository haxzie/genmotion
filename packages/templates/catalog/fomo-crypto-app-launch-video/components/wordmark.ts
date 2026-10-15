/**
 * The real fomo wordmark (fomo.family's SVG, viewBox 0 0 75 24), rasterised
 * once at high resolution into a canvas texture and shown on a plane with the
 * same blur/opacity shader the type uses.
 *
 * Plane is in "units" of the SVG; scale the mesh by px-per-unit. The mesh
 * origin is the wordmark's CENTRE.
 */
import * as THREE from "three";

export const WORDMARK_W = 74.8233;
export const WORDMARK_H = 24;

const PATHS = [
  "M0.000730533 4.96351C0.000730533 1.80193 1.70048 0 5.3036 0H8.96C9.08115 0 9.17895 0.0977959 9.17895 0.218946V3.92862C9.17895 4.04977 9.08115 4.14757 8.96 4.14757H6.11954C5.20143 4.14757 4.79346 4.55554 4.79346 5.43935V6.10421C4.79346 6.22536 4.89125 6.32316 5.0124 6.32316H8.74106C8.86221 6.32316 8.96 6.42096 8.96 6.54211V10.2175C8.96 10.3386 8.86221 10.4364 8.74106 10.4364H5.0124C4.89125 10.4364 4.79346 10.5342 4.79346 10.6554V23.5776C4.79346 23.6987 4.69566 23.7965 4.57451 23.7965H0.218946C0.0977959 23.7965 0 23.6987 0 23.5776V4.96351H0.000730533Z",
  "M8.80603 15.0597C8.80603 9.6882 12.4778 6.11938 18.0185 6.11938C23.5593 6.11938 27.2311 9.68893 27.2311 15.0597C27.2311 20.4304 23.5593 24 18.0185 24C12.4778 24 8.80603 20.4304 8.80603 15.0597ZM22.3354 15.0597C22.3354 12.1703 20.7036 10.1305 18.0178 10.1305C15.3321 10.1305 13.7009 12.1703 13.7009 15.0597C13.7009 17.949 15.3328 19.9889 18.0178 19.9889C20.7028 19.9889 22.3354 17.949 22.3354 15.0597Z",
  "M55.4065 14.0401V23.5774C55.4065 23.6986 55.3087 23.7964 55.1875 23.7964H50.8319C50.7108 23.7964 50.613 23.6986 50.613 23.5774V14.0058C50.613 11.4901 49.6613 10.1648 47.6215 10.1648C45.5816 10.1648 44.1541 11.6602 44.222 14.3459V23.5774C44.222 23.6986 44.1242 23.7964 44.003 23.7964H39.6475C39.5263 23.7964 39.4285 23.6986 39.4285 23.5774V14.0058C39.4285 11.4901 38.4768 10.1648 36.4027 10.1648C34.3285 10.1648 33.0375 11.7288 33.0375 14.1759V23.5774C33.0375 23.6986 32.9397 23.7964 32.8185 23.7964H28.463C28.3418 23.7964 28.244 23.6986 28.244 23.5774V6.54268C28.244 6.42153 28.3418 6.32373 28.463 6.32373H32.2544C32.3551 6.32373 32.4427 6.39234 32.4668 6.4894L32.7901 7.7841C32.8236 7.91839 32.99 7.96875 33.0908 7.87387C34.087 6.94043 35.4262 6.11938 37.7616 6.11938C39.7854 6.11938 41.6837 6.7463 42.8251 8.57231C42.893 8.68032 43.0455 8.68981 43.1243 8.5891C44.3278 7.05137 46.245 6.11938 48.8775 6.11938C52.277 6.11938 55.4043 7.88701 55.4043 14.0401H55.4065Z",
  "M56.3983 15.0597C56.3983 9.6882 60.07 6.11938 65.6108 6.11938C71.1516 6.11938 74.8233 9.68893 74.8233 15.0597C74.8233 20.4304 71.1516 24 65.6108 24C60.07 24 56.3983 20.4304 56.3983 15.0597ZM69.9277 15.0597C69.9277 12.1703 68.2958 10.1305 65.6101 10.1305C62.9244 10.1305 61.2932 12.1703 61.2932 15.0597C61.2932 17.949 62.9251 19.9889 65.6101 19.9889C68.2951 19.9889 69.9277 17.949 69.9277 15.0597Z",
];

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uBlur;     // in texture px
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    float a = 0.0;
    if (uBlur < 0.05) a = texture2D(map, vUv).a;
    else {
      float tw = 0.0;
      vec2 st = uTexel * uBlur / 2.5;
      for (int i = -4; i <= 4; i++) for (int j = -4; j <= 4; j++) {
        float w = exp(-float(i * i + j * j) / 8.0);
        a += texture2D(map, vUv + vec2(float(i), float(j)) * st).a * w;
        tw += w;
      }
      a /= tw;
    }
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

const RES = 16; // canvas px per SVG unit
const PAD = 6; // units of blur room around the mark

export type Wordmark = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

export function wordmark(color = "#ffffff", name = "fomo-wordmark"): Wordmark {
  const w = WORDMARK_W + PAD * 2;
  const h = WORDMARK_H + PAD * 2;
  const canvas = new OffscreenCanvas(Math.ceil(w * RES), Math.ceil(h * RES));
  const g = canvas.getContext("2d")!;
  g.scale(RES, RES);
  g.translate(PAD, PAD);
  g.fillStyle = "#ffffff";
  for (const d of PATHS) g.fill(new Path2D(d));
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      map: { value: tex },
      uColor: { value: new THREE.Color().setStyle(color, THREE.NoColorSpace) },
      uOpacity: { value: 1 },
      uBlur: { value: 0 },
      uTexel: { value: new THREE.Vector2(1 / canvas.width, 1 / canvas.height) },
    },
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.name = name;
  m.renderOrder = 100;
  return m;
}

/** blur in composition px, given the mark's current px-per-unit scale */
export function setWordmark(m: Wordmark, look: { opacity?: number; blurPx?: number; pxPerUnit?: number }) {
  const u = m.material.uniforms;
  if (look.opacity !== undefined) u.uOpacity.value = look.opacity;
  if (look.blurPx !== undefined) u.uBlur.value = (look.blurPx / (look.pxPerUnit ?? 1)) * RES;
  m.visible = (u.uOpacity.value as number) > 0.001;
}
