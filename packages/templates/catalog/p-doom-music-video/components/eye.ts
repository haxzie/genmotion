import * as THREE from "three";
import { C } from "./brand";

export type Eye = ReturnType<typeof createEye>;

/**
 * The AI's eye: a glossy sphere, a shader iris on a spherical cap (fibres,
 * circuit rings, or pure flickering bits for "entropy"), and two lids.
 * Radius 1; scale the group.
 */
export function createEye(name = "eye", o: { a?: string; b?: string; lid?: string; detail?: number } = {}) {
  const d = o.detail ?? 1;
  const n = (x: number) => Math.max(8, Math.round(x * d));
  const group = new THREE.Group();
  group.name = name;
  const ball = new THREE.Group(); // turns to look
  ball.name = `${name}-ball`;
  group.add(ball);

  const sclera = new THREE.Mesh(
    new THREE.SphereGeometry(1, n(64), n(48)),
    new THREE.MeshStandardMaterial({ color: "#e9e4ff", roughness: 0.18, metalness: 0.05, emissive: "#2a1a55", emissiveIntensity: 0.4 }),
  );
  sclera.name = `${name}-sclera`;
  ball.add(sclera);

  const capAngle = 0.62;
  const capGeo = new THREE.SphereGeometry(1.004, n(96), n(32), 0, Math.PI * 2, 0, capAngle);
  capGeo.rotateX(Math.PI / 2); // pole → +z
  const irisMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPupil: { value: 0.32 },
      uBits: { value: 0 },
      uGlow: { value: 1 },
      uA: { value: new THREE.Color(o.a ?? C.cyan) },
      uB: { value: new THREE.Color(o.b ?? C.pink) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uPupil, uBits, uGlow; uniform vec3 uA, uB;
      varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float r = 1.0 - vUv.y;               // 0 centre → 1 rim
        float a = vUv.x * 6.28318;
        // fibres + turning circuit rings
        float fib = 0.5 + 0.5 * sin(a * 48.0 + sin(a * 7.0 + uTime) * 2.0 + r * 9.0);
        float ringId = floor(r * 7.0);
        float seg = step(0.45, fract(a * (6.0 + ringId * 3.0) / 6.28318 + uTime * (0.08 + ringId * 0.03) * (mod(ringId, 2.0) * 2.0 - 1.0)));
        float ringLine = smoothstep(0.08, 0.0, abs(fract(r * 7.0) - 0.5) - 0.38) * seg;
        vec3 col = mix(uA, uB, smoothstep(0.35, 1.0, r) + 0.2 * sin(uTime * 1.3 + a));
        col *= 0.55 + 0.45 * fib;
        col += ringLine * vec3(1.0) * 0.8;
        // entropy mode: every cell is a flickering bit
        vec2 cell = vec2(floor(a * 24.0 / 6.28318), floor(r * 10.0));
        float bit = step(0.5, h(cell + floor(uTime * 14.0)));
        vec3 bits = mix(uA * 0.25, mix(uA, uB, h(cell)) * 1.6, bit);
        col = mix(col, bits, uBits);
        // limbal ring, pupil, catchlight
        col *= smoothstep(1.0, 0.82, r) * 0.9 + 0.1;
        float pupil = smoothstep(uPupil + 0.02, uPupil - 0.02, r);
        col = mix(col * uGlow, vec3(0.0), pupil);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const iris = new THREE.Mesh(capGeo, irisMat);
  iris.name = `${name}-iris`;
  ball.add(iris);

  // catchlights sit on the ball, not in the iris shader, so they move with the light
  const shine = new THREE.Mesh(
    new THREE.CircleGeometry(0.1, 24),
    new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.95 }),
  );
  shine.name = `${name}-catchlight`;
  shine.position.set(-0.22, 0.26, 0.99);
  const shine2 = shine.clone();
  shine2.name = `${name}-catchlight-small`;
  shine2.scale.setScalar(0.45);
  shine2.position.set(0.2, -0.16, 1.0);
  ball.add(shine, shine2);

  const lidMat = new THREE.MeshStandardMaterial({ color: o.lid ?? "#1a0f33", roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide, emissive: "#3a1466", emissiveIntensity: 0.5 });
  const upper = new THREE.Mesh(new THREE.SphereGeometry(1.06, n(64), n(24), 0, Math.PI * 2, 0, Math.PI / 2), lidMat);
  upper.name = `${name}-lid-upper`;
  const lower = new THREE.Mesh(new THREE.SphereGeometry(1.05, n(64), n(24), 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lidMat);
  lower.name = `${name}-lid-lower`;
  group.add(upper, lower);

  const target = new THREE.Vector3();
  /**
   * pupil 0..1 of the iris, close 0 open → 1 shut, bits 0..1 entropy mode.
   * `look` is a world point the eye turns toward.
   */
  const set = (t: number, s: { pupil?: number; close?: number; bits?: number; glow?: number; look?: THREE.Vector3 }) => {
    irisMat.uniforms.uTime.value = t;
    irisMat.uniforms.uPupil.value = s.pupil ?? 0.32;
    irisMat.uniforms.uBits.value = s.bits ?? 0;
    irisMat.uniforms.uGlow.value = s.glow ?? 1;
    const c = THREE.MathUtils.clamp(s.close ?? 0.18, 0, 1);
    upper.rotation.x = -(Math.PI / 2) * (1 - c) * 0.95;
    lower.rotation.x = (Math.PI / 2) * (1 - c) * 0.9;
    if (s.look) {
      group.updateWorldMatrix(true, false);
      target.copy(s.look);
      ball.lookAt(target);
    }
  };
  set(0, {});
  return { group, ball, iris, irisMat, set };
}
