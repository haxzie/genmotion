import * as THREE from "three";

/**
 * A resizable rounded rectangle drawn with an SDF, so pills, cards and tiles
 * can change width/height per frame without stretching their corners.
 * Colours are display (sRGB) hex; fill and stroke each have their own alpha.
 */
const VERT = /* glsl */ `
uniform vec2 uSize;
varying vec2 vP;
void main() {
  vP = (uv - 0.5) * (uSize + 4.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); // mesh.scale = size + 4
}`;
const FRAG = /* glsl */ `
uniform vec2 uSize;
uniform float uRadius;
uniform vec3 uFill;
uniform float uFillA;
uniform vec3 uStroke;
uniform float uStrokeA;
uniform float uStrokeW;
uniform float uOpacity;
varying vec2 vP;
float sdRound(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  float r = min(uRadius, min(uSize.x, uSize.y) * 0.5);
  float d = sdRound(vP, uSize * 0.5, r);
  float aa = 0.75;
  float inside = 1.0 - smoothstep(-aa, aa, d);
  vec4 col = vec4(uFill, uFillA * inside);
  if (uStrokeW > 0.0) {
    float ring = inside * smoothstep(-uStrokeW - aa, -uStrokeW + aa, d);
    col.rgb = mix(col.rgb, uStroke, ring * uStrokeA / max(col.a + ring * uStrokeA * (1.0 - col.a), 1e-4) * step(0.0001, ring));
    col.a = col.a + ring * uStrokeA * (1.0 - col.a);
  }
  gl_FragColor = vec4(col.rgb, col.a * uOpacity);
}`;

export type RRect = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> & {
  set: (o: { w?: number; h?: number; r?: number; fill?: string; fillA?: number; stroke?: string; strokeA?: number; strokeW?: number; opacity?: number }) => void;
};

const toVec = (hex: string) => {
  const c = new THREE.Color(hex);
  // keep the display values as-is (this shader writes straight to the sRGB target)
  const s = c.clone().convertLinearToSRGB();
  return new THREE.Vector3(s.r, s.g, s.b);
};

export function rrect(name: string, w: number, h: number, r: number, fill = "#ffffff", fillA = 1): RRect {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: new THREE.Vector2(w, h) },
      uRadius: { value: r },
      uFill: { value: toVec(fill) },
      uFillA: { value: fillA },
      uStroke: { value: toVec("#000000") },
      uStrokeA: { value: 0 },
      uStrokeW: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat) as unknown as RRect;
  mesh.name = name;
  mesh.scale.set(w + 4, h + 4, 1);
  const u = mat.uniforms;
  mesh.set = (o) => {
    const size = u.uSize!.value as THREE.Vector2;
    if (o.w !== undefined) size.x = o.w;
    if (o.h !== undefined) size.y = o.h;
    mesh.scale.set(size.x + 4, size.y + 4, 1);
    if (o.r !== undefined) u.uRadius!.value = o.r;
    if (o.fill) u.uFill!.value = toVec(o.fill);
    if (o.fillA !== undefined) u.uFillA!.value = o.fillA;
    if (o.stroke) u.uStroke!.value = toVec(o.stroke);
    if (o.strokeA !== undefined) u.uStrokeA!.value = o.strokeA;
    if (o.strokeW !== undefined) u.uStrokeW!.value = o.strokeW;
    if (o.opacity !== undefined) {
      u.uOpacity!.value = o.opacity;
      mesh.visible = o.opacity > 0.001;
    }
  };
  return mesh;
}
