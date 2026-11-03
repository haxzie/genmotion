/**
 * The "shot on a real camera" pipeline every scene renders through.
 *
 * The world is drawn into an offscreen target with a depth texture, then a
 * fullscreen pass turns that into film: depth-of-field from real depth (a
 * golden-angle gather with bokeh weighting), the black-and-white grade,
 * halation, vignette, grain and the 2.23:1 letterbox. The pass sits in
 * ctx.scene as a camera-independent quad drawn last, so the scene graph the
 * editor picks from is still the real one, seen through the real camera.
 */
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";
import { GRADE } from "./brand";

export interface Film {
  /** Set this frame's lens. `focus` is a world point to hold sharp. The host's draw does the rest. */
  render(frame: number, focus: THREE.Vector3, aperture: number): void;
  /** 0 = picture, 1 = black. */
  setFade(v: number): void;
  /** Override grade values for one scene. */
  uniforms: Record<string, THREE.IUniform>;
}

const vertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uRes;
uniform float uScale, uNear, uFar, uFocus, uAperture, uMaxBlur;
uniform float uFrame, uSat, uContrast, uGrain, uVig, uBar, uFade, uExposure, uHalation;
varying vec2 vUv;

float viewZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return -perspectiveDepthToViewZ(d, uNear, uFar);
}
float coc(float z) {
  return clamp(abs(1.0 / uFocus - 1.0 / max(z, 1e-3)) * uAperture, 0.0, uMaxBlur) * uScale;
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = vUv;
  vec3 centre = texture2D(tColor, uv).rgb;
  float rc = coc(viewZ(uv));
  vec3 acc = centre * (1.0 + 2.0 * smoothstep(0.75, 1.6, luma(centre)));
  float wsum = 1.0 + 2.0 * smoothstep(0.75, 1.6, luma(centre));

  if (rc > 0.6) {
    const int N = 56;
    for (int i = 0; i < N; i++) {
      float fi = float(i) + 0.5;
      float r = sqrt(fi / float(N)) * rc;
      float a = fi * 2.39996323;
      vec2 suv = uv + vec2(cos(a), sin(a)) * r / uRes;
      vec3 s = texture2D(tColor, suv).rgb;
      float rs = coc(viewZ(suv));
      // A sample only reaches here if its own blur is at least this wide, so
      // a sharp subject never smears into the soft background around it.
      float w = clamp(rs - r + 1.0, 0.0, 1.0);
      w *= 1.0 + 2.0 * smoothstep(0.75, 1.6, luma(s)); // bokeh highlights bloom
      acc += s * w;
      wsum += w;
    }
  }
  vec3 col = acc / wsum;

  // Halation: a wide, thresholded glow around bright screen content.
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 24; i++) {
    float fi = float(i) + 0.5;
    float a = fi * 2.39996323;
    vec2 o = vec2(cos(a), sin(a)) * sqrt(fi / 24.0) * 30.0 * uScale / uRes;
    vec3 s = texture2D(tColor, uv + o).rgb;
    glow += max(s - 0.75, 0.0);
  }
  col += glow / 24.0 * uHalation;
  col *= uExposure;

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  vec3 c = gl_FragColor.rgb;

  // Grade: desaturate, gentle filmic S-curve, lifted blacks.
  c = mix(vec3(luma(c)), c, uSat);
  c = clamp((c - 0.5) * uContrast + 0.5, 0.0, 1.0);
  c = c * c * (3.0 - 2.0 * c) * 0.35 + c * 0.65;
  c = c * 0.965 + 0.018;

  // Vignette, measured on the visible 2.23:1 picture.
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  c *= 1.0 - uVig * smoothstep(0.35, 1.1, length(p));

  // Grain: per-frame, stronger in the mids like film.
  float n = hash(floor(uv * uRes / max(uScale, 1.0)) + vec2(uFrame * 17.0, uFrame * 31.0)) - 0.5;
  float m = 1.0 - abs(luma(c) - 0.45) * 1.2;
  c += n * uGrain * max(m, 0.25);

  c *= 1.0 - uFade;
  if (uv.y < uBar || uv.y > 1.0 - uBar) c = vec3(0.0);
  gl_FragColor = vec4(c, 1.0);
}
`;

export function createFilm(ctx: ThreeSceneContext, background = "#060607"): Film {
  const { renderer, scene, camera } = ctx;
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const pixelRatio = size.y / ctx.height;

  const depth = new THREE.DepthTexture(size.x, size.y);
  depth.type = THREE.UnsignedIntType;
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    depthTexture: depth,
    type: THREE.HalfFloatType,
    samples: 4,
  });

  const cam = camera as THREE.PerspectiveCamera;
  cam.near = 0.01;
  cam.far = 60;
  cam.updateProjectionMatrix();

  scene.background = new THREE.Color(background);

  const uniforms: Record<string, THREE.IUniform> = {
    tColor: { value: target.texture },
    tDepth: { value: depth },
    uRes: { value: new THREE.Vector2(size.x, size.y) },
    uScale: { value: pixelRatio },
    uNear: { value: cam.near },
    uFar: { value: cam.far },
    uFocus: { value: 1 },
    uAperture: { value: 10 },
    uMaxBlur: { value: 34 },
    uFrame: { value: 0 },
    uSat: { value: GRADE.saturation },
    uContrast: { value: GRADE.contrast },
    uGrain: { value: GRADE.grain },
    uVig: { value: GRADE.vignette },
    uBar: { value: GRADE.bar },
    uFade: { value: 0 },
    uExposure: { value: 1 },
    uHalation: { value: 0.16 },
  };

  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      depthTest: false,
      depthWrite: false,
      // Transparent so it sorts after every transparent mesh in the host's
      // draw — otherwise labels and cursors land on top of the graded frame.
      transparent: true,
      blending: THREE.NoBlending,
    }),
  );
  quad.name = "film-grade";
  quad.frustumCulled = false;
  quad.renderOrder = 1e9;
  quad.userData.pickable = false;
  scene.add(quad);

  // The offscreen pass runs from the scene's own pre-render hook, so EVERY
  // host draw refreshes it — including the re-draw the export makes after its
  // frame barrier has waited for images to arrive. Rendering it from the
  // frame callback instead would ship the pre-load (black) frame.
  let inner = false;
  scene.onBeforeRender = (r) => {
    if (inner) return;
    inner = true;
    const prev = r.getRenderTarget();
    quad.visible = false;
    r.setRenderTarget(target);
    r.clear();
    r.render(scene, cam);
    r.setRenderTarget(prev);
    quad.visible = true;
    inner = false;
  };

  const v = new THREE.Vector3();
  return {
    uniforms,
    setFade(f) {
      uniforms.uFade!.value = f;
    },
    render(frame, focus, aperture) {
      cam.updateMatrixWorld();
      v.copy(focus).applyMatrix4(cam.matrixWorldInverse);
      uniforms.uFocus!.value = Math.max(0.02, -v.z);
      uniforms.uAperture!.value = aperture;
      uniforms.uFrame!.value = frame;
      uniforms.uNear!.value = cam.near;
      uniforms.uFar!.value = cam.far;
    },
  };
}

/**
 * Handheld camera drift: small deterministic rotations from incommensurate
 * sines. Call after lookAt. `amount` 1 is a steady operator.
 */
export function handheld(camera: THREE.Camera, time: number, amount = 1, seed = 0): void {
  const t = time + seed * 7.13;
  const rx = (Math.sin(t * 1.31) * 0.6 + Math.sin(t * 2.97 + 1.2) * 0.3 + Math.sin(t * 5.3) * 0.1) * 0.0045;
  const ry = (Math.sin(t * 1.07 + 2.1) * 0.6 + Math.sin(t * 2.41 + 0.4) * 0.3 + Math.sin(t * 6.1) * 0.1) * 0.0055;
  const rz = (Math.sin(t * 0.83 + 0.7) * 0.7 + Math.sin(t * 2.2) * 0.3) * 0.003;
  camera.rotateX(rx * amount);
  camera.rotateY(ry * amount);
  camera.rotateZ(rz * amount);
}

const dir = new THREE.Vector3();
/**
 * Put the camera `dist` from `target`, looking at it from `yaw`/`pitch`
 * degrees off the screen's normal (+z), rolled by `roll` degrees.
 */
export function aim(
  camera: THREE.Camera,
  target: THREE.Vector3,
  dist: number,
  yaw: number,
  pitch: number,
  roll = 0,
): void {
  const y = THREE.MathUtils.degToRad(yaw);
  const p = THREE.MathUtils.degToRad(pitch);
  dir.set(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p));
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.rotateZ(THREE.MathUtils.degToRad(roll));
}
