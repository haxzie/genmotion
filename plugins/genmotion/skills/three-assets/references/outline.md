# Outlines: `components/outline.ts`

A rounded rectangle drawn as an outline whose **size changes per frame**: a boundary that grows round its contents, a "your cloud" border with a doorway that closes, a map frame with a label sitting in a notch of its top edge, a card outline whose colour sweeps round it when something is confirmed. `three-look`'s line-art ribbon can draw any path but its geometry is fixed; rebuilding it every frame is slow and its width shrinks when it scales. This is one plane with a signed-distance shader, so every property is a uniform.

Tested: compiled under the project's strict settings and captured at 1920 × 1080 (SwiftShader): a 600 × 440 px outline growing to 1120 × 560 over 30f while it draws on both ways from the top middle, a 140 px doorway in its right edge closing over 10f, a 180 px notch in its top edge, a colour sweep running both ways from the doorway round to the far side in 24f, and a second copy scaled to 0.25 whose 3 px stroke stays 3 px on screen.

Contents: 1 The module · 2 Using it · 3 What each uniform does

## 1. The module

It needs `PX` from `components/stage.ts` (`three-camera`, `references/rig.md`).

```ts
import * as THREE from "three";
import { PX } from "./stage";

/**
 * A rounded-rectangle outline drawn by a signed-distance shader on one plane, so its size,
 * corner radius, two gaps (a doorway, a notch for a label), a draw-on, a colour sweep and
 * the stroke all change per frame with no geometry rebuilt. Positions along the outline are
 * PERIMETER PX from the right-hand middle, counter-clockwise (0 .. perimeter()), so gaps and
 * sweeps are placed by arc length and travel at an even speed round the corners.
 * The stroke is in SCREEN composition px: it stays that wide when the outline (or a parent)
 * scales, which is what keeps a hairline readable on a small end card.
 */
export function outline(name: string, color: string, sweepColor = color) {
  const uniforms = {
    uSize: { value: new THREE.Vector2(100, 100) }, // the plane, local px
    uHalf: { value: new THREE.Vector2(40, 40) }, // the rectangle's half size, local px
    uRadius: { value: 20 },
    uStroke: { value: 3 }, // on-screen composition px
    uDev: { value: 1 }, // device px per composition px: set once from the renderer (below)
    uColA: { value: new THREE.Color(color) },
    uColB: { value: new THREE.Color(sweepColor) },
    uReveal: { value: 1 }, // 0..1 of the perimeter drawn
    uRevealFrom: { value: 0 }, // perimeter px where the draw-on starts
    uRevealBoth: { value: 0 }, // 1 = grows both ways from uRevealFrom, 0 = counter-clockwise only
    uSweep: { value: -1 }, // perimeter px the colour front has travelled (both ways) from uSweepFrom; < 0 = none
    uSweepFrom: { value: 0 },
    uGapA: { value: new THREE.Vector2(0, 0) }, // (centre, half length) in perimeter px; half 0 = no gap
    uGapB: { value: new THREE.Vector2(0, 0) },
    uOpacity: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec2 uSize, uHalf, uGapA, uGapB;
      uniform float uRadius, uStroke, uDev, uReveal, uRevealFrom, uRevealBoth, uSweep, uSweepFrom, uOpacity;
      uniform vec3 uColA, uColB;
      varying vec2 vUv;
      const float PI = 3.14159265;
      float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      // arc length of the nearest perimeter point, from (hx, 0) counter-clockwise
      float perim(vec2 p, vec2 h, float r) {
        vec2 a = abs(p); vec2 c = h - r;
        float q = 0.5 * PI * r, P = 4.0 * (c.x + c.y) + 4.0 * q, s;
        if (a.x > c.x && a.y > c.y) s = c.y + r * clamp(atan(a.y - c.y, a.x - c.x), 0.0, 0.5 * PI);
        else if (h.x - a.x < h.y - a.y) s = min(a.y, c.y);
        else s = c.y + q + (c.x - min(a.x, c.x));
        if (p.x < 0.0 && p.y >= 0.0) s = 0.5 * P - s;
        else if (p.x < 0.0) s = 0.5 * P + s;
        else if (p.y < 0.0) s = P - s;
        return s;
      }
      float along(float s, float from, float P) { return mod(s - from + P, P); } // ccw distance from 'from'
      float loopDist(float s, float c, float P) { float d = abs(s - c); return min(d, P - d); }
      void main() {
        vec2 p = (vUv - 0.5) * uSize;
        float r = min(uRadius, min(uHalf.x, uHalf.y));
        float lpp = 0.5 * (length(dFdx(p)) + length(dFdy(p))); // local px per device px
        float half_ = 0.5 * uStroke * uDev * lpp;
        float d = abs(sdBox(p, uHalf, r)) - half_;
        float a = 1.0 - smoothstep(-0.5 * lpp, 0.5 * lpp, d);
        if (a <= 0.0) discard;
        vec2 c = uHalf - r;
        float P = 4.0 * (c.x + c.y) + 2.0 * PI * r;
        float s = perim(p, uHalf, r);
        float aa = lpp;
        // gaps: soft by one device px at each end
        if (uGapA.y > 0.0) a *= smoothstep(uGapA.y - aa, uGapA.y + aa, loopDist(s, uGapA.x, P));
        if (uGapB.y > 0.0) a *= smoothstep(uGapB.y - aa, uGapB.y + aa, loopDist(s, uGapB.x, P));
        // draw-on
        float drawn = uRevealBoth > 0.5 ? loopDist(s, uRevealFrom, P) / (0.5 * P) : along(s, uRevealFrom, P) / P;
        a *= 1.0 - smoothstep(uReveal - aa / P, uReveal, drawn);
        if (a <= 0.0) discard;
        // colour sweep: uColB behind the front, uColA ahead of it
        float k = uSweep < 0.0 ? 1.0 : smoothstep(uSweep - 2.0 * aa, uSweep, loopDist(s, uSweepFrom, P));
        gl_FragColor = vec4(mix(uColB, uColA, k), a * uOpacity);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.name = name;
  /**
   * Pose it, in the parent's local composition px: centre, half size, corner radius.
   * `pad` is the margin of the plane around the rectangle: at least the stroke divided by
   * the smallest scale it will be shown at, plus 4 (a 3 px stroke on an outline scaled to 0.25 needs 16).
   */
  const set = (cx: number, cy: number, hx: number, hy: number, r: number, pad = 12) => {
    const w = 2 * (hx + pad), h = 2 * (hy + pad);
    mesh.position.set(cx * PX, cy * PX, mesh.position.z);
    mesh.scale.set(w * PX, h * PX, 1);
    uniforms.uSize.value.set(w, h);
    uniforms.uHalf.value.set(hx, hy);
    uniforms.uRadius.value = r;
  };
  /** Perimeter length in px for the current pose: place gaps and sweeps as fractions of it. */
  const perimeter = () => {
    const r = Math.min(uniforms.uRadius.value, uniforms.uHalf.value.x, uniforms.uHalf.value.y);
    return 4 * (uniforms.uHalf.value.x - r + uniforms.uHalf.value.y - r) + 2 * Math.PI * r;
  };
  return { mesh, u: uniforms, set, perimeter };
}

/** Device px per composition px, for outline().u.uDev: the drawing buffer's height over the film's. */
export function devicePx(renderer: THREE.WebGLRenderer, height: number) {
  return renderer.getDrawingBufferSize(new THREE.Vector2()).y / height;
}
```

## 2. Using it

A complete scene (the tested one): the boundary grows and draws on, its doorway closes, the seal colour runs round it, and a small copy keeps its stroke while it shrinks.

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera } from "../components/stage";
import { colorPipeline } from "../components/look";
import { devicePx, outline } from "../components/outline";
import { inOutCubic, outCubic, prog } from "../components/ease";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, renderer, height } = ctx;
  colorPipeline(renderer, "flat");
  fitCamera(camera, height);
  scene.background = new THREE.Color("#f2f0eb");
  const box = outline("your-cloud", "#1b1c1f", "#0e6b57");
  box.u.uStroke.value = 3;
  box.u.uDev.value = devicePx(renderer, height);
  scene.add(box.mesh);
  // the same outline inside a group that shrinks to 0.25, for the screen-px stroke
  const small = new THREE.Group();
  const mini = outline("mini", "#1b1c1f");
  mini.u.uStroke.value = 3;
  mini.u.uDev.value = devicePx(renderer, height);
  mini.set(0, 0, 300, 180, 40, 16);
  small.add(mini.mesh);
  small.position.set(6.5, -3.4, 0);
  scene.add(small);
  return ({ frame }) => {
    const grow = prog(frame, 0, 30, inOutCubic);
    box.set(-100, 0, 300 + 260 * grow, 220 + 60 * grow, 36, 12);
    const P = box.perimeter();
    box.u.uRevealFrom.value = P * 0.25;              // draws on both ways from the top middle
    box.u.uRevealBoth.value = 1;
    box.u.uReveal.value = prog(frame, 0, 24, outCubic);
    box.u.uGapA.value.set(0, 70 * (1 - prog(frame, 40, 10, inOutCubic)));   // the doorway in the right edge closes
    box.u.uGapB.value.set(P * 0.25 + 180, 90);       // a notch in the top edge for a label
    box.u.uSweepFrom.value = 0;                       // the seal colour runs both ways from the doorway
    box.u.uSweep.value = frame < 50 ? -1 : (P / 2) * prog(frame, 50, 24, inOutCubic);
    small.scale.setScalar(1 - 0.75 * prog(frame, 20, 30, inOutCubic));
  };
}
```

- **Place things by perimeter px.** `perimeter()` is the current length; 0 is the middle of the right edge and positions run counter-clockwise, so the top middle is `P / 4`, the left middle `P / 2`, the bottom middle `3P / 4`. A notch for a label sitting on the top edge is `uGapB = (P / 4 + labelCentreFromTopMiddle, labelWidth / 2 + 12)` (counter-clockwise from the top middle is leftward). The positions move with the size, so recompute them from `perimeter()` each frame when the outline resizes.
- **The stroke is in screen px**: `uStroke` 3 stays 3 px on screen at any scale of the outline or its parents (it uses the shader's own pixel derivatives), with a one-device-pixel anti-aliased edge. Set `uDev` once from `devicePx(renderer, height)`. When the outline will be shown at a small scale `s`, pass `set(…, pad)` with `pad ≥ stroke / s + 4` so the stroke never runs off its plane.
- **Draw-on**: `uReveal` 0 → 1 from `uRevealFrom`, counter-clockwise, or both ways at once with `uRevealBoth` 1 (a boundary that opens out of a label). Duration by length: 8–20f for a short box, 20–30f for a frame-filling one (`motion-language`).
- **Colour sweep**: `uSweep` is how far (perimeter px) the new colour has travelled from `uSweepFrom`, both ways; it is complete at `P / 2`. A sweep that means "sealed" or "confirmed" starts at the point the story happens (the doorway that closed), never at an arbitrary corner.
- **Gaps** are hard-edged with a one-pixel soft end; animate the half length to open or close them (a doorway closing in 8–12f inOutCubic reads as a seal).
- It writes no depth; in a frame with 3D objects wrap it with `three-type`'s `onTop()`. Its colours are exact hexes (not tone mapped).
- Circles and pills are the same call: `r = min(hx, hy)`.

## 3. What each uniform does

| Uniform | Unit | Use |
|---|---|---|
| `uHalf`, `uRadius` (via `set`) | local px | size and corners; animate per frame freely |
| `uStroke` | screen px | 2–4 px for a boundary, 1.5–2 for a hairline texture; never under 2 px for a line that must read |
| `uReveal`, `uRevealFrom`, `uRevealBoth` | 0–1, perimeter px, flag | draw-on |
| `uSweep`, `uSweepFrom`, `uColB` | perimeter px, perimeter px, colour | a colour travelling round the path |
| `uGapA`, `uGapB` | (centre, half length) in perimeter px | a doorway, a notch for a label; half length 0 = closed |
| `uOpacity` | 0–1 | fade |
