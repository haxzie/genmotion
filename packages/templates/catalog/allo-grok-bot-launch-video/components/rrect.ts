import * as THREE from "three";

/**
 * A rounded rectangle drawn by an SDF shader, so its width, height and corner
 * radii can be animated every frame without rebuilding geometry. Pills,
 * circles, chat bubbles, the phone and its Dynamic Island are all this.
 * Corners are [topLeft, topRight, bottomRight, bottomLeft]. `blur` > 0 turns
 * it into a soft shadow. Size is in stage units; origin is the centre.
 */
const PLANE = new THREE.PlaneGeometry(1, 1);

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const frag = /* glsl */ `
uniform vec2 uSize;
uniform vec2 uPlane;
uniform vec4 uR;       // tr, br, tl, bl
uniform vec3 uColor;
uniform vec3 uColor2;  // vertical gradient bottom colour
uniform float uOpacity;
uniform float uBlur;
varying vec2 vUv;
float sdRoundBox(vec2 p, vec2 b, vec4 r) {
  r.xy = (p.x > 0.0) ? r.xy : r.zw;
  r.x = (p.y > 0.0) ? r.x : r.y;
  vec2 q = abs(p) - b + r.x;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}
void main() {
  vec2 p = (vUv - 0.5) * uPlane;
  float d = sdRoundBox(p, uSize * 0.5, uR);
  float a;
  if (uBlur > 0.0) {
    a = 1.0 - smoothstep(-uBlur, uBlur, d);
  } else {
    float aa = max(fwidth(d), 1e-4);
    a = clamp(0.5 - d / aa, 0.0, 1.0);
  }
  vec3 col = mix(uColor2, uColor, vUv.y);
  gl_FragColor = vec4(col, a * uOpacity);
  #include <colorspace_fragment>
}`;

export type Corners = number | [number, number, number, number];

export class RRect extends THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  w = 0;
  h = 0;
  constructor(color: string, w: number, h: number, r: Corners = 0, opts: { blur?: number; opacity?: number; color2?: string } = {}) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uSize: { value: new THREE.Vector2() },
        uPlane: { value: new THREE.Vector2() },
        uR: { value: new THREE.Vector4() },
        uColor: { value: new THREE.Color(color) },
        uColor2: { value: new THREE.Color(opts.color2 ?? color) },
        uOpacity: { value: opts.opacity ?? 1 },
        uBlur: { value: opts.blur ?? 0 },
      },
    });
    super(PLANE, mat);
    this.set(w, h, r);
  }

  /** Resize (and optionally re-round). Radii are clamped to fit. */
  set(w: number, h: number, r?: Corners): this {
    this.w = w;
    this.h = h;
    const u = this.material.uniforms;
    const pad = (u.uBlur!.value as number) * 2 + 2;
    const pw = Math.max(w, 0.0001) + pad;
    const ph = Math.max(h, 0.0001) + pad;
    (u.uSize!.value as THREE.Vector2).set(w, h);
    (u.uPlane!.value as THREE.Vector2).set(pw, ph);
    this.scale.set(pw, ph, 1);
    if (r !== undefined) {
      const m = Math.min(w, h) / 2;
      const [tl, tr, br, bl] = typeof r === "number" ? [r, r, r, r] : r;
      (u.uR!.value as THREE.Vector4).set(Math.min(tr, m), Math.min(br, m), Math.min(tl, m), Math.min(bl, m));
    } else {
      const v = u.uR!.value as THREE.Vector4;
      const m = Math.min(w, h) / 2;
      v.set(Math.min(v.x, m), Math.min(v.y, m), Math.min(v.z, m), Math.min(v.w, m));
    }
    return this;
  }

  /** A full pill/circle: radius is always half the shorter side. */
  pill(w: number, h: number): this {
    return this.set(w, h, 9999);
  }

  get opacity(): number {
    return this.material.uniforms.uOpacity!.value as number;
  }
  set opacity(v: number) {
    this.material.uniforms.uOpacity!.value = v;
    this.visible = v > 0.001 && this.w > 0.01 && this.h > 0.01;
  }
}
