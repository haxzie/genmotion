import React, { useRef } from "react";
import * as THREE from "three";
import { ThreeScene } from "@genmotion/motion";

// The desk phones, reconstructed as real 3D models from the reference frames.
// Mesh buffers AND texture pixels ship as base64 inside JSON modules (int16
// positions, int8 normals, uint16 uvs/indices, 512px RGBA), so the model is
// built synchronously — nothing is fetched or decoded at render time and every
// exported frame sees the same fully-textured phone.

export type PackedMesh = {
  n: number;
  i: number;
  pos: string;
  nrm: string;
  uv: string;
  idx: string;
  tex: { w: number; h: number; rgba: string[] }; // pixels split into ≤256KB base64 chunks
};

// Framing per model. Scenes import ONLY the JSON they need and pass it as `mesh`,
// so a beat never pays for a model it does not show.
export const PHONE_MODELS = {
  desk: { yaw: -0.3, camera: { y: 0.34, z: 1.12 }, glow: 0.15 },
  video: { yaw: -0.12, camera: { y: 0.3, z: 1.02 }, glow: 0.9 },
} as const;

function decode(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function Phone3D({
  frame,
  mesh,
  model = "desk",
  x = 360,
  y = 150,
  width = 1200,
  height = 780,
  ring = true,
  tiltX,
  id = "phone-3d",
}: {
  frame: number;
  mesh: PackedMesh;
  model?: keyof typeof PHONE_MODELS;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  ring?: boolean;
  /** Extra pitch (radians) as a pure function of the SCENE frame — used to lean the phone with a wipe. */
  tiltX?: (sceneFrame: number) => number;
  id?: string;
}) {
  const spec = PHONE_MODELS[model];
  // `build` runs once, so the tilt function is read through a ref that every
  // render refreshes — values derived from hooks (like the window length) are
  // then always current inside the per-frame callback.
  const tiltRef = useRef(tiltX);
  tiltRef.current = tiltX;
  // DOM-side float so the contact shadow breathes with the model
  const floatY = Math.sin(frame * 0.07) * 4;
  return (
    <div id={id} style={{ position: "absolute", left: x, top: y + floatY, width, height }}>
      <ThreeScene
        id={`${id}-canvas`}
        build={({ scene, camera }) => {
          const m = mesh;
          const geo = new THREE.BufferGeometry();
          // normalized=true maps int16 → [-1,1], int8 → [-1,1], uint16 → [0,1] on the GPU
          geo.setAttribute("position", new THREE.BufferAttribute(new Int16Array(decode(m.pos).buffer), 3, true));
          geo.setAttribute("normal", new THREE.BufferAttribute(new Int8Array(decode(m.nrm).buffer), 3, true));
          geo.setAttribute("uv", new THREE.BufferAttribute(new Uint16Array(decode(m.uv).buffer), 2, true));
          geo.setIndex(new THREE.BufferAttribute(new Uint16Array(decode(m.idx).buffer), 1));

          // Synchronous texture from baked pixels (rows already bottom-up for GL)
          const px = new Uint8Array(m.tex.w * m.tex.h * 4);
          let off = 0;
          for (const chunk of m.tex.rgba) { const part = decode(chunk); px.set(part, off); off += part.length; }
          const tex = new THREE.DataTexture(px, m.tex.w, m.tex.h, THREE.RGBAFormat);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = false;
          tex.needsUpdate = true;

          // emissiveMap = the same texture: the bright screen glows, the black body stays black
          const body = new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.08, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: spec.glow }),
          );
          const pivot = new THREE.Group();
          pivot.add(body);
          scene.add(pivot);

          // The texture bakes the phone near-black, so light it generously:
          // a hard key from upper-left, a cool fill, a strong rim to draw the edges.
          const key = new THREE.DirectionalLight(0xffffff, 5.5);
          key.position.set(-2, 4, 3);
          const fill = new THREE.DirectionalLight(0xcfe3ff, 2.2);
          fill.position.set(3, 1, 2.5);
          const rim = new THREE.DirectionalLight(0xffffff, 3.5);
          rim.position.set(0.5, 3, -3);
          scene.add(key, fill, rim, new THREE.AmbientLight(0xe6eeff, 1.6), new THREE.HemisphereLight(0xffffff, 0x334455, 1.2));

          camera.position.set(0, spec.camera.y, spec.camera.z);
          camera.lookAt(0, -0.04, 0);

          return ({ frame: f, time }) => {
            const t = tiltRef.current;
            const raw = t ? t(f) : 0;
            const lean = Number.isFinite(raw) ? raw : 0;
            pivot.position.y = Math.sin(time * 2.1) * 0.012 - lean * 0.12;
            pivot.rotation.y = spec.yaw + Math.sin(time * 0.9) * 0.05;
            // ring buzz — driven from the frame clock, never from the closure
            pivot.rotation.z = ring ? Math.sin(time * 45) * 0.006 : 0;
            pivot.rotation.x = 0.02 + lean;
          };
        }}
      />
    </div>
  );
}

/** Lean helper: 0 → `amount` radians across [from, to] with an ease-in-out. */
export function leanOut(from: number, to: number, amount = 0.38) {
  return (f: number) => {
    const p = Math.min(1, Math.max(0, (f - from) / Math.max(1, to - from)));
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    return e * amount;
  };
}

/** Arrive helper: `amount` → 0 radians across [from, to]. */
export function leanIn(from: number, to: number, amount = 0.38) {
  const out = leanOut(from, to, amount);
  return (f: number) => amount - out(f);
}
