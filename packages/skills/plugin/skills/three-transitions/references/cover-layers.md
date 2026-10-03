# Cover layers: flood, iris, wipe, block wipe, flash

Most motivated handoffs in the catalogue (`motion-language` `references/transitions.md`) are one full-frame layer in front of everything: a disc that floods from a button, a hole that irises in onto an object, an edge that wipes, a grid of blocks, a flat flash. On Three.js that is one plane on the camera-locked overlay (1 unit = 1 composition px, `three-camera`'s `overlay()`), drawn by one small shader whose mode and progress are uniforms. Tested: a flood captured on the last frame of one scene and the first of the next matched to the pixel (`#6e7bff` → 110, 123, 255 on both sides).

Contents: 1 `components/cover.ts` · 2 Flood becomes object · 3 Iris in and out · 4 Directional wipe and white wipe-up · 5 Block wipe · 6 Flash-to-white and impact frames · 7 Colour-field push and panel wipe · 8 Rules for every cover

## 1. `components/cover.ts`

```ts
import * as THREE from "three";

/**
 * One full-frame cover layer for the overlay (1 unit = 1 composition px, camera-locked):
 * it draws a flood/iris disc, a hole (iris-in), a directional wipe, a block wipe or a flat flash.
 * Every mode is a uniform, so one mesh serves the whole film.
 */
export function coverLayer(width: number, height: number, color: string) {
  const uniforms = {
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: 0 },
    uMode: { value: 0 }, // 0 flat, 1 disc, 2 hole, 3 wipe, 4 blocks
    uCenter: { value: new THREE.Vector2(0, 0) }, // px from frame centre, y up
    uRadius: { value: 0 }, // px
    uDir: { value: new THREE.Vector2(0, 1) }, // wipe travel direction (unit)
    uProgress: { value: 0 }, // wipe / blocks 0..1
    uSoft: { value: 2 }, // edge softness px (anti-aliasing; 24-60 for a feathered wipe)
    uHalf: { value: new THREE.Vector2(width / 2, height / 2) },
    uCells: { value: new THREE.Vector2(12, 7) },
    uSeed: { value: 1 },
    uRadial: { value: 0 }, // blocks: 0 sweep along uDir, 1 grow outward from uCenter (an on-screen object)
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vPos;
      void main() { vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity, uMode, uRadius, uProgress, uSoft, uSeed, uRadial;
      uniform vec2 uCenter, uDir, uHalf, uCells;
      varying vec2 vPos;
      // Integer PCG hash on whole cell coordinates (the same one three-look's grain uses): float
      // fract-product hashes lose precision under SwiftShader, the CLI's default renderer.
      uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
      float hash(vec2 p) { uvec2 q = uvec2(ivec2(floor(p)) + 65536); return float(pcg(q.x + pcg(q.y + pcg(uint(uSeed * 977.0))))) / 4294967295.0; }
      void main() {
        float a = 1.0;
        if (uMode > 0.5 && uMode < 1.5) {          // disc: flood / iris-out
          a = 1.0 - smoothstep(uRadius - uSoft, uRadius, length(vPos - uCenter));
        } else if (uMode < 2.5 && uMode > 1.5) {   // hole: iris-in
          a = smoothstep(uRadius - uSoft, uRadius, length(vPos - uCenter));
        } else if (uMode < 3.5 && uMode > 2.5) {   // wipe along uDir
          float reach = abs(uDir.x) * uHalf.x + abs(uDir.y) * uHalf.y;
          float d = dot(vPos, uDir);                 // -reach .. +reach
          float edge = mix(-reach - uSoft, reach + uSoft, uProgress);
          a = 1.0 - smoothstep(edge - uSoft, edge, d);
        } else if (uMode > 3.5) {                  // blocks: sweep + clump + jitter
          vec2 uv = (vPos + uHalf) / (2.0 * uHalf);
          vec2 cell = floor(uv * uCells);
          vec2 cpx = ((cell + 0.5) / uCells - 0.5) * 2.0 * uHalf;     // cell centre in px
          float sweep = uRadial > 0.5
            ? length(cpx - uCenter) / length(uHalf + abs(uCenter))    // 0 at the object, 1 at the far corner
            : dot((cell + 0.5) / uCells - 0.5, uDir) + 0.5;
          float clump = hash(floor(cell / 3.0) + 7.0);
          float jitter = hash(cell);
          float t = sweep * 0.62 + clump * 0.24 + jitter * 0.14;
          a = step(t, uProgress * 1.001);
        }
        if (a < 0.002) discard;
        gl_FragColor = vec4(uColor, a * uOpacity);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width + 4, height + 4), mat);
  mesh.name = "cover";
  mesh.userData.pickable = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = 950;
  mesh.visible = false;
  return { mesh, u: uniforms };
}

/** Radius that covers the whole frame from a point (px from centre): the farthest corner x 1.05. */
export const coverRadius = (cx: number, cy: number, halfW: number, halfH: number) =>
  Math.hypot(halfW + Math.abs(cx), halfH + Math.abs(cy)) * 1.05;

const v = new THREE.Vector3();
/** Where an object's origin lands on screen, in composition px from the centre (y up). */
export function screenPx(obj: THREE.Object3D, camera: THREE.Camera, width: number, height: number) {
  obj.updateWorldMatrix(true, false);
  v.setFromMatrixPosition(obj.matrixWorld).project(camera);
  return { x: (v.x * width) / 2, y: (v.y * height) / 2 };
}
```

Set-up in any scene:

```ts
const hud = overlay(scene, cam, height);            // components/stage.ts
const cover = coverLayer(width, height, LOOK.accent);
hud.group.add(cover.mesh);
```

## 2. Flood becomes object

Scene N: a disc grows from the pressed button to cover the frame, 10f inCubic, complete 3f before the cut.

```ts
const f = prog(frame, D - 13, 10, inCubic);
const c = screenPx(button, cam, width, height);       // where the button is on screen, px from centre
cover.mesh.visible = f > 0;
cover.u.uMode.value = 1;
cover.u.uOpacity.value = 1;
cover.u.uCenter.value.set(c.x, c.y);
cover.u.uRadius.value = f * coverRadius(c.x, c.y, width / 2, height / 2);
```

Scene N+1: opens fully in that colour (its own cover at full radius, or `scene.background` = that colour) and contracts it into an object over 10–13f inOutCubic, then lets go:

```ts
const k = prog(frame, 0, 13, inOutCubic);
const c = screenPx(pill, cam, width, height);
cover.mesh.visible = frame < 22;
cover.u.uMode.value = 1;
cover.u.uCenter.value.set(lerp(0, c.x, k), lerp(0, c.y, k));
cover.u.uRadius.value = lerp(coverRadius(0, 0, width / 2, height / 2), PILL_RADIUS_PX, k);
cover.u.uOpacity.value = 1 - prog(frame, 13, 8, outCubic); // the real pill takes over
```

Sound: a tap on the press that starts the flood, or nothing; never a whoosh (`sound-design`).

## 3. Iris in and out

- **Iris-out** is the flood in the next scene's colour (16–34f inOutCubic; burst 11–16f).
- **Iris-in** onto an object: `uMode` 2 (a hole). Everything outside radius `r` is the cover colour; shrink `r` from `coverRadius(...)` to the object's radius over 30f, centred on the object (`screenPx`), and the object is the next subject.
- Two-stage burst: fast to ~200 px (6f outCubic), then eased to full (`prog` in two segments, or `glide`).
- Echo rings: `stroke(arcPoints(...))` from `three-look` line art at the same centre, rotating 10–20°/s.

## 4. Directional wipe and white wipe-up

```ts
// a white wipe up from the bottom over the last 8f, ease-in, feathered 40 px
cover.u.uMode.value = 3;
cover.u.uDir.value.set(0, 1);                         // travel direction: up
cover.u.uSoft.value = 40;
cover.u.uProgress.value = prog(frame, D - 8, 8, inCubic);
cover.mesh.visible = cover.u.uProgress.value > 0;
cover.u.uOpacity.value = 1;
```

The next scene either opens on that white (its background is white) or clears it continuing upward: `uDir.set(0, -1)` with progress running 1 → 0, which uncovers from the bottom first. Diagonal: `uDir.set(0.707, 0.707)`.

## 5. Block wipe

A block wipe needs a cause on screen, like a flood: the cells **grow out of an object already in the frame that has the wipe's colour** (the yellow packet, the yellow wire as it lights), never from a blank frame edge. A full-frame wipe in a colour nothing on screen carries reads as an unmotivated flash.

```ts
// 12 x 7 cells growing out of the yellow packet, 20f
const c = screenPx(packet, cam, width, height);       // the motivating object, px from centre
cover.u.uMode.value = 4;
cover.u.uCells.value.set(12, 7);
cover.u.uRadial.value = 1;                            // grow outward from uCenter
cover.u.uCenter.value.set(c.x, c.y);
cover.u.uSeed.value = 3;                              // a different, fixed seed per wipe
cover.u.uProgress.value = prog(frame, D - 22, 20);    // linear: the cells are the easing
cover.mesh.visible = cover.u.uProgress.value > 0;
// a sweep across the frame instead: uRadial 0, uDir.set(1, 0); alternate direction scene to scene,
// and start it at the edge where the motivating object sits
```

The next scene starts covered and clears with the same cells (`1 − progress`, same seed and centre). **"Already 12f in"** means its content is mid-animation when the cells open, so it is alive as it appears. Scene N+1 has no frames before its frame 0, so offset its entrance clocks: write them as `prog(frame + 12, start, dur, ease)` (or start its keys at −12), so frame 0 shows what would have been its 12th frame; anything whose entrance would finish before frame 0 is simply on screen. Check frame 0 of N+1 with the cover hidden: elements are part-way in, none still at their start pose. The surface underneath slides 48 px outCubic during the wipe. Pixel dissolve (cells go chunky before dropping) is the same per-cell hash applied to an image layer's shader; the Moonlight template's layer shader does it with a `dissolve` uniform.

## 6. Flash-to-white and impact frames

```ts
cover.u.uMode.value = 0;                              // flat
cover.u.uOpacity.value = prog(frame, D - 6, 6, inCubic);   // scene N: ramp the last 4–8f
// scene N+1: cover.u.uOpacity.value = 1 - prog(frame, 0, 8, outCubic);  decay 6–9f
// music hits: cover.u.uOpacity.value = 0.6 * kick(time, HITS, 10);
```

- Stack an fov punch (−5 to −10°) and a 3–6f shake on the same frame (`three-camera` moves §9).
- Anime impact frame: a second plane with `blending: THREE.CustomBlending, blendSrc: THREE.OneMinusDstColorFactor, blendDst: THREE.ZeroFactor` (inverts what is behind it), visible for exactly 2 frames on the hit.
- On every cut of a music film; elsewhere at most once or twice as a transition, or it becomes a tic. A flash the product itself makes (a camera shutter) may repeat on that action at 0.25–0.4 of the big one.
- A flash must contrast: ≥ 50% luma difference from the frames either side, ≤ 4f at full strength, additive toward white or the accent. Composited at low opacity over a mid-tone it reads as a grey dip; on a bright plate, flash dark or use the punch alone.

## 7. Colour-field push and panel wipe

A solid plane on the overlay translates across and owns the last frame; the next scene opens on the identical field and its content arrives **already moving** in the same direction:

```ts
// scene N: panel slides in from the left over 8f inOutCubic, covering the frame
panel.position.x = lerp(-width, 0, prog(frame, D - 8, 8, inOutCubic));  // overlay px
// scene N+1: panel slides out to the right, content carries momentum 46 px -> 0 over 16f
panel.position.x = lerp(0, width, prog(frame, 0, 8, inOutCubic));
content.position.x = lerp(-46, 0, prog(frame, 0, 16, outCubic)) * PX;
```

`panel` is a `PlaneGeometry(width + 4, height + 4)` with `MeshBasicMaterial({ color, transparent: true, toneMapped: false, depthTest: false })`, `renderOrder` 950, on the overlay group. `transparent: true` even though it is opaque: three.js draws every opaque object before every transparent one, and the kit's type is transparent, so an opaque panel is drawn *under* any `onTop()` label whatever its order.

## 8. Rules for every cover

- On the overlay, so camera moves never uncover an edge; `renderOrder` 950+, `depthTest: false`, `userData.pickable = false`. The mesh's 950 only ranks it *inside* its group: three.js sorts by the nearest ancestor Group's `renderOrder` first, so the cover beats type wrapped in `onTop()` only because `overlay()` sets its group to 900 (`three-camera` `rig.md`). Every cover material is `transparent: true` (opaque objects are drawn before all transparent ones, so an opaque cover loses to transparent type). Add the cover as a direct child of the overlay group, never inside a nested Group at 0; if an older `stage.ts` lacks the line, set `hud.group.renderOrder = 900` after `overlay()`.
- Not tone mapped, and its colour is **exactly** the next scene's background or carrier (one constant in `components/handoff.ts`, imported by both).
- Covers complete 2–5f before the cut and hold; the next scene's first frame is the same picture.
- A frame checker that flags single-colour frames as blank will flag a flood or flash cut; that is expected. Confirm the colour is the carrier's, not an empty scene.
