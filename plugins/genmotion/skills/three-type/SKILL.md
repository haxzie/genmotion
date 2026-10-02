---
name: three-type
description: "Typography in Three.js scenes, built on one type kit: canvas-texture type drawn once at 2x with real tracking, the project's font files loaded through the frame barrier, per-word and per-character planes with a small shader for blur, tint and a baseline mask, and a tabular rolling counter. Recipes for blurUp, riseMask, colour sweeps, two-pass ink, wordmark tracking, typewriter, word-slot flip, highlights, count-ups, captions and karaoke, with sizes and safe zones per aspect. Load it whenever a Three.js scene puts words on screen."
---

# Type on Three.js: the how behind the text motion

There is no DOM on the Three.js engine: every word is pixels in a canvas texture on a plane. Done naively that gives soft type, a fallback font in the export, colour sweeps that look pale, and lines that reflow when they animate. The 3D templates (Samsung Pay, LightPay, Moonlight, p(doom)) solved each of those; this skill packages their answers as one module, `components/type.ts`, and maps every kinetic-type recipe in `motion-language` onto it.

What to animate and for how long (blurUp 12f with a 3f stagger, per-character 1.2–1.6f, reading-time holds) is `motion-language`'s `references/text-motion.md`. This skill is how to build it.

## When to use

- Any Three.js scene with a headline, tagline, stat, wordmark, caption, CTA or lyric.
- Type looks soft, renders in the wrong font in the export, or flickers when it moves.
- A word must change colour, blur in, rise from a mask, flip, type on or count up.
- Text that works at 16:9 overflows at 9:16.

Not for: what the words say or how long they hold (`direction`, `motion-language`), the camera moving past them (`three-camera`), colour and contrast of the palette (`three-look`).

## The type kit

Copy `references/type-kit.md` into `components/type.ts` (it imports `PX`/`RES` from `components/stage.ts`, in `three-camera`'s `references/rig.md`). What it gives you:

| Call | What |
| --- | --- |
| `label(text, style)` | One plane, drawn once at 2×, unlit, named after its words |
| `line(text, style)` | One plane per word, laid out with measured widths; each keeps `restX` |
| `letters(word, style)` | One plane per character; `track(em)` re-spaces them with no redraw |
| `setLabel(m, { opacity, blur, color, maskY })` | The per-frame look: blur in px, tint, clip below a line |
| `counter("#,###", style)` | Tabular digits rolling on a strip texture |
| `withFonts(ctx, files, build)` | Builds the scene only once the font files have loaded, inside the frame barrier |

Rules it encodes, and why:

- **Draw once in the builder, animate the meshes.** Redrawing a canvas per frame re-uploads a texture 30 times a second.
- **2× canvases, sized in composition px.** Captures run at up to 2× device pixels. Never draw small and scale the plane up: that is the "blurry text" bug. Raise `size` instead.
- **Ship the font file.** The capture machine has almost no fonts installed; `"Inter"` by name silently becomes a default sans in the export. Put the woff2 in `assets/` (`save-asset` the brand font, or Inter) and wrap each scene's builder in `withFonts`.
- **Draw white, tint per frame.** Colour sweeps, inking and the punch word are one plane whose tint changes; two crossfaded copies let the background through and read pale.
- **Text is never tone mapped and never lit.** The kit's shader ignores `renderer.toneMapping`, so `#ededef` stays `#ededef` under any look.
- **Name every plane after its words** (the kit does): the editor's click on a word arrives as `#ship-the-whole-film`.

## One type system per film

Keep one `TYPE` table in `components/`, named by role, and use nothing else:

```ts
export const TYPE = {
  display: { size: 150, weight: 600, tracking: -0.03 },  // one per film: the title, the number
  hero: { size: 96, weight: 500 },                       // headlines, 72–130
  sub: { size: 44, weight: 400, color: "#8a8a93" },      // supporting line, 34–48
  label: { size: 30, weight: 500 },                      // labels and captions in 16:9, 28–34
  eyebrow: { size: 26, weight: 600, tracking: 0.22 },    // uppercase eyebrows only
} as const;
```

| Size (px at 1080 high) | Tracking | Weight |
| --- | --- | --- |
| ≥ 120 | −0.03 to −0.035em | 500–600 |
| 60–119 | −0.02em | 500 |
| 28–59 | 0 | 400–500 |
| Uppercase eyebrow 22–28 | +0.12 to +0.22em | 600 |

- **28 px is the floor** for anything read (≈2.6% of frame height in other sizes). Destination sizes, hierarchy ratio (≥1.5–2× between levels) and contrast (≥4.5:1 under 60 px, ≥3:1 above) are in `direction`'s pacing reference; `three-look` has the colour pairs that pass.
- **Light on dark reads heavier**: drop one weight step (600 → 500) for light type on a dark ground under 60 px, and never go below 400.
- Hierarchy comes from size and colour, not weight; sentence case; one emphasised word per line.
- 1 world unit = 100 px at z = 0, so `size` is the on-screen size there. Type at another depth scales by `D0 / (D0 − z)` (`three-camera`); work it out, then confirm on a frame.

## Layout in each aspect

- No wrapping happens for you. Break lines yourself at 2–6 words; measure with `measure()` and stack lines at 1.1–1.2 × size.
- 16:9: keep words inside the house comfort zone, 8–10% per side (150–190 px left/right).
- 9:16 (1080×1920): everything readable inside x 120–840, y 270–1210 (the platform UI superset); headlines 2–4 words a line, 64–132 px; the hook just below the top band (y 270–450).
- 1:1 and 4:5: 5–8% margins; 4:5 keeps key words inside the centre 1080×1080.
- Scale a whole block to fit with `fitBlock()` only as a last resort; re-breaking lines per aspect is better than shrinking.

## Recipes

All in `references/reveals.md`, compiled and captured:

| Recipe (numbers from `motion-language`) | Kit move |
| --- | --- |
| blurUp by word: 12f outCubic, 3f stagger, blur 10 → 0 | `line()`, `setLabel({ opacity, blur })`, y offset |
| riseMask: 13f outQuart, stagger 4f | `setLabel({ maskY })` just under the descenders |
| Per-character title with colour sweep | `letters()`, tint lands 1.6× slower than the move |
| Wordmark: tracking +0.32 → +0.01em over 15f | `letters().track(em)` per frame |
| L→R sweep, two-pass ink | tint per word, 2f apart; grey → ink 5f later |
| Typewriter: 2–2.4 f/char, caret solid while typing | `letters()` visibility by index + a caret plane |
| Word-slot flip: −96° out, +92° in, slot morphs 14f | pivot on the baseline, `rotation.x`, measured slot widths |
| Scatter pops, beat cards | stepped opacity, no tween on the beat |
| Highlight block, pen underline | a plane scaled from its left edge; a stroke (`three-look`) |
| Count-up 40–48f / 120–210f, land punch 1.06 | `counter().set()`, group scale |
| Captions, karaoke | phrase planes on the camera overlay; `kick()` pops |

## Captions

- One phrase of 2–5 words at a time, cut on phrase boundaries from the VO's word timings (`transcribe`), no tween between phrases; legible as or before the word is spoken, held ≥15f after it.
- On the camera-locked overlay (`three-camera` `overlay()`), so a punch-in or shake never moves them.
- 9:16: block centred 58–63% down (y ≈ 1110–1210), 56–72 px, weight 500–600. 16:9: 40–48 px, bottom of the block ≥ 8% above the frame edge. On footage or anything busy, sit them on a scrim plane at 0.5–0.6 opacity.

## A complete scene

The shape every type-led scene takes: fonts first, then the lines, then entrances, holds and exits from the frame. Compiled and captured.

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { fitCamera, PX } from "../components/stage";
import { colorPipeline, LOOK } from "../components/look";
import { line, label, setLabel, withFonts } from "../components/type";
import { TYPE } from "../components/brand";
import { inCubic, outCubic, prog } from "../components/ease";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: "Inter", url: interUrl }], () => {
    const { scene, camera, renderer, height, durationInFrames: D } = ctx;
    colorPipeline(renderer, "flat");
    fitCamera(camera, height);
    scene.background = new THREE.Color(LOOK.bg);
    const head = line("Ship the whole film", TYPE.hero);
    head.group.position.y = 60 * PX;
    const sub = label("in one take", TYPE.sub);
    sub.position.y = -60 * PX;
    scene.add(head.group, sub);
    return ({ frame, time }) => {
      const out = prog(frame, D - 14, 7, inCubic);  // every line clear 7f before the cut
      head.words.forEach((w, i) => {
        const p = prog(frame, 4 + i * 3, 12, outCubic);
        w.position.y = (1 - p) * -48 * PX + out * 20 * PX;
        setLabel(w, { opacity: Math.min(1, p / 0.35) * (1 - out), blur: (1 - p) * 10 + out * 10 });
      });
      setLabel(sub, { opacity: prog(frame, 20, 10, outCubic) * (1 - out) });
      head.group.position.y = 60 * PX + 3 * PX * Math.sin(time * Math.PI * 0.5); // float 3 px at 0.25 Hz, one phase
    };
  });
}
```

## Type by style family

| Family (`direction`) | Type build |
| --- | --- |
| Beat-cut kinetic type | One `label` per card, no tween, hard cut on the beat; accent cards a 2-frame strobe |
| Soft-light SaaS | blurUp by word, 96–120 px, 500; UI text drawn inside the UI canvases at their true size |
| 3D product hero | Display 150–190 px at −0.03em, 600; one punch word in the second colour; slam out of the lens |
| One-shot film | Words carried in from 170 px right, 3.6f apart, colour band sweeping each line |
| Whiteboard | Hand-written text revealed left to right by a soft x-wipe in its shader, 8–18f by width; left column at a 140 px margin |
| Music video | Karaoke lines, sung word flashing the accent |
| Milestone | `counter` with land punch; label above it in muted |

## Anti-patterns

- **Redrawing a canvas in the frame callback.** Draw once; animate mesh transforms, opacity and tint.
- **A font named but not shipped.** The preview on a Mac looks right; the export does not.
- **Scaling a small label up.** Soft edges. Draw at the size it is seen.
- **`MeshStandardMaterial` for type.** Lit type darkens on one side; a tone-mapped `MeshBasicMaterial` shifts the brand hex. Use the kit's shader (or `MeshBasicMaterial` with `toneMapped: false`).
- **Per-character animation on a sentence**, or a stagger so long the first word has settled before the last appears.
- **Tilted or receding type the viewer must read.** Keep text planes parallel to the screen unless the tilt is the point.
- **Type on footage without a scrim.**

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Font files in the project | `save-asset` the brand's woff2 (or Inter's) into `assets/` | The kit falls back to the system sans; say so to the user |
| Caption timing | `transcribe` on the VO | Time phrases by ear from the script at the VO's words per minute |
| Checking legibility | `capture-frames` mid-reveal and on the held line | None |
| Text motion numbers | `motion-language` | — |

## Checks before you finish

1. `capture-frames` on every held line: the face is the brand font (not a fallback sans), edges crisp, nothing under 28 px.
2. One frame per shipped aspect: no word outside the safe zone for that aspect; 9:16 captions sit 58–63% down.
3. Mid-reveal frame of each recipe: blur and colour sweep visible, no word clipped by its plane edge.
4. Every line is fully legible by 15–20f after its first word, and holds `max(30, 9 × words + 15)` frames once legible.
5. Every text plane is named after its words; no canvas is drawn inside a frame callback.
6. No randomness or wall-clock timing in any scene or component; `validate` passes.
