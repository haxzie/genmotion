/**
 * Flat 2D shapes drawn by signed distance in a shader, sized in px each frame
 * without rebuilding geometry: rounded rectangles / pills / circles.
 */
import * as THREE from "three";

const VERT = /* glsl */ `
  varying vec2 vP;
  uniform vec2 uHalf;     // half size of the quad in px (incl. blur room)
  void main() {
    vP = position.xy * uHalf;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy * uHalf, position.z, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec2 uSize;     // box size px
  uniform float uRadius;  // corner radius px
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uSoft;    // edge softness px (blur)
  varying vec2 vP;
  float sdBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  void main() {
    float r = min(uRadius, min(uSize.x, uSize.y) * 0.5);
    float d = sdBox(vP, uSize * 0.5, r);
    float s = max(uSoft, 0.75);
    float a = 1.0 - smoothstep(-s, s, d);
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

export type RoundRect = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

export function roundRect(color: string, name: string): RoundRect {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uHalf: { value: new THREE.Vector2(10, 10) },
      uSize: { value: new THREE.Vector2(10, 10) },
      uRadius: { value: 5 },
      uColor: { value: new THREE.Color().setStyle(color, THREE.NoColorSpace) },
      uOpacity: { value: 1 },
      uSoft: { value: 0.75 },
    },
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  m.name = name;
  m.frustumCulled = false;
  return m;
}

export function setRect(m: RoundRect, w: number, h: number, radius: number, opacity = 1, soft = 0.75) {
  const u = m.material.uniforms;
  (u.uSize.value as THREE.Vector2).set(Math.max(0, w), Math.max(0, h));
  (u.uHalf.value as THREE.Vector2).set(w / 2 + soft * 2 + 2, h / 2 + soft * 2 + 2);
  u.uRadius.value = radius;
  u.uOpacity.value = opacity;
  u.uSoft.value = soft;
  m.visible = opacity > 0.001 && w > 0 && h > 0;
}
