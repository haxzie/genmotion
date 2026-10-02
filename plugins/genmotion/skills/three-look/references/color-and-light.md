# Colour pipeline, environment and light

How the 3D templates get glossy product, exact brand colours and clean type in the same frame, as one `components/look.ts`. Compiles against `three` r185 as written; the tone-mapping numbers below were measured from captured frames.

Contents: 1 `components/look.ts` · 2 Which tone mapping · 3 What must opt out · 4 Lighting setups · 5 Materials that read · 6 Shared renderer state

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
