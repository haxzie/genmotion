---
name: three-look
description: "Building the look of a Three.js video: the colour pipeline (output colour space, tone mapping for brand products versus cinematic scenes, what must opt out so brand hexes stay exact), a studio environment so metal and gloss read, re-lit when the ground changes, lighting setups with intensities, materials that read on camera, a clip-space backdrop with radial lift, grain, vignette and a new ground inside one shot, glows, fog, banding, and line art that draws on, erases and keeps its width. Load it when setting a film's look, or when a frame looks flat, muddy or cheap."
---

# The look on Three.js: the how behind the style family

`direction` picks the style family and writes the palette into the Direction block (`references/style-families.md` there has each family's colours, type and finish). This skill turns that into a renderer, lights, materials and a background that look finished, the way GenMotion's 3D templates do. The most common reasons a Three.js frame looks cheap are, in order: the colour pipeline (washed-out brand colours, muddy darks), no environment for glossy materials, a flat fill behind the subject, and too many materials.

Everything lives in one `components/look.ts`. Code: `references/color-and-light.md` (pipeline, environment, lights, materials), `references/backdrops-and-finish.md` (backdrop shader, glow, fog, grain, banding), `references/line-art.md` (strokes that draw on and erase), `references/social-looks.md` (the looks of short social launch films: a drifting mesh ground with a horizon glow, a travelling glow outline for the live control, soft-gloss app icons and coins, motion ghosts for fast objects, a daylight window shadow on paper). All of it compiles against three r185 and was checked on captured frames.

## When to use

- Setting the visual build of a new Three.js film, right after the Direction block.
- A frame looks flat, plasticky, too dark, muddy, washed out, or the brand colour looks wrong.
- Metal renders black, gradients band in the export, or scenes look like different films.
- A whiteboard, diagram, underline or gauge needs lines that draw themselves.
- A short social launch (`direction`'s family K, soft-gloss C, editorial G): a ground with edge light instead of a centred glow, glossy icons or coins, a glowing outline on the control that is live, paper in daylight.

Not for: choosing the family or palette (`direction`), type (`three-type`), camera (`three-camera`).

## One look file

```ts
export const LOOK = {
  bg: "#07070c", bgLift: "#151826",          // ground + the same hue a few steps lighter
  text: "#ededef", muted: "#8a8a93",         // 17:1 and 5.8:1 on the ground
  accent: "#6e7bff",                          // the one brand colour: fills, glows, one word
  exposure: 1.0,
};
```

- **One accent.** Everything else is neutral, tinted a degree toward the accent hue so the frame feels designed rather than grey. A second "punch" colour appears on exactly one word in the film's most important line.
- The accent is for fills, rays, glows and display type, never body copy. A short label or eyebrow may wear it only if it clears 4.5:1 on its ground (yellow `#ffd23f` on near-black is about 13:1); a low-contrast accent (< 4.5:1) never carries text under 60 px.
- Contrast for words: ≥ 4.5:1 under 60 px, ≥ 3:1 at 60 px and above. On near-black, `#8a8a93` is the dimmest text allowed; on white, `#5e606a` (≈6:1). Text on footage or a glow sits on a scrim (0.45–0.65 opacity).

## The colour pipeline (decide it first)

The renderer is shared by every scene in the film, so **every scene** calls `colorPipeline(renderer, mode)` first; a scene that doesn't inherits the previous scene's settings.

| Mode | Tone mapping | Pick it for |
| --- | --- | --- |
| `brand` | `NeutralToneMapping` | 3D products and marks in a brand colour: hue survives (measured: a lime mark stays lime) |
| `cinematic` | `ACESFilmicToneMapping` | Night, drama, music video, where rolled-off highlights are the look (measured: the lime mark goes pale yellow; a flat `#6e7bff` fill shifts to `#8389e3`) |
| `flat` | none | Films with nothing lit: kinetic type, UI, whiteboard, 2D compositors |

- Output colour space sRGB; colour textures sRGB; data textures not.
- **Opt out of tone mapping** (`toneMapped: false`, or a `ShaderMaterial`) for type, UI, screenshots, footage, flat logos, floods, wipes and flashes: anything that must hit an exact hex. A flood that is a few levels off the next scene's background flickers at the cut.
- Exposure 0.9–1.2; fix brightness with exposure before adding lights.

## Lights and environment

| Setup | Recipe (`references/color-and-light.md` §4) | Families |
| --- | --- | --- |
| Product | `studioEnvironment()` + key 2.2 / fill 0.9 warm / rim 1.2 / ambient 0.5 | 3D product hero, brand sting |
| Night / neon | ambient 0.7 violet, key 2.8, cyan rim 1.6, pink fill 1.2, fog | Music video, tech |
| Dramatic | one side key 3–4, rim 2, ambient ≤ 0.15, dark room env | Reveals |
| Soft | hemisphere 1.5 + weak key | Friendly explainers |
| Flat | no lights; everything unlit | Type, SaaS UI, chat, whiteboard |

- `studioEnvironment()` builds a grey room with four softbox panels and prefilters it with PMREM, once, in the builder: **metal and gloss without an environment render black or plastic.** This is the single biggest upgrade for any 3D object.
- A rim light from behind separates a subject from a dark ground; add it before brightening anything. **A hardware or object hero always gets one** (rim or a horizon light along its edge): a matte black product on a dark ground lit flat reads as a primitive, not a product (judged twice).
- **A hardware hero is big and clear.** In every wide shot it is ≥ 20% of the frame height; in its hero frames nothing crosses its silhouette: whatever it attaches to (a rail, a wheel, a stand, a hand) is routed behind it or out of frame from the peak camera. Frame the peak camera first, then build the context around it (a lock at 6% of the height with its rail crossing its legs cost a judged film its hook and its peak).
- Same light direction in every scene of the film.
- **When the ground changes behind a lit object, the light changes with it, in the same frames.** An environment built for the old stage keeps reflecting the old room, so metal goes dark (tested: a titanium ring on a new warm-white ground rendered near-black). Swap `studioEnvironment()` for `followingEnvironment()` and lerp the key light over the ground's frames (`references/color-and-light.md` §7); check the hero material on both grounds.
- A "product" that is flat printed matter (tickets, cards, paper) gains nothing from product lights: use the `flat` pipeline with a baked soft shadow plane under each piece, so its paper hex stays exact.

## Materials

Glossy plastic and coins: `MeshPhysicalMaterial` metalness 0.2–0.55, roughness 0.25–0.35, clearcoat 1. Soft toy-like gloss for app icons and tokens (soft-gloss C): `softGloss()` in `references/social-looks.md` (metalness 0.05, roughness 0.38, clearcoat 1 at 0.12, a little sheen) on rounded squircles and thick-rimmed coins. Polished metal: metalness 1, roughness 0.18–0.3, needs the environment. Matte: `MeshStandardMaterial` roughness 0.45–0.6. Type and UI: never lit (`three-type`). Extruded marks in three tones of the brand colour (face, bevel, side), with a bevel of 1–1.5% of their width. Reuse a handful of material instances across the film.

## Background, glow and finish

- **Never a flat fill behind a subject**, except brand identity. The clip-space `backdrop()` gives a radial lift behind the subject, a 0.25–0.35 vignette and a 1–1.5% grain, in one draw that ignores the camera. The grain is in display units (added after the colour-space conversion; in linear light it boils) and **static by default** (a fixed seed): it dithers banding, survives the encode and keeps the file small. Moving grain is for film-look families only, ≤0.8% for web delivery; measured, the boiling linear-light version made a 30 s landing-page film 69 Mb/s. Brand identity (a sting, a logo end card, a brand guide) is the exception: the brand hex exact at centre and corners (±2 levels), no vignette, no grain. **Coming into a brand end card from a lifted film**, fade the lift, vignette and grain out over the hand-off (≥ 20f, grain last), never in one frame; a card that keeps any lift keeps a static 1–2% grain on it too, or the lift bands into rings after the encode (`references/backdrops-and-finish.md`, after the backdrop code).
- **Glow** is an additive sprite with a soft radial texture behind one subject, breathing 1.2–2.2% at 0.2 Hz; no post-processing is available or needed. Glows and the backdrop's radial lift are **centred on the subject**, and follow it when the layout moves; one centred on the canvas behind a left-weighted layout is a template tell.
- **Fog** in the background colour so floors and far objects fade instead of ending in a line.
- **Banding**: H.264 bands smooth dark gradients. Prefer radial lifts to linear gradients on dark grounds, keep the range small, and keep grain on.
- Three depths per frame: background, subject, a little foreground.
- **A new ground inside one shot** (night to morning, the brand colour arriving behind the product at the peak) grows in the backdrop, behind the subject, never on the camera overlay: the backdrop's `uFlood` disc, out of the subject's screen point, with a hard edge (2–4 px) or a very wide one (≥ 30% of the short side), never a 40–80 px soft iris; paired with the re-light above and a scale change on the subject. Recipe: `references/backdrops-and-finish.md` §7; for a ground change *at a cut*, `three-transitions`' cover layer.

Family-by-family finish (paper, HUD, film overlay, dither): `references/backdrops-and-finish.md` §6.

## Line art

Diagrams, underlines, gauges and the whole whiteboard family use one ribbon whose vertices carry their position along the stroke; two uniforms (`uReveal`, `uErase`) draw it on and erase it back along its own path. Hand-drawn wobble comes from a seeded hash per line, two passes per stroke. Width is a uniform: when a drawing scales down (into an end card), set `uScale` so its lines keep ≥ 2 px on screen, or they alias. Code and the board timing grammar: `references/line-art.md`; a resizable outline with a gap and a colour sweep is `three-assets`' `outline()`.

## Building a look, step by step

1. Copy `LOOK` from the Direction block's palette. Pick the pipeline mode from the table.
2. Add `colorPipeline`, `scene.background = LOOK.bg`, and `backdrop()` to every scene.
3. If anything is lit: `studioEnvironment()` and the family's light setup, in a shared function every scene calls.
4. Build the subject with at most three materials. Opt type, UI and cover layers out of tone mapping.
5. Capture one frame per scene; compare them side by side before moving on.

## A complete product look

The 3D product hero set: brand tone mapping, the studio environment, the product lights, a lifted backdrop with grain, one glow, and an extruded mark in a glossy physical material. Compiled and captured; the lime holds.

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX } from "../components/stage";
import { backdrop, colorPipeline, glow, glowTexture, LOOK, productLights, studioEnvironment } from "../components/look";
import { extrudedMark } from "../components/logo";       // three-assets
import { MARK_D } from "../components/brand";
import { inOutSine, prog } from "../components/ease";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, renderer, width, height, durationInFrames: D } = ctx;
  colorPipeline(renderer, "brand", 1.0);                 // every scene, first
  fitCamera(camera, height);
  scene.background = new THREE.Color(LOOK.bg);
  const bg = backdrop(width / height);
  scene.add(bg.mesh);
  studioEnvironment(renderer, scene);                    // gloss and metal need something to reflect
  productLights(scene);
  const mark = extrudedMark(MARK_D, 420, 70, new THREE.MeshPhysicalMaterial({
    color: LOOK.accent, metalness: 0.2, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15,
  }), "hero-mark");
  const halo = glow(glowTexture(), LOOK.accent, 7, "hero-glow");
  halo.position.z = -1;
  scene.add(halo, mark);
  return ({ frame, time }) => {
    mark.rotation.set(0.12, -0.45 + 0.6 * prog(frame, 0, D, inOutSine), 0); // 34 degree turn over the scene
    halo.material.opacity = 0.5 + 0.1 * Math.sin(time * 2 * Math.PI * 0.2);  // breathe at 0.2 Hz
    mark.position.y = 3 * PX * Math.sin(time * Math.PI * 0.5);               // float 3 px at 0.25 Hz
  };
}
```

## Look by style family

| Family (`direction`) | Pipeline | Lights / env | Background |
| --- | --- | --- | --- |
| Beat-cut kinetic type | flat | none | Solid black or white; no grain |
| Soft-light SaaS | flat | none (UI is unlit) | White/creme with a 3–5% radial lift |
| 3D product hero | brand | product + studio env | White or near-black, lift, static 1% grain, one glow |
| One-shot film | flat | none | The world itself; moving grain overlay (8%, or ≤0.8% on the background for web), vignette 0.28 |
| Brand identity (sting, end card) | flat | flat or product | The exact brand hex, no vignette, no grain (a static ≤0.5% only if a brand gradient bands); depth from the mark's own shading |
| Chat-UI social | flat | none | The app's own colours, pixel-faithful |
| Whiteboard | flat | none | Paper white; strokes are the texture |
| Textured tactile | flat or cinematic | dramatic, if anything is lit | Dark HUD panels, dither, pixel-block wipes |
| Music video | cinematic | night/neon, fog | Night gradient, film overlay with grain and vignette |
| Brand guide | brand or flat | product for the 3D mark | The brand's own colour fields |
| Milestone | flat or brand | product if the number is 3D | Dark, a glow behind the number |
| Social title-card launch (K) | flat (brand if objects are lit) | none, or product for glossy objects | `meshGround()` with a horizon glow (dark), or white with the accent rising from the bottom; one `glowOutline()` on the live control |
| Soft-gloss C (icons, tokens) | brand | product + studio env, rim on | One flat colour or one gradient; motion ghosts on fast objects |
| Editorial G (paper, newsprint) | flat | none | Paper `backdrop` + `windowShadowTexture()`, or grey paper + halftone; one warm accent |

## Anti-patterns

- **A different `toneMapping` (or none set) per scene**: the film changes colour at a cut.
- **Brand colour through ACES**: the client's lime turns lemon. Use `brand` mode.
- **Glossy metal with no environment**: black blobs.
- **A ground change with the old environment kept**: the hero goes dark or muddy on the new ground. Re-light in the same frames.
- **A soft-edged disc wiping across the frame as "the peak"**: on the same framing it reads as a 2D iris. Hard or very wide edge, re-light, and a scale change.
- **Ten slightly different greys**, or a material per mesh.
- **Pure black (#000) grounds and pure white (#fff) type on them**: harsh and banding-prone; use `#07070c`–`#0b0b0c` and `#ededef`.
- **Glow, bloom-ish halos and grain on everything at once.** One glow per subject; static grain at 1–1.5%.
- **Grain added before `colorspace_fragment`, or a float hash that stripes under SwiftShader.** Copy the backdrop as written: integer hash, grain last.
- **Text on a busy area without a scrim.**
- **A small, occluded or flat-lit hardware hero**: under 20% of the frame height in the wides, a prop crossing its silhouette at the peak, no rim. Fix the framing and the rim before the material.
- **A full-chroma gradient blob behind small type**, or a mesh ground whose brightest point sits away from the subject: the ground outshouts the words. Points at 30–60% of the accent's chroma, brightest behind the subject.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Judging the look | `capture-frames`, one frame per scene, side by side | None: a look is judged by looking |
| Palette and family | `direction` (Direction block) | Neutral ground + the brand's one colour as accent |
| Brand colours from a site | `web-research` | Ask the user for hex values |

## Checks before you finish

1. Every scene calls `colorPipeline` and sets `scene.background`; one captured frame per scene, side by side, shows one palette, one light direction, one background family.
2. The brand colour in a capture matches its hex within a couple of levels on flat fills, floods and logos (sample a pixel).
3. Nothing important is pure black or clipped white; metal shows reflections, not black. If the ground changes behind a lit object, capture before and 10f after the change: its mid-tones are as light or lighter on the new ground and its highlights still read.
4. A hardware or object hero: in every wide shot its height is ≥ 20% of the frame height (measure on a capture), its hero frames show its whole silhouette with nothing crossing it, and a rim or horizon light separates its edge from the ground.
5. Every line of text clears 4.5:1 (3:1 at ≥ 60 px) against what is actually behind it in the frame.
6. A dark gradient frame from the export shows no visible steps, and a 100% crop of a flat area shows even noise, no stripes. Every line that must read is ≥ 2 px on screen on its smallest frame (the end card after a scale-down included).
7. Grain: two consecutive held frames of the export have PSNR > 45 dB (static grain) or > 40 dB (moving); brand-identity frames have none. The end card from the export, contrast-stretched, shows no stepped rings (flat hex, or a lift that kept its dither), and a 4 fps strip across the hand-off into it shows the finish fading over ≥ 20f, not popping. Every radial glow or lift sits on its subject in a captured frame of each layout. The export's bitrate fits its destination (`ffprobe … format=bit_rate`).
8. No randomness or wall-clock timing in any shader input; grain and wobble come from the frame number and seeded hashes; `validate` passes.
