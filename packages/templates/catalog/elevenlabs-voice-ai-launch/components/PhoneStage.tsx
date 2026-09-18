import React, { useRef } from "react";
import * as THREE from "three";
import { ThreeScene, random } from "@genmotion/motion";
import type { PackedMesh } from "./Phone3D";
import { PHONE_MODELS } from "./Phone3D";

/**
 * The whole "incoming call" surface as ONE WebGL layer: a dithered gradient
 * field (shader quad), the reconstructed phone, and its contact shadow.
 *
 * The pixel-block wipe is done INSIDE the canvas: a 24×14 mask texture marks
 * which cells have switched on and every fragment in a switched-off (or, in
 * "cover" mode, switched-on) cell is discarded, leaving the canvas transparent
 * there so the paper DOM underneath shows through. No DOM clipping, masking or
 * copying is involved — those blank the compositor over a live canvas.
 */

export type Wipe = {
  from: number;
  to: number;
  /** "reveal": this surface is leaving (cells discard as they switch on).
   *  "cover": this surface is arriving (cells show as they switch on). */
  mode: "reveal" | "cover";
  seed?: string;
  direction?: "left" | "right";
};

const COLS = 24;
const ROWS = 14;

function decode(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Same clumped, seeded thresholds as the DOM BlockReveal so the SFX timing and
// the ragged front feel identical across the film.
function thresholds(seed: string, direction: "left" | "right") {
  const t = new Float32Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const sweep = direction === "left" ? (COLS - 1 - c) / (COLS - 1) : c / (COLS - 1);
      const clump = random(`${seed}-c${Math.floor(c / 3)}-${Math.floor(r / 3)}`);
      const jitter = random(`${seed}-${c}-${r}`);
      t[r * COLS + c] = sweep * 0.62 + clump * 0.24 + jitter * 0.14;
    }
  }
  return t;
}

const FIELD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const FIELD_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMask;
  uniform float uInvert;
  uniform float uTime;
  varying vec2 vUv;

  vec3 stop0 = vec3(0.122, 0.427, 0.710); // #1f6db5
  vec3 stop1 = vec3(0.165, 0.482, 0.741); // #2a7bbd
  vec3 stop2 = vec3(0.290, 0.541, 0.541); // #4a8a8a
  vec3 stop3 = vec3(0.561, 0.604, 0.290); // #8f9a4a

  float blob(vec2 p, vec2 c, vec2 r) {
    vec2 d = (p - c) / r;
    return 1.0 - smoothstep(0.0, 1.0, length(d));
  }

  void main() {
    float lit = texture2D(uMask, vUv).r;
    if (mix(lit, 1.0 - lit, uInvert) > 0.5) discard;

    // 160deg CSS gradient, screen space (y down)
    vec2 s = vec2(vUv.x, 1.0 - vUv.y);
    vec2 dir = normalize(vec2(0.342, 0.940));
    float t = clamp(dot(s - 0.5, dir) / 1.0 + 0.5, 0.0, 1.0);
    vec3 base = t < 0.35 ? mix(stop0, stop1, t / 0.35)
              : t < 0.62 ? mix(stop1, stop2, (t - 0.35) / 0.27)
              : mix(stop2, stop3, (t - 0.62) / 0.38);

    // drifting halftone bands — the same three blobs as the DOM Dither
    float k = uTime * 0.6;
    vec2 a = vec2(0.30 + sin(k) * 0.16, 0.35 + cos(k * 0.8) * 0.14);
    vec2 b = vec2(0.78 + cos(k * 0.7) * 0.14, 0.62 + sin(k * 0.9) * 0.16);
    vec2 c = vec2(0.50 + sin(k * 0.5 + 2.0) * 0.24, 0.55 + cos(k * 0.6) * 0.30);
    float bands = blob(s, a, vec2(0.72, 0.16)) * 0.95 + blob(s, b, vec2(0.62, 0.20)) * 0.9 + blob(s, c, vec2(0.46, 0.12)) * 0.8;
    bands += 0.18 + 0.14 * sin((s.x * 0.94 + s.y * 0.34) * 6.0 + k * 0.5);
    bands = clamp(bands, 0.0, 1.0);

    // 8px dot grid (in 1920x1080 units, so it is resolution independent)
    vec2 cell = fract(s * vec2(1920.0, 1080.0) / 8.0) - 0.5;
    float d = length(cell) * 8.0;
    float dot_ = 1.0 - smoothstep(1.5, 2.1, d);
    vec3 col = mix(base, vec3(1.0), dot_ * bands * 0.92);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Inject the cell-discard into a built-in material (phone body, shadow). */
function withCellDiscard(mat: THREE.Material, uniforms: { uMask: { value: THREE.Texture }; uInvert: { value: number } }) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uMask = uniforms.uMask;
    shader.uniforms.uInvert = uniforms.uInvert;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec4 vClipPos;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvClipPos = gl_Position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uMask;\nuniform float uInvert;\nvarying vec4 vClipPos;")
      .replace(
        "#include <clipping_planes_fragment>",
        "{ vec2 ndc = vClipPos.xy / vClipPos.w; float lit = texture2D(uMask, ndc * 0.5 + 0.5).r; if (mix(lit, 1.0 - lit, uInvert) > 0.5) discard; }\n#include <clipping_planes_fragment>",
      );
  };
  mat.needsUpdate = true;
}

export function PhoneStage({
  frame,
  mesh,
  model = "desk",
  wipe,
  tiltX,
  ring = true,
  timeOffset = 0,
  id = "phone-stage",
}: {
  frame: number;
  mesh: PackedMesh;
  model?: keyof typeof PHONE_MODELS;
  wipe?: Wipe;
  /** Extra pitch (radians) as a pure function of the SCENE frame. */
  tiltX?: (sceneFrame: number) => number;
  ring?: boolean;
  /** seconds already elapsed on this surface in the previous scene — keeps drift and float continuous across the cut */
  timeOffset?: number;
  id?: string;
}) {
  const spec = PHONE_MODELS[model];
  // `build` runs once; per-render values are read through refs in the frame callback.
  const tiltRef = useRef(tiltX);
  tiltRef.current = tiltX;
  const wipeRef = useRef(wipe);
  wipeRef.current = wipe;
  void frame; // the canvas is driven by ThreeScene's own frame clock

  return (
    <div id={id} style={{ position: "absolute", inset: 0 }}>
      <ThreeScene
        id={`${id}-canvas`}
        build={({ scene, camera }) => {
          // ---- wipe mask ------------------------------------------------------
          const maskData = new Uint8Array(COLS * ROWS);
          const maskTex = new THREE.DataTexture(maskData, COLS, ROWS, THREE.RedFormat);
          maskTex.minFilter = THREE.NearestFilter;
          maskTex.magFilter = THREE.NearestFilter;
          maskTex.needsUpdate = true;
          const uniforms = { uMask: { value: maskTex as THREE.Texture }, uInvert: { value: 0 } };
          const thr = thresholds(wipe?.seed ?? "stage", wipe?.direction ?? "left");

          // ---- dither field (full-screen quad) --------------------------------
          const field = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.ShaderMaterial({ vertexShader: FIELD_VERT, fragmentShader: FIELD_FRAG, uniforms: { ...uniforms, uTime: { value: 0 } }, depthTest: false, depthWrite: false }),
          );
          field.frustumCulled = false;
          field.renderOrder = -10;
          scene.add(field);

          // ---- phone ------------------------------------------------------------
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(new Int16Array(decode(mesh.pos).buffer), 3, true));
          geo.setAttribute("normal", new THREE.BufferAttribute(new Int8Array(decode(mesh.nrm).buffer), 3, true));
          geo.setAttribute("uv", new THREE.BufferAttribute(new Uint16Array(decode(mesh.uv).buffer), 2, true));
          geo.setIndex(new THREE.BufferAttribute(new Uint16Array(decode(mesh.idx).buffer), 1));

          const px = new Uint8Array(mesh.tex.w * mesh.tex.h * 4);
          let off = 0;
          for (const chunk of mesh.tex.rgba) { const part = decode(chunk); px.set(part, off); off += part.length; }
          const tex = new THREE.DataTexture(px, mesh.tex.w, mesh.tex.h, THREE.RGBAFormat);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = false;
          tex.needsUpdate = true;

          const bodyMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.08, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: spec.glow });
          withCellDiscard(bodyMat, uniforms);
          const body = new THREE.Mesh(geo, bodyMat);
          const pivot = new THREE.Group();
          pivot.add(body);
          scene.add(pivot);

          // ---- contact shadow (radial alpha plane under the phone) --------------
          const S = 64;
          const sh = new Uint8Array(S * S * 4);
          for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
            const dx = (x + 0.5) / S - 0.5, dy = (y + 0.5) / S - 0.5;
            const dd = Math.sqrt(dx * dx + dy * dy) * 2;
            const a = Math.max(0, 1 - dd);
            const i = (y * S + x) * 4;
            sh[i] = 0; sh[i + 1] = 15; sh[i + 2] = 40; sh[i + 3] = Math.round(a * a * 120);
          }
          const shTex = new THREE.DataTexture(sh, S, S, THREE.RGBAFormat);
          shTex.needsUpdate = true;
          const shadowMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false });
          withCellDiscard(shadowMat, uniforms);
          const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), shadowMat);
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.set(0.02, -0.26, 0.05);
          scene.add(shadow);

          // ---- lights & camera ---------------------------------------------------
          const key = new THREE.DirectionalLight(0xffffff, 5.5);
          key.position.set(-2, 4, 3);
          const fill = new THREE.DirectionalLight(0xcfe3ff, 2.2);
          fill.position.set(3, 1, 2.5);
          const rim = new THREE.DirectionalLight(0xffffff, 3.5);
          rim.position.set(0.5, 3, -3);
          scene.add(key, fill, rim, new THREE.AmbientLight(0xe6eeff, 1.6), new THREE.HemisphereLight(0xffffff, 0x334455, 1.2));

          // full-frame canvas (was a 1200x780 box): pull back so the phone keeps its on-screen size
          camera.position.set(0, spec.camera.y * 1.35, spec.camera.z * 1.35);
          camera.lookAt(0, -0.04, 0);

          return ({ frame: f, time: t0 }) => {
            const time = t0 + timeOffset;
            // wipe mask for this frame
            const w = wipeRef.current;
            let p = 0;
            if (w) p = Math.min(1, Math.max(0, (f - w.from) / Math.max(1, w.to - w.from)));
            uniforms.uInvert.value = w?.mode === "cover" ? 1 : 0;
            for (let r = 0; r < ROWS; r++) {
              for (let c = 0; c < COLS; c++) {
                const lit = p > thr[r * COLS + c];
                // texture rows run bottom-up; grid rows run top-down
                maskData[(ROWS - 1 - r) * COLS + c] = lit ? 255 : 0;
              }
            }
            maskTex.needsUpdate = true;
            (field.material as THREE.ShaderMaterial).uniforms.uTime.value = time;

            // arriving surface slides in a touch from the sweep origin
            const arriving = w?.mode === "cover" ? 1 - (1 - Math.pow(1 - p, 3)) : 0;
            const t = tiltRef.current;
            const raw = t ? t(f) : 0;
            const lean = Number.isFinite(raw) ? raw : 0;
            pivot.position.x = arriving * 0.06;
            pivot.position.y = Math.sin(time * 2.1) * 0.012 - lean * 0.12;
            pivot.rotation.y = spec.yaw + Math.sin(time * 0.9) * 0.05;
            pivot.rotation.z = ring ? Math.sin(time * 45) * 0.006 : 0;
            pivot.rotation.x = 0.02 + lean;
            shadow.position.x = 0.02 + arriving * 0.06;
          };
        }}
      />
    </div>
  );
}
