import * as THREE from "three";

/** Distance at which 1 world unit = 100 composition px for a 50° lens. */
export function unitDistance(height: number, fovDeg = 50) {
  const visH = height / 100;
  return visH / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
}

/** Put the camera on +z so that the z = 0 plane is at 100px per unit. */
export function fitCamera(camera: THREE.Camera, height: number) {
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = 50;
  cam.near = 0.1;
  cam.far = 400;
  cam.updateProjectionMatrix();
  const d = unitDistance(height);
  cam.position.set(0, 0, d);
  cam.lookAt(0, 0, 0);
  return d;
}

/**
 * Full-screen backdrop drawn in clip space (ignores the camera):
 *  - base colour
 *  - a soft diagonal light shaft (grey-blue), drifting
 *  - a coloured glow rising from the bottom edge (violet / green)
 *  - a centre radial glow
 *  - `white` mixes the whole thing to white; `wipe` reveals white from the bottom up.
 */
export function backdrop(aspect: number) {
  const uniforms = {
    uAspect: { value: aspect },
    uBase: { value: new THREE.Color("#050507") },
    uShaft: { value: 0.0 },
    uShaftX: { value: 0.0 },
    uShaftAngle: { value: -0.62 },
    uShaftColor: { value: new THREE.Color("#5c6173") },
    uGlow: { value: 0.0 },
    uGlowColor: { value: new THREE.Color("#5b4fd6") },
    uGlowX: { value: 0.5 },
    uRadial: { value: 0.0 },
    uRadialColor: { value: new THREE.Color("#2a2f45") },
    uWhite: { value: 0.0 },
    uWipe: { value: 0.0 },
    uWipeColor: { value: new THREE.Color("#ffffff") },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uAspect, uShaft, uShaftX, uShaftAngle, uGlow, uGlowX, uRadial, uWhite, uWipe;
      uniform vec3 uBase, uShaftColor, uGlowColor, uRadialColor, uWipeColor;
      void main() {
        vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
        vec3 col = uBase;
        // diagonal shaft
        vec2 dir = vec2(cos(uShaftAngle), sin(uShaftAngle));
        float d = dot(p - vec2(uShaftX, 0.0), vec2(-dir.y, dir.x));
        float along = dot(p, dir);
        float shaft = exp(-d * d / 0.09) * (0.55 + 0.45 * smoothstep(0.9, -0.6, along));
        col += uShaftColor * shaft * uShaft;
        // bottom glow
        vec2 g = vec2((vUv.x - uGlowX) * uAspect * 0.55, vUv.y + 0.08);
        float glow = exp(-dot(g, g) / 0.16);
        col += uGlowColor * glow * uGlow;
        // centre radial
        float r = exp(-dot(p, p) / 0.35);
        col += uRadialColor * r * uRadial;
        col = mix(col, vec3(1.0), uWhite);
        // wipe from bottom with a soft violet-tinted leading edge
        float edge = smoothstep(uWipe * 1.3 - 0.3, uWipe * 1.3, 1.0 - vUv.y + 0.0);
        float w = 1.0 - edge;
        col = mix(col, uWipeColor, clamp(w * step(0.001, uWipe), 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.name = "backdrop";
  mesh.userData.pickable = false;
  return { mesh, u: uniforms };
}

/**
 * Slate smoke plume, fitted to the reference by sampling its brightness profiles
 * (and a 5× brightness-boosted side-by-side to read its shape):
 *  - one broad soft beam (~30% of frame wide), tilted: top ≈ 60% across, bottom ≈ 40%
 *  - a faint secondary beam top-left, swelling in later
 *  - gentle low-frequency creases inside the light (the "smoky" folds), no fine noise
 *  - cool slate peak ≈ #262a33, black edges; everything drifts slowly rightward
 * Drive `uTime` with the frame clock (seconds). `uIntensity` fades from/to black.
 */
export function smoke(aspect: number) {
  const uniforms = {
    uAspect: { value: aspect },
    uTime: { value: 0 },
    uIntensity: { value: 1 },
    uLight: { value: new THREE.Color("#2a2e39") },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uAspect, uTime, uIntensity;
      uniform vec3 uLight;

      float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      // quintic value noise: smooth enough at the very low frequencies used here
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      // only 3 octaves: the reference smoke has big billows and no fine detail
      float fbm(vec2 p) {
        float v = 0.0, a = 0.55;
        mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
        for (int i = 0; i < 3; i++) { v += a * noise(p); p = r * p * 1.9 + 5.1; a *= 0.3; }
        return v / 0.77;
      }
      float beam(vec2 uv, float cx, float tilt, float sigma) {
        float x = cx + tilt * (uv.y - 0.5);
        float d = (uv.x - x) / sigma;
        return exp(-0.5 * d * d);
      }
      void main() {
        vec2 uv = vUv;
        float t = uTime;
        vec2 p = vec2(uv.x * uAspect, uv.y);
        const float PI = 3.14159265;

        // weak, very low-frequency warp: organic irregularity only, not the shape itself
        vec2 w1 = vec2(fbm(p * 0.6 + vec2(0.0, t * 0.1)), fbm(p * 0.6 + vec2(5.2, -t * 0.08)));
        vec2 uw = uv + (w1 - 0.5) * vec2(0.1, 0.03);

        // the plume's spine: a slow S-curve (~15% of frame width top to bottom), leaning right
        // at the top as measured, swaying over time
        float tilt = mix(0.2, 0.11, smoothstep(0.5, 3.3, t));
        float spine = 0.50 + t * 0.008 + tilt * (uw.y - 0.5)
                    + 0.085 * sin(uw.y * PI * 1.15 + t * 0.55 + 0.6)
                    + 0.035 * sin(uw.y * PI * 2.4 - t * 0.4 + 2.1);
        // width swells and pinches along the plume → billowing lobes
        float sigma = 0.155 + 0.045 * sin(uw.y * PI * 1.7 + t * 0.45 + 1.3);
        float d = (uw.x - spine) / sigma;
        float b1 = exp(-0.5 * d * d);
        // flatten the top of the gaussian a touch: the reference core is broad, not peaky
        b1 = smoothstep(0.0, 0.85, b1);

        float b2 = beam(uw, 0.20 + t * 0.01, 0.25, 0.1) * smoothstep(0.3, 0.9, uv.y) * (0.2 + 0.25 * smoothstep(1.5, 3.2, t));
        float light = b1 + b2;

        // one or two large soft dark lobes drifting through the smoke
        float pocket = fbm(p * 0.7 + 1.5 * w1 + vec2(t * 0.06, -t * 0.04));
        light *= mix(0.7, 1.08, smoothstep(0.25, 0.75, pocket));

        // edges to black
        light *= smoothstep(0.0, 0.16, uv.x) * smoothstep(1.0, 0.84, uv.x);
        vec3 col = uLight * min(light, 1.15);
        col += (hash(uv * 911.0 + fract(t * 7.0)) - 0.5) * 0.004;
        gl_FragColor = vec4(max(col, 0.0) * uIntensity, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.name = "smoke-backdrop";
  mesh.userData.pickable = false;
  return { mesh, u: uniforms };
}

/** Deterministic PRNG. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
