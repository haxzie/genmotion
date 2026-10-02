# Colour pipeline, environment and light

How the 3D templates get glossy product, exact brand colours and clean type in the same frame, as one `components/look.ts`. Compiles against `three` r185 as written; the tone-mapping numbers below were measured from captured frames.

Contents: 1 `components/look.ts` · 2 Which tone mapping · 3 What must opt out · 4 Lighting setups · 5 Materials that read · 6 Shared renderer state · 7 When the ground changes behind a lit object

## 1. `components/look.ts`

```ts
import * as THREE from "three";

/** The film's palette: one place, imported by every scene. */
export const LOOK = {
  bg: "#07070c",
  bgLift: "#151826", // the radial glow behind the subject: same hue, a few steps lighter
  text: "#ededef",
  muted: "#8a8a93",
  accent: "#6e7bff",
  exposure: 1.0,
};

/**
 * Renderer state is SHARED by every scene in the film (one WebGLRenderer), so each scene
 * sets all of it, every time, or it inherits whatever the previous scene left behind.
 */
export function colorPipeline(renderer: THREE.WebGLRenderer, mode: "brand" | "cinematic" | "flat" = "brand", exposure = LOOK.exposure) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping =
    mode === "brand" ? THREE.NeutralToneMapping : mode === "cinematic" ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = exposure;
}

/**
 * A photo-studio reflection map from core three: a grey room with softbox panels,
 * prefiltered once with PMREM. This is what makes metal and gloss read as product, not plastic.
 */
export function studioEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, roomColor = "#8d8f94") {
  const room = new THREE.Scene();
  room.background = new THREE.Color(roomColor);
  const panel = (w: number, h: number, x: number, y: number, z: number, strength: number, tint = "#ffffff") => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(strength), side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    room.add(m);
  };
  panel(6, 3, 0, 6, 3, 6); // overhead key softbox
  panel(3, 5, -6, 1, 3, 4); // left strip
  panel(3, 5, 6, 2, -2, 3.5); // right back strip: the edge highlight
  panel(8, 2, 0, -4, 5, 1.6, "#fff4e8"); // warm floor bounce
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(room, 0.035).texture;
  pmrem.dispose();
  scene.environment = env;
  return env;
}

/** Key + fill + rim (+ ambient): the product setup. Intensities are for ACES at exposure 1. */
export function productLights(scene: THREE.Scene) {
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 8);
  const fill = new THREE.DirectionalLight(0xfff1e6, 0.9);
  fill.position.set(-6, -2, 5);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(0, 4, -6);
  const amb = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(key, fill, rim, amb);
  return { key, fill, rim, amb };
}
```

`LOOK` is the palette the Direction block chose (style families in `direction`'s `references/style-families.md`); every scene imports it and nothing else invents a colour.

## 2. Which tone mapping

| Mode | `renderer.toneMapping` | Use | Measured |
| --- | --- | --- | --- |
| `brand` (default for 3D) | `NeutralToneMapping` | Product heroes in a brand colour, extruded marks, coins | A lime `#c6f91e` mark under the studio env keeps its hue |
| `cinematic` | `ACESFilmicToneMapping` | Dramatic or night scenes, the music-video family, where crushed highlights are the look | The same lime mark goes pale yellow; a flat `#6e7bff` fill becomes `#8389e3` |
| `flat` | `NoToneMapping` | Films with no lit objects: kinetic type, whiteboard, chat UI, 2D compositors | Every hex exact |

- Exposure 0.9–1.2. Raise exposure before adding lights; add lights before raising intensities past the setup table.
- Output is `SRGBColorSpace` always; colour textures are `SRGBColorSpace`; data textures (normal, roughness) are not.
- A `ShaderMaterial` ends with `#include <colorspace_fragment>` so its uniforms (given as `THREE.Color`, which stores linear) come out as the hex you wrote. Tone mapping only touches a `ShaderMaterial` that includes `<tonemapping_fragment>`, so custom shaders are exact by default.

## 3. What must opt out

Tone mapping is for lit surfaces. Anything that must hit an exact hex sets `toneMapped: false` (or is a `ShaderMaterial`):

- type (the `three-type` kit does this), UI planes, screenshots and footage, logos drawn flat;
- flood, wipe and flash layers: a flood that is not pixel-identical to the next scene's background flickers at the cut (`three-transitions`);
- glows and sprites that carry the brand colour.

`scene.background` as a `THREE.Color` is never tone mapped.

## 4. Lighting setups

| Setup | Lights (intensity at exposure 1) | Environment | Use |
| --- | --- | --- | --- |
| **Product** | key 2.2 at (4, 6, 8) · fill 0.9 warm at (−6, −2, 5) · rim 1.2 at (0, 4, −6) · ambient 0.5 | `studioEnvironment()` | Devices, coins, extruded marks (the LightPay set) |
| **Night / neon** | ambient 0.7 tinted violet · key 2.8 at (4, 7, 6) · rim 1.6 cyan at (−6, 3, −5) · fill 1.2 pink at (−5, −2, 5) | none, or a dark room | Music video, tech, gaming (the p(doom) set): nothing lit ever goes dead black |
| **Dramatic** | one key 3–4 from the side (8, 2, 2) · rim 2 from behind · ambient ≤ 0.15 | dark room (`roomColor` `#202226`) | Reveals; half the subject in shadow |
| **Soft** | `HemisphereLight(sky, ground darker, 1.5)` · weak key 0.8 | grey room | Friendly explainers, pastel palettes |
| **Flat** | none | none | Everything is `MeshBasicMaterial` or a shader: type films, UI, whiteboard |

```ts
// night / neon, from the music-video template
const amb = new THREE.AmbientLight(0xb8a8ff, 0.7);
const key = new THREE.DirectionalLight(0xffffff, 2.8); key.position.set(4, 7, 6);
const rim = new THREE.DirectionalLight("#3df2ff", 1.6); rim.position.set(-6, 3, -5);
const fill = new THREE.DirectionalLight("#ff3d9a", 1.2); fill.position.set(-5, -2, 5);
scene.add(amb, key, rim, fill);
```

A rim light from behind is what separates a subject from a dark background; add it before brightening anything else. Light direction stays the same in every scene of a film.

## 5. Materials that read

| Surface | Material | Values |
| --- | --- | --- |
| Polished metal | `MeshPhysicalMaterial` | metalness 1, roughness 0.18–0.3, clearcoat 0–0.6; **needs `scene.environment`** or it renders black |
| Glossy plastic, coins, extruded marks | `MeshPhysicalMaterial` | metalness 0.2–0.55, roughness 0.25–0.35, clearcoat 1, clearcoatRoughness 0.1–0.2 |
| Matte product | `MeshStandardMaterial` | metalness 0, roughness 0.45–0.6 |
| Glass hint | `MeshPhysicalMaterial` | transmission 0.9, roughness 0.05, thickness 0.5 (costly: one object at most) |
| Glowing accent | `MeshStandardMaterial` | `emissive` = accent, `emissiveIntensity` 0.6–1.5 |
| Type, UI, screenshots | the type kit / `MeshBasicMaterial` | `toneMapped: false`, never lit |

- Reuse a handful of material instances; twenty slightly different greys read as noise.
- Extruded type or marks in three tones of the brand colour (face, bevel, side) read as solid; one tone reads as a cut-out.
- A bevel (1–1.5% of the width) is what catches the studio light on an edge (`three-assets` `extrudedMark`).

## 6. Shared renderer state

All scenes in a film share one `WebGLRenderer`. Whatever a scene sets on it (tone mapping, exposure, `localClippingEnabled`, `autoClear`, a render target) persists into the next scene. So:

- call `colorPipeline(renderer, mode)` at the top of **every** scene, even when the mode is the default;
- restore `autoClear` and call `setRenderTarget(null)` after any off-screen render (`three-transitions` motion blur does);
- set `scene.background` in every scene: the canvas is transparent.

## 7. When the ground changes behind a lit object

Metal and gloss show the room they reflect, not the ground behind them. When the stage colour changes under a lit subject (a dark ground turning warm white at the peak, `backdrops-and-finish.md` §7), an environment built once for the old stage keeps reflecting the old room: measured, a titanium ring on a new warm-white ground rendered near-black, and in a judged film it read "darker and browner" after the change. So the environment and the key light change **in the same frames** as the ground. Add this to `components/look.ts`:

```ts
/** Linear-light mix of two hex colours into `out` (no allocation per frame). */
const _a = new THREE.Color(), _b = new THREE.Color();
export function mixHex(out: THREE.Color, a: string, b: string, t: number) {
  return out.copy(_a.set(a)).lerp(_b.set(b), t);
}

/**
 * The studio room of studioEnvironment(), rebuilt from a 0..1 mix between two stages (`from` the
 * old ground's room, `to` the new one's), so reflections follow the ground as it changes.
 * set(t) re-renders the PMREM only when the quantised mix changes (1/32 steps): a held frame
 * costs nothing, and the map is a pure function of t, so any frame renders alone.
 */
export interface Room { room: string; panel: string; bounce: string; strength: number }
export function followingEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, from: Room, to: Room) {
  const room = new THREE.Scene();
  room.background = new THREE.Color(from.room);
  const panels: { mat: THREE.MeshBasicMaterial; k: number; bounce: boolean }[] = [];
  const panel = (w: number, h: number, x: number, y: number, z: number, k: number, bounce = false) => {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    room.add(m);
    panels.push({ mat, k, bounce });
  };
  panel(6, 3, 0, 6, 3, 6); // the same four softboxes as studioEnvironment()
  panel(3, 5, -6, 1, 3, 4);
  panel(3, 5, 6, 2, -2, 3.5);
  panel(8, 2, 0, -4, 5, 1.6, true); // the floor bounce: this is where the new ground shows up
  const pmrem = new THREE.PMREMGenerator(renderer);
  let rt: THREE.WebGLRenderTarget | null = null;
  let last = -1;
  const tint = new THREE.Color();
  const set = (t: number) => {
    const q = Math.round(Math.min(1, Math.max(0, t)) * 32) / 32;
    if (q === last) return;
    last = q;
    mixHex(room.background as THREE.Color, from.room, to.room, q);
    const s = from.strength + (to.strength - from.strength) * q;
    for (const p of panels) {
      mixHex(tint, p.bounce ? from.bounce : from.panel, p.bounce ? to.bounce : to.panel, q);
      p.mat.color.copy(tint).multiplyScalar(p.k * s);
    }
    const next = pmrem.fromScene(room, 0.035);
    scene.environment = next.texture;
    rt?.dispose(); // the previous map: one target alive at a time
    rt = next;
  };
  set(0);
  return { set };
}
```

```ts
// builder: one room per stage. The new room is a few steps DARKER than the new ground, so the metal keeps edge contrast
const env = followingEnvironment(renderer, scene,
  { room: "#3a3b40", panel: "#ffffff", bounce: "#2a2b30", strength: 0.7 },   // night stage (graphite ground)
  { room: "#9e978c", panel: "#fff6ea", bounce: "#f1ece3", strength: 1.0 });  // morning stage (warm-white ground)
const L = productLights(scene);
// frame: the ground grows over [PEAK, PEAK + 24); the light follows over the same frames plus a 6f tail
const lit = prog(frame, PEAK, 30, inOutSine);
env.set(lit);
L.key.intensity = 2.2 + 0.8 * lit;               // a brighter, warmer key for the brighter stage
mixHex(L.key.color, "#ffffff", "#fff1de", lit);
L.amb.intensity = 0.5 + 0.4 * lit;
```

- Call `followingEnvironment` **instead of** `studioEnvironment` in that scene; both build the same four softboxes, so a film can mix them scene by scene and the lighting matches.
- The new room: the new ground's hue, 30–40% darker (`#9e978c` for a `#f1ece3` ground), panels tinted toward it. A room as light as the ground washes the metal out to a flat beige silhouette (tested); one left grey turns it dark.
- Cost: one PMREM render per changed 1/32 step, about 2 s per changing frame under the CLI's SwiftShader; held frames reuse the map. Keep the change to 20–40 frames.
- Check: `capture-frames` the last frame before the change and a frame 10f after it ends; the subject's mid-tones are as light or lighter on the new ground, and its highlights still read (Checks 3).
