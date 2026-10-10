import * as THREE from "three";

/**
 * A lattice of round glowing dots on the ground plane (y = 0), sized in
 * composition pixels by distance, fading out toward the horizon.
 */
export function dotGrid(opts: { cols: number; rows: number; spacing: number; zNear: number; size: number; fadeNear: number; fadeFar: number }) {
  const { cols, rows, spacing, zNear, size } = opts;
  const pos: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = -cols; c <= cols; c++) pos.push(c * spacing, 0, zNear - r * spacing);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uSize: { value: size },
      uScale: { value: 1000 },
      uFadeNear: { value: opts.fadeNear },
      uFadeFar: { value: opts.fadeFar },
      uOpacity: { value: 1 },
      uColor: { value: new THREE.Color("#ffffff") },
      uMinPx: { value: 1.6 },
      uReveal: { value: 1 },
      uTime: { value: 0 },
      uWave: { value: 0 },        // wave height, world units (0 = flat floor)
      uWaveLen: { value: 7 },     // distance between crests, world units
      uWaveSpeed: { value: 1.6 }, // crest travel, world units per second
    },
    vertexShader: /* glsl */ `
      uniform float uSize; uniform float uScale; uniform float uFadeNear; uniform float uFadeFar; uniform float uMinPx; uniform float uReveal;
      uniform float uTime; uniform float uWave; uniform float uWaveLen; uniform float uWaveSpeed;
      varying float vFade; varying float vShrink; varying float vCrest;
      void main() {
        // two crossing swells rolling toward the camera, plus a slow cross ripple
        vec3 p = position;
        float k = 6.2831853 / uWaveLen;
        float a = sin((p.z * 0.92 + p.x * 0.38) * k + uTime * uWaveSpeed * k);
        float b = sin((p.z * 0.55 - p.x * 0.83) * k * 0.63 + uTime * uWaveSpeed * k * 0.71 + 1.7);
        float w = a * 0.65 + b * 0.35;
        p.y += uWave * w;
        vCrest = w * 0.5 + 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = length(mv.xyz);
        float px = uSize * uScale / max(0.001, -mv.z);
        vShrink = clamp(px / uMinPx, 0.0, 1.0);
        gl_PointSize = max(px, uMinPx) * 2.6;
        vFade = 1.0 - smoothstep(uFadeNear, uFadeFar, d);
        gl_Position = projectionMatrix * mv;
        vec2 ndc = gl_Position.xy / gl_Position.w;
        float order = (ndc.x - ndc.y) * 0.25 + 0.5;          // 1 = bottom-right corner
        vFade *= smoothstep(1.0 - uReveal * 1.4, 1.2 - uReveal * 1.4, order);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; uniform float uWave;
      varying float vFade; varying float vShrink; varying float vCrest;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0 * 2.6;   // 1.0 = dot edge
        float core = 1.0 - smoothstep(0.7, 1.0, d);
        float halo = exp(-d * d * 0.9) * 0.35;
        float lift = 1.0 + step(0.0001, uWave) * (vCrest - 0.5) * 0.7;   // crests catch more light
        float a = (core + halo) * vFade * vShrink * vShrink * uOpacity * lift;
        gl_FragColor = vec4(uColor * a, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.name = "dot-grid";
  points.userData.pickable = false;
  return points;
}

/** Device pixels per world unit at depth 1, for gl_PointSize. */
export function pointScale(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
  const v = renderer.getDrawingBufferSize(new THREE.Vector2());
  return v.y / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
}
