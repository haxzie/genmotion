/**
 * Avatar bubbles: a round avatar with a faint glassy halo, as they float around
 * "search" and "to find others". Sized in composition px (diameter of the
 * avatar disc); blur for depth of field; opacity.
 */
import * as THREE from "three";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// plane spans HALO× the avatar diameter
const HALO = 1.45;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uBlur;     // as a fraction of the avatar radius
  uniform float uHalo;     // halo strength
  uniform float uHasMap;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0 * ${HALO.toFixed(2)};   // 1.0 = avatar radius
    float d = length(p);
    float soft = 0.02 + uBlur;
    float disc = 1.0 - smoothstep(1.0 - soft, 1.0 + soft, d);
    vec2 tuv = p * 0.415 + 0.5;
    vec3 img = vec3(0.5);
    if (uHasMap > 0.5) {
      if (uBlur < 0.02) img = texture2D(uMap, tuv).rgb;
      else {
        img = vec3(0.0);
        for (int i = -2; i <= 2; i++)
          for (int j = -2; j <= 2; j++) img += texture2D(uMap, tuv + vec2(float(i), float(j)) * uBlur * 0.22).rgb;
        img /= 25.0;
      }
    }
    // halo: a faint lighter ring around the avatar
    vec2 q = p - vec2(0.08, -0.08);
    float dq = length(q);
    float halo = (1.0 - smoothstep(1.3 - soft - 0.06, 1.36 + soft + 0.06, dq)) * uHalo;
    float rim = exp(-pow((dq - 1.33) / (0.02 + uBlur), 2.0)) * uHalo * (1.0 - min(uBlur * 4.0, 1.0));
    vec4 col = vec4(1.0, 1.0, 1.0, (halo * 0.07 + rim * 0.16) * (1.0 - disc));
    col = mix(col, vec4(img, 1.0), disc);
    gl_FragColor = vec4(col.rgb, col.a * uOpacity);
  }
`;

export type Bubble = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

export function bubble(name: string): Bubble {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uOpacity: { value: 1 },
      uBlur: { value: 0 },
      uHalo: { value: 1 },
    },
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(HALO * 2, HALO * 2), mat) as Bubble;
  m.name = `bubble-${name}`;
  m.renderOrder = 60;
  return m;
}

export function loadBubble(b: Bubble, url: string, manager: THREE.LoadingManager) {
  new THREE.TextureLoader(manager).load(url, (t) => {
    t.colorSpace = THREE.NoColorSpace;
    b.material.uniforms.uMap.value = t;
    b.material.uniforms.uHasMap.value = 1;
  });
}

/** Place a bubble at composition px (x, y) with avatar diameter d px. */
export function setBubble(b: Bubble, x: number, y: number, d: number, opacity = 1, blurPx = 0, halo = 1) {
  b.position.set(x - 640, 360 - y, 0);
  b.scale.setScalar(Math.max(d, 0.001) / 2);
  const u = b.material.uniforms;
  u.uOpacity.value = opacity;
  u.uBlur.value = d > 0 ? blurPx / (d / 2) : 0;
  u.uHalo.value = halo;
  b.visible = opacity > 0.001 && d > 0.5;
}
