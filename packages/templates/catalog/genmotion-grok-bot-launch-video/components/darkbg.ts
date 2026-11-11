import * as THREE from "three";

/**
 * The closing film's dark green field: drifting glows plus a fine dot grid.
 * `uRadius` masks it to a circle (stage px) so the previous scene can iris
 * into exactly the picture the next scene opens on. Set `uTime` to FILM
 * seconds measured from frame 476 on both sides of the cut so it never jumps.
 */
const frag = /* glsl */ `
uniform float uTime;
uniform vec2 uSize;
uniform float uRadius;
uniform vec2 uCenter;
varying vec2 vUv;
vec3 glow(vec2 p, vec2 c, vec2 r, vec3 col) {
  vec2 d = (p - c) / r;
  return col * exp(-dot(d, d));
}
void main() {
  vec2 p = vUv;
  float t = uTime;
  vec3 col = vec3(0.0, 0.012, 0.006);
  col += glow(p, vec2(0.02 + 0.03 * sin(t * 0.6), 0.02), vec2(0.42, 0.55), vec3(0.012, 0.20, 0.11));
  col += glow(p, vec2(0.30 + 0.08 * sin(t * 0.45), 0.20), vec2(0.18, 0.35), vec3(0.006, 0.07, 0.04));
  col += glow(p, vec2(1.02, 1.0 - 0.05 * sin(t * 0.5)), vec2(0.35, 0.45), vec3(0.005, 0.13, 0.08));
  col += glow(p, vec2(0.0, 1.0), vec2(0.35, 0.35), vec3(0.04, 0.10, 0.07));
  col += glow(p, vec2(0.0, 0.5), vec2(0.18, 0.5), vec3(0.006, 0.08, 0.05));
  vec2 px = vUv * uSize;
  vec2 cell = fract(px / 4.0) - 0.5;
  float dotm = 1.0 - smoothstep(0.18, 0.32, length(cell));
  col *= 1.0 + dotm * 0.35;
  float d = length(px - uCenter) - uRadius;
  float a = 1.0 - smoothstep(-1.5, 1.5, d);
  gl_FragColor = vec4(col, a);
}`;

export function makeDarkBg(hw: number, hh: number) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: new THREE.Vector2(hw * 2, hh * 2) },
      uRadius: { value: 1e5 },
      uCenter: { value: new THREE.Vector2(hw, hh) },
    },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, hh * 2), mat);
  mesh.name = "background-glow";
  mesh.userData.pickable = false;
  return {
    mesh,
    set(timeSec: number, radius = 1e5) {
      mat.uniforms.uTime!.value = timeSec;
      mat.uniforms.uRadius!.value = radius;
      mesh.visible = radius > 0.5;
    },
  };
}
