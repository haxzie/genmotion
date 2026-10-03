# Camera move recipes

Each move as a frame-callback fragment over the rig in `references/rig.md` (`fitCamera`, `PX`, and `components/ease.ts`). Durations and sizes are the `motion-language` camera grammar; this file only shows how to write them on a real camera. Everything is built once in the builder and set per frame; nothing allocates in the callback.

Contents: 1 Push / pull · 2 Punch-in · 3 Orbit · 4 Keyed path (one-shot) · 5 Curve path · 6 Parallax and truck · 7 Match-push into the next scene · 8 Carry across a cut at speed · 9 Impact: shake, fov punch, slam · 10 Subject rig (move the layout, not the camera) · 11 Rack focus · 12 It was inside the device all along · 13 Push on a flat film as a view transform · 14 Perspective UI showcase · 15 Card fan and card floor

## 1. Push / pull

```ts
// builder
const D0 = fitCamera(cam, height);
const target = new THREE.Vector3(0, 0, 0);
// frame: a 1.6x push over 36f, inOutCubic, starting 6f after the cut so the cut reads
const t = prog(frame, 6, 36, inOutCubic);
cam.position.set(target.x, target.y, target.z + logLerp(D0, D0 / 1.6, t));
cam.lookAt(target);
```

- Push 24–48f, zoom 1.3–2.5× (a launch film's peak push 1.7–3.8×, `launch-playbook`); pull-back 45–52f. Log-space distance, always.
- **A move that carries the peak pre-rolls**, so the hit frame is already moving:

```ts
// the 10 lands on HIT; the push starts 12f earlier, so on HIT it runs at 4 * (12/36)^2 = 44% of peak speed
const HIT = 540, PRE = 12, DUR = 36;
const t = prog(frame, HIT - PRE, DUR, inOutCubic);
cam.position.set(lerp(0, FOCUS.x, t), lerp(0, FOCUS.y, t), logLerp(D0, D0 / 2.2, t)); // reframe to centre
cam.lookAt(cam.position.x, cam.position.y, 0);
```

  Pick `PRE` so `4 (PRE / DUR)²` is 0.4–0.6 (`PRE` ≈ 0.32–0.39 × `DUR`: 11–14f of a 36f move, 15–19f of a 48f pull). The words that change on the hit are on the camera overlay, not in the moving world.
- To push onto an off-centre subject, lerp the camera's x/y and its look target together, so the subject slides to centre as it grows.
- Creep (+1.5–6% over a long hold): the same line with `prog(frame, 0, durationInFrames, inOutSine)` and `D0 / 1.04`.

## 2. Punch-in

```ts
// 10% over 8f inCubic, hold 18f, release 12f outCubic; the hit lands on `at`
const k = 1 + 0.1 * (prog(frame, at - 8, 8, inCubic) - prog(frame, at + 18, 12, outCubic));
cam.position.z = D0 / k;
```

The only fast camera move: 6–10f in, ≥15f hold, 10–15f out. Use it on the key word or a music hit, not as a habit.

## 3. Orbit

```ts
// 24 degrees over 120f, inOutSine, radius fixed, looking at the product
const a = THREE.MathUtils.degToRad(lerp(-12, 12, prog(frame, 0, 120, inOutSine)));
cam.position.set(Math.sin(a) * R, Y, Math.cos(a) * R);
cam.lookAt(0, 0, 0);
```

- 10–30° over 90–150f reads as premium; a full turn is a turntable (a different shot).
- Keep `R` constant unless the shot is also a push. Turning the product instead (`product.rotation.y`) is the same picture with simpler lighting: the light stays put and the highlights travel over the surface, which is usually what you want.

## 4. Keyed path (one-shot camera film)

A whole film as one keyed camera: each key is `[frame, x, y, zoom]`; the monotone spline glides through interior keys, zoom runs in log space.

```ts
// builder: keys in film frames; x, y in px; zoom 1 = fitted
const KEYS: [number, number, number, number][] = [
  [0, 0, 0, 2.4], [45, 0, 0, 1.02], [96, 120, -40, 1.06], [150, 120, -40, 2.4], [210, -300, 260, 3.15],
];
const f = KEYS.map((k) => k[0]);
const kx = glide(f, KEYS.map((k) => k[1]));
const ky = glide(f, KEYS.map((k) => k[2]));
const kz = glide(f, KEYS.map((k) => Math.log(k[3])));   // spline the log of zoom
// frame (film frame = scene start + local frame)
const F = SCENE_START + frame;
const zoom = Math.exp(kz(F));
const d = drift(F / fps, 6 * PX / zoom);                    // drift shrinks as you zoom in
cam.position.set(kx(F) * PX + d.x, ky(F) * PX + d.y, D0 / zoom);
```

- Moves between keys 45–90f (1.5–3 s). Two equal consecutive values make a deliberate hold.
- Scene files of a one-shot film are windows onto the same function: every scene imports `KEYS` and passes its own `SCENE_START`, so there is nothing to match at the cuts.

## 5. Curve path (fly-through)

```ts
// builder
const curve = new THREE.CatmullRomCurve3([v(-6, 1, 8), v(-2, 0.5, 4), v(2, 0.3, 3), v(5, 1, 6)], false, "centripetal");
const look = new THREE.Vector3();
// frame: arc-length position, eased so it starts and lands
const u = prog(frame, 0, 120, inOutCubic);
curve.getPointAt(u, cam.position);
curve.getPointAt(Math.min(1, u + 0.02), look);
cam.lookAt(look);
```

`getPointAt` is by arc length, so speed is even along the curve; `"centripetal"` avoids loops at tight corners.

## 6. Parallax and truck

Depth sells a lateral move. Three layers at clearly different z: background (z −6 to −20), subject (z 0), one foreground element (z +2 to +4, partly out of frame). Then move only the camera:

```ts
cam.position.x = lerp(-1.2, 1.2, prog(frame, 0, 90, inOutCubic)); // truck 240 px at z = 0
cam.lookAt(cam.position.x * 0.6, 0, 0);                          // a little pan with it
```

Each layer moves at its own rate with no extra code. Without a foreground layer a truck reads as a slide.

## 7. Match-push into the next scene

Scene N pushes until an element exactly fills the frame; scene N+1 opens laid out at that scale. Both import the handoff numbers.

```ts
// components/handoff.ts
export const SCREEN = { x: 0, y: 40, w: 800, h: 500 }; // px at z = 0 in scene N

// scene N: land the push 10f before the cut and hold (or accelerate through: see 8)
const D1 = D0 * (SCREEN.h / height);                // distance where SCREEN.h fills the frame height
const p = prog(frame, durationInFrames - 34, 24, inOutCubic);
const alive = 1 - p;                                 // drift dies over the push
cam.position.set(lerp(0, SCREEN.x * PX, p) + d.x * alive, lerp(0, SCREEN.y * PX, p) + d.y * alive, logLerp(D0, D1, p));
cam.lookAt(cam.position.x, cam.position.y, 0);

// scene N+1: fitted camera, the element at frame height, centred
const k = height / SCREEN.h;
screen.scale.set(k, k, 1);                           // same content, same crop, frame 0
```

Tested: the last frame of N and the first of N+1 match. Fit to height (or width) by whichever side fills the frame; the other side shows the shared background, which must be identical in both scenes.

## 8. Carry across a cut at speed

When the move should not land (an aggressive 6–10f push, a whip), end scene N at speed and start N+1 at the same speed, measured in the same units:

```ts
// scene N: log-distance falls linearly into the cut (no ease-out)
const v = 0.045;                                     // log-distance per frame at the cut
const lnD = glide([D - 10, D - 1], [Math.log(D0), Math.log(D0) - 9 * v], 0, -v);
cam.position.z = Math.exp(lnD(frame));
// scene N+1: same units, starts at -v and eases to rest
const lnD2 = glide([0, 16], [Math.log(DSTART), Math.log(DSTART) - 0.25], -v, 0);
```

The slope arguments of `glide` are exactly the velocity contract `motion-language` asks for: accelerate through the cut, the next scene continues at the same speed.

## 9. Impact: shake, fov punch, slam

```ts
const HITS = [2.4, 4.1];                             // seconds, on the music hits
const k = kick(time, HITS, 9);                       // 1 on the hit, decaying
const f = frame | 0;
cam.position.x = base.x + (hash1(f) - 0.5) * 0.25 * k;   // shake: per-frame hash, decays with k
cam.position.y = base.y + (hash1(f + 91) - 0.5) * 0.25 * k;
cam.fov = 50 - 8 * k;                                // fov punch -5 to -10 degrees
cam.updateProjectionMatrix();
hud.fit();                                           // the overlay layer re-fits to the new fov
```

- Shake 3–6f of visible decay (sharp 9–14); it lives on the impact frame only.
- Slam a headline out of the lens: `z = lerp(6, 0, e)` and scale keys 0.7 → 1.04 → 1 over 14f (`interpolate(frame, [s, s + 8, s + 14], [0.7, 1.04, 1], Easing.easeOut)`).
- Never dolly and change fov in the same move except in a punch on a hit.

## 10. Subject rig (move the layout, not the camera)

For a flat UI shown in 3D (a dashboard gliding, tilted), it is easier to pose the subject: a pivot that puts a chosen layout point at a chosen screen point, at an apparent scale, tilted.

```ts
// pivot sits at the focus point; inner holds the layout offset so the focus is at the pivot
function applyPose(pivot: THREE.Object3D, inner: THREE.Object3D, p: { fx: number; fy: number; sx: number; sy: number; s: number; rx: number; ry: number }, D0: number) {
  const z = D0 * (1 - 1 / p.s);                     // apparent scale s at the fitted camera
  pivot.position.set((p.sx * PX) / p.s, (p.sy * PX) / p.s, z);
  pivot.rotation.set(p.rx, p.ry, 0, "ZXY");
  inner.position.set(-p.fx * PX, p.fy * PX, 0);
}
```

Key each pose field with `glide` (one spline per field over the same keys) so multi-key glides never stop at a key.

## 11. Rack focus

There is no depth-of-field pass (no post-processing addons). Fake it on the planes that matter: blur the old subject's planes (the type kit's `setLabel({ blur })` in `three-type`, or the same 7×7 blur shader on an image plane) from 0 to 8 px while the new one goes 8 → 0, over 14–20f inOutCubic, with a small push toward the new subject. For lit 3D meshes, dim and desaturate the old subject instead of blurring it.

## 12. It was inside the device all along

The reveal that the thing we have been watching (a jar filling, a chart drawing, a character) lives in the product's screen: the frame pulls back and the device closes in from beyond the edges until the whole phone or laptop is in shot. A straight camera pull-back cannot do it when the subject is off the screen's centre or the device is small in the final frame: the bezel enters the close-up at any sane zoom, or the screen never covers the frame. Instead, **scale the device about the subject**: one rig group whose origin is the subject, the device inside it offset so the subject sits on that origin, scaled from a size where its screen covers the whole frame down to 1, while the rig travels from the opening framing to the final one.

Tested at 1920 × 1080: frame 0 is the subject on the app's screen colour with no bezel in frame; the bezel enters from both sides by frame 30 of a 54f move; the last frame is the whole phone at the right of the frame with the header bar the viewer never saw.

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX } from "../components/stage";
import { colorPipeline, productLights, studioEnvironment } from "../components/look";
import { inOutCubic, lerp, logLerp, prog } from "../components/ease";

/** The smallest scale of a screen (half size hw x hh px, subject at (sx, sy) px from the screen's centre)
 *  that still covers the whole frame when the subject sits at screen point (px, py) px from the frame centre. */
export function coverScale(width: number, height: number, hw: number, hh: number, sx: number, sy: number, px: number, py: number) {
  return 1.04 * Math.max((width / 2 + px) / (hw + sx), (width / 2 - px) / (hw - sx), (height / 2 + py) / (hh + sy), (height / 2 - py) / (hh - sy));
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, renderer, width, height } = ctx;
  colorPipeline(renderer, "brand", 1.0);
  fitCamera(camera, height);
  const GROUND = "#efe7da", SCREEN_BG = "#fbf6ee";
  scene.background = new THREE.Color(GROUND);
  studioEnvironment(renderer, scene);
  productLights(scene);

  // the device, laid out in px around its screen centre: a 380 x 800 screen in a 420 x 860 body
  const SCREEN = { hw: 190, hh: 400 };
  const SUBJECT = { x: 0, y: -60 };                       // where the subject sits inside the screen
  const device = new THREE.Group();
  const shape = new THREE.Shape();
  const bw = 210 * PX, bh = 430 * PX, br = 56 * PX;
  shape.moveTo(-bw + br, -bh); shape.lineTo(bw - br, -bh); shape.quadraticCurveTo(bw, -bh, bw, -bh + br);
  shape.lineTo(bw, bh - br); shape.quadraticCurveTo(bw, bh, bw - br, bh); shape.lineTo(-bw + br, bh);
  shape.quadraticCurveTo(-bw, bh, -bw, bh - br); shape.lineTo(-bw, -bh + br); shape.quadraticCurveTo(-bw, -bh, -bw + br, -bh);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, curveSegments: 12 }),
    new THREE.MeshPhysicalMaterial({ color: "#1c1c1f", metalness: 0.4, roughness: 0.3, clearcoat: 1 }));
  body.position.z = -0.32;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.hw * 2 * PX, SCREEN.hh * 2 * PX), new THREE.MeshBasicMaterial({ color: SCREEN_BG, toneMapped: false }));
  screen.position.z = 0.02;
  const header = new THREE.Mesh(new THREE.PlaneGeometry(300 * PX, 40 * PX), new THREE.MeshBasicMaterial({ color: "#c77a45", toneMapped: false }));
  header.position.set(0, 300 * PX, 0.03);
  const subject = new THREE.Mesh(new THREE.CylinderGeometry(70 * PX, 70 * PX, 14 * PX, 48), new THREE.MeshPhysicalMaterial({ color: "#c77a45", metalness: 0.55, roughness: 0.3, clearcoat: 1 }));
  subject.rotation.x = 1.25;
  subject.position.set(SUBJECT.x * PX, SUBJECT.y * PX, 0.8); // clear of the screen plane: depth never scales (below)
  device.add(body, screen, header, subject);
  // the rig's origin is the subject: scaling the rig scales everything about the subject
  const rig = new THREE.Group();
  device.position.set(-SUBJECT.x * PX, -SUBJECT.y * PX, 0);
  rig.add(device);
  scene.add(rig);

  const OPEN = { x: 0, y: 0 };                             // the subject's screen point in the opening framing (px)
  const LAND = { x: 420, y: -60 };                         // ...and once the whole device is in frame
  const K = coverScale(width, height, SCREEN.hw, SCREEN.hh, SUBJECT.x, SUBJECT.y, OPEN.x, OPEN.y);
  return ({ frame }) => {
    const e = prog(frame, 10, 54, inOutCubic);              // 54f: a reveal, not a cut
    const s = logLerp(K, 1, e);                             // scale in log space, like any zoom
    rig.scale.set(s, s, 1);                                 // scale the plane, not the depth: nothing drifts in perspective
    rig.position.set(lerp(OPEN.x, LAND.x, e) * PX, lerp(OPEN.y, LAND.y, e) * PX, 0);
    subject.rotation.z = 0.01 * frame;
  };
}
```

- **`coverScale()`** is the smallest scale at which the screen still covers the frame from the opening framing, from the subject's place inside the screen; the move starts there (×1.04), so frame 0 has no edge in it.
- **Scale in log space** (`logLerp`), like any zoom, over 45–60f inOutCubic: it is a reveal, the film's turn, so it is slower than a push. The subject's own motion keeps running through it.
- **Scale the plane, not the depth** (`rig.scale.set(s, s, 1)`): if z scaled too, the subject (in front of the screen) would rush toward the lens and drift off its screen point in perspective. A 3D subject therefore looks a little thinner in the opening frames; keep it shallow, or give it its own depth scale.
- **The world the subject lived in is the screen**: the opening ground is exactly the screen's background colour (`toneMapped: false`), so nothing changes colour as the bezel arrives; the ground outside the device is the new, final ground.
- **Type and UI drawn into the screen** are magnified up to `K` times at the start: draw them at `res = 2 × K` (`three-assets` drawn UI), or keep them hidden until the scale is under 2. Anything that must read during the move lives on the overlay, not in the screen.
- Pair it with one sound: an air whoosh across the move, or the app's own UI sound on the frame the whole device lands (`sound-design`).

## 13. Push on a flat film as a view transform

In a flat, diagrammatic film (a boundary on paper, a map, a UI with screen-space labels), a camera push also magnifies every label and changes every stroke width. Push a **map group** instead: `map.scale.set(k, k, 1)` and `map.position` set so the focus point stays put (`position = focus × (1 − k)`), with `k = logLerp(1, zoom, e)`. The labels and the overlay stay on the fitted camera at their true px; strokes drawn with a screen-px width (`three-assets` `outline()`, or line art with `uScale = k`) keep their weight. It is the same picture as a camera push for anything flat on z = 0, with none of its side effects.

The same transform is **the pull-back that keeps its focal still** (the broken-rule pull where one unit becomes the whole field): `k` runs from the close-up zoom down to 1 in log space, `focus` is the focal element's position, and because `position = focus × (1 − k)` the focal sits on the same screen point on every frame while the rest of the world arrives around it. Labels that belong to the world fade out before `k` starts falling and back in after it settles.

## 14. Perspective UI showcase (tilted screen, rim light, depth of field)

The look of a pro tool's launch: a real screen on a tilted plane, rising and pushing slowly, a coloured rim of light behind it, and other panels out of focus by their depth. Pose the subject, not the camera (§10), so type on the fitted camera stays exact. Each panel is one plane with two textures, the screen and a pre-blurred twin, mixed by a per-panel focus value: the defocus is a texture lookup, so it costs nothing per frame and is the same on every machine. The twin is made by drawing the screen into a small canvas and back up with smoothing (no canvas filter needed).

```ts
/** A blurred twin of a UI canvas: down to 1/k and back up with smoothing ≈ a soft blur of ~k canvas px (k/2 composition px at 2×). */
export function blurredTwin(src: OffscreenCanvas, k = 24) {
  const small = new OffscreenCanvas(Math.max(1, Math.round(src.width / k)), Math.max(1, Math.round(src.height / k)));
  const s = small.getContext("2d")!;
  s.imageSmoothingQuality = "high";
  s.drawImage(src, 0, 0, small.width, small.height);
  const out = new OffscreenCanvas(src.width, src.height);
  const o = out.getContext("2d")!;
  o.imageSmoothingQuality = "high";
  o.drawImage(small, 0, 0, out.width, out.height);
  return out;
}

/** A UI panel w × h px with a focus mix: uFocus 1 = sharp, 0 = the blurred twin. Unlit, exact colours. */
export function focusPanel(screen: OffscreenCanvas, w: number, h: number, name = "panel") {
  const tex = (c: OffscreenCanvas) => {
    const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;                                           // stays crisp when tilted
    return t;
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSharp: { value: tex(screen) }, uSoft: { value: tex(blurredTwin(screen)) }, uFocus: { value: 1 }, uOpacity: { value: 1 } },
    transparent: true,
    toneMapped: false,
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; uniform sampler2D uSharp, uSoft; uniform float uFocus, uOpacity;
      void main() { vec4 c = mix(texture2D(uSoft, vUv), texture2D(uSharp, vUv), uFocus); gl_FragColor = vec4(c.rgb, c.a * uOpacity);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * PX, h * PX), mat);
  mesh.name = name;
  return mesh;
}

/** A soft rounded-rect glow texture (the rim behind a panel), drawn once with canvas shadow blur. */
export function rimTexture(w: number, h: number, r: number, blur = 40) {
  const pad = blur * 2;
  const c = new OffscreenCanvas(w + pad * 2, h + pad * 2);
  const g = c.getContext("2d")!;
  g.translate(-(w + pad * 4), 0);                               // the shape off-canvas, only its shadow lands
  g.shadowOffsetX = w + pad * 4;
  g.shadowBlur = blur;
  g.shadowColor = "#ffffff";
  g.beginPath();
  g.roundRect(pad, pad, w, h, r);
  g.fill();
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, wPx: w + pad * 2, hPx: h + pad * 2 };
}
```

```ts
// builder: the hero panel, its rim, two background panels, all in one pivot posed per frame
const hero = focusPanel(heroCanvas, 1200, 740, "ui-hero");      // ~62% of a 1920 frame: room for the push
const rim = rimTexture(1200, 740, 28, 48);
const glowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(rim.wPx * PX, rim.hPx * PX),
  new THREE.MeshBasicMaterial({ map: rim.tex, color: "#78d090", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
);
glowPlane.position.set(0, 18 * PX, -0.05);                      // a little high and behind: light from the back edge
const back = [focusPanel(sideCanvasA, 900, 600, "ui-back-a"), focusPanel(sideCanvasB, 900, 600, "ui-back-b")];
back[0]!.position.set(-1150 * PX, 120 * PX, -3.2);
back[1]!.position.set(1200 * PX, -80 * PX, -4.0);
const pivot = new THREE.Group();
pivot.add(glowPlane, hero, ...back);
scene.add(pivot);
// frame: rise and tilt up over the beat, a slow push 1.0 -> 1.25, focus by depth
const e = prog(frame, 0, D, inOutSine);
const enter = prog(frame, 0, 24, outCubic);
pivot.rotation.x = -0.62 + 0.27 * enter + 0.05 * e;             // back-tilt ~36 deg easing to ~17 deg
pivot.position.set(0, (-260 * (1 - enter)) * PX, D0 * (1 - 1 / (1 + 0.25 * e)));  // apparent scale 1 -> 1.25 (§10)
hero.material.uniforms.uFocus!.value = 1;
back.forEach((b) => { b.material.uniforms.uFocus!.value = 0; b.material.uniforms.uOpacity!.value = 0.85; });
```

- `D0` is the fitted camera distance from `fitCamera`; the z formula is §10's apparent scale.
- **Back-tilt 20–35° on arrival, easing toward 10–20°** as the push brings the screen to reading angle; text on a tilted panel is decoration until it is under about 20°. A **steep side angle** (rotation.y 0.5–0.7) suits a screen with captions beside it: the captions sit in the empty side the angle opens, parallel to the camera.
- **Focus by depth**: one panel sharp at a time. A rack between panels runs `uFocus` 1 → 0 on one while 0 → 1 on the other over 14–20f inOutCubic (§11), with a small push toward the new one. Sizes: everything that carries the claim on the sharp panel ≥ 40 px at 1080p after the tilt (magnify, or lift the control out, `launch-taste` §The control, lifted).
- **The rim** is the accent at 0.4–0.6 opacity, additive, on a dark ground only; on light grounds use a soft dark shadow plane under the panel instead. The ground's brightest point (`three-look` `meshGround()`) sits behind the hero panel.
- Draw the UI canvases with `three-assets`' drawn-UI helpers at 2×; the twin is made once in the builder.

## 15. Card fan and card floor

Two ways to show a collection (perks, partners, templates, plans) with depth instead of a tile wall. **The fan**: cards rise out of one container and spread about a shared pivot at its bottom centre, staggered. **The floor**: many cards on a plane tilted back ~60°, receding under a headline, sliding slowly toward camera and fading with depth.

```ts
// builder: CARDS are textured planes (each card drawn once at 2×), FOLDER is the container object
const fanPivot = new THREE.Group();
fanPivot.position.set(0, -260 * PX, 0);                          // the container's mouth
fanPivot.rotation.x = -0.18;                                     // the whole fan leans back a little
const arms = CARDS.map((c) => {                                  // one arm per card: it pivots below the card
  const a = new THREE.Group();
  c.position.y = 150 * PX;                                       // the card's centre sits above its arm's origin
  a.add(c);
  fanPivot.add(a);
  return a;
});
scene.add(FOLDER, fanPivot);
const N = CARDS.length, SPREAD = 0.26;                           // radians between neighbours
// frame: each card rises 18f outCubic, staggered 3f from the centre outward, then spreads about its arm
arms.forEach((a, i) => {
  const off = i - (N - 1) / 2;
  const p = prog(frame, F0 + Math.abs(off) * 3, 18, outCubic);
  const s = prog(frame, F0 + 10 + Math.abs(off) * 3, 16, outCubic);
  a.position.set(0, (40 * p - 260 * (1 - p)) * PX, 0.002 * i);   // bottoms just inside the mouth; fixed draw order
  a.rotation.z = -off * SPREAD * s;
});
```

```ts
// builder: the floor, a grid of COLS x ROWS cards on a group tilted back ~60 degrees
const floor = new THREE.Group();
floor.rotation.x = -1.05;
floor.position.set(0, -330 * PX, -1.5);
const tiles: THREE.Mesh[] = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(330 * PX, 210 * PX),
    new THREE.MeshBasicMaterial({ map: TILE_TEX[(r * COLS + c) % TILE_TEX.length]!, transparent: true, toneMapped: false }));
  m.position.set((c - (COLS - 1) / 2) * 360 * PX, r * 240 * PX, 0);
  m.name = `tile-${r}-${c}`;
  floor.add(m);
  tiles.push(m);
}
scene.add(floor);
// frame: the floor slides toward camera 240 px over the beat; far rows fade into the ground
floor.position.z = -1.5 + 2.4 * prog(frame, 0, D, inOutSine);
tiles.forEach((m, k) => {
  const row = Math.floor(k / COLS);
  const fade = 1 - Math.min(1, Math.max(0, (row - 1.5) / (ROWS - 1.5)));
  const pop = prog(frame, 4 + row * 3 + (k % COLS), 12, outCubic);  // rows arrive front to back
  (m.material as THREE.MeshBasicMaterial).opacity = fade * pop;
});
```

- The fan reads as "yours" because it comes out of one container; without the container it is a hand of cards. One card may then lift out of the fan toward camera and fill the frame to be read (the payoff).
- The floor is "and many more": headline above it on the fitted camera, the floor below the headline band, never crossing it. Cards on the floor are not read; any card the argument needs is lifted out first.
- Seeded per-card phase (`hash1`) for any idle bob, so a fan never moves in lockstep.
