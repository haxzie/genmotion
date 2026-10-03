---
name: three-type
description: "Typography in Three.js scenes, built on one type kit: canvas-texture type drawn once at 2x with real tracking, the project's font files loaded through the frame barrier, per-word and per-character planes with a small shader for blur, tint and a baseline mask, and a rolling counter with tabular or proportional figures. Recipes for blurUp, riseMask, colour sweeps, two-pass ink, wordmark tracking, typewriter, word-slot flip, highlights, count-ups, captions and karaoke, with sizes and safe zones per aspect. Load it whenever a Three.js scene puts words on screen."
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
| `line(text, style, align?)` | One plane per word, laid out with measured widths; each keeps `restX`; `align` "left" / "center" / "right" (a left column is "left") |
| `letters(word, style)` | One plane per character; `track(em, anchor?)` re-spaces them with no redraw, holding the `anchor` edge ("left" for a wordmark right of its symbol) still |
| `setLabel(m, { opacity, blur, color, maskY, maskX, maskSoft })` | The per-frame look: blur in px, tint (it **replaces** `style.color`, which is only the starting tint: the canvas is drawn white), clip below a line, clip right of a line (a wipe that writes the word in) |
| `maskDepth(text, style)` | Px below a centred label's middle for a rise mask: the text's lowest ink in the loaded face (descenders included) plus a small pad |
| `counter("#,###", style, figures?, anchor?)` | Digits rolling on a strip texture; leading zeros hidden ("$42", not "$0,042"); decimals with `"##.#"` (`set(0.4)` reads "0.4"); the visible number is centred by default (`anchor` "right"/"left" pins that edge); `setColor` for an ink change. Load the face with tabular figures on (`features: '"tnum" 1'`) or pass `"proportional"` |
| `withFonts(ctx, files, build)` | Builds the scene only once the font files have loaded, inside the frame barrier; several families in one call; `features` turns on OpenType features (tabular figures) |
| `onTop(obj, order?)` | Keeps type in front of 3D objects as one layer: depth test off, `order` on every mesh **and Group** under it. 100 = above the world, under covers; 920 = captions on the overlay; 960+ = above a flood |

Rules it encodes, and why:

- **Draw once in the builder, animate the meshes.** Redrawing a canvas per frame re-uploads a texture 30 times a second.
- **2× canvases, sized in composition px.** Captures run at up to 2× device pixels. Never draw small and scale the plane up: that is the "blurry text" bug. Raise `size` instead.
- **Ship the font file.** The capture machine has almost no fonts installed and a new project ships none; `"Inter"` by name silently becomes a default sans in the export. Put the woff2 (or woff) in `assets/` and wrap each scene's builder in `withFonts`; TTF and OTF files fail the project's bundler and `check`, so convert or fetch the woff2. Any OFL face: `npm pack @fontsource-variable/<family>` (or `@fontsource/<family>`) and take the latin woff2 from `files/`. Inter (OFL): `save-asset` `https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/InterVariable.woff2` (font CDNs are often blocked; this and the rsms/inter GitHub release are not); more sources in `references/type-kit.md` §3.
- **Draw white, tint per frame.** Colour sweeps, inking and the punch word are one plane whose tint changes; two crossfaded copies let the background through and read pale. The kit always draws white and uses `style.color` as the starting tint, so a later tint replaces it, never multiplies with it.
- **Text is never tone mapped and never lit.** The kit's shader ignores `renderer.toneMapping`, so `#ededef` stays `#ededef` under any look.
- **Text is never hidden by the 3D world.** The planes write no depth but still test it, so anything nearer the camera covers them. Wrap every headline, label and caption that shares a frame with 3D objects in `onTop()` (depth test off, drawn last); check a frame where an object passes in front.
- **Kerned per character.** `letters()` places each glyph where it sits inside the kerned word, so "WAVY", "AV" and "To" set per character match the same word set whole.
- **Draw order is by Group first.** three.js sorts transparent objects by the nearest ancestor Group's `renderOrder` before the mesh's own, and every Group resets it: the Group that `line()`, `letters()` and `counter()` return sits at 0, so its words sort to the bottom of wherever they are nested, whatever order the meshes carry. That is why `onTop(obj, order)` sets the order on the groups too: always pass the group through `onTop` with the layer you want. `three-camera`'s `overlay()` group is 900 and a cover in it 950, so `onTop(x)` (100) stays under floods and flashes, `onTop(caption, 920)` puts captions on the overlay above world type, and `onTop(line, 960)` puts a payoff line above a flood. Covers and panels must be `transparent: true`: opaque objects all draw before transparent ones. Details in `references/type-kit.md` §4.
- **Name every plane after its words** (the kit does): the editor's click on a word arrives as `#ship-the-whole-film`.

## One type system per film

Keep one `TYPE` table in `components/`, named by role, and use nothing else. **This is the pack's one size table**: it is the house design standards every project's `AGENTS.md` carries, and other skills cite it rather than restating sizes.

```ts
export const TYPE = {
  hero: { size: 110, weight: 500 },                      // headlines, 72–130 (one per scene)
  sub: { size: 42, weight: 400, color: "#8a8a93" },      // supporting line, 34–48
  label: { size: 30, weight: 500 },                      // labels, annotations, 16:9 captions, 28–34
  eyebrow: { size: 28, weight: 500, tracking: 0.16 },    // uppercase eyebrows only, 28 (the floor)
  display: { size: 130, weight: 500, tracking: -0.03 },  // the film's title or its one number
} as const;
```

| Role (px at 1080 on the short side) | Size | Tracking | Weight |
| --- | --- | --- | --- |
| Hero headline | 72–130 | −0.02em (60–119 px), −0.03em (120–130 px) | 400–500, **never above 500** |
| Supporting line | 34–48 | 0 | 400 |
| Labels, annotations, captions (16:9) | 28–34 | 0 | 400–500 |
| Eyebrow (uppercase, the only all-caps text) | 28 | +0.12 to +0.2em | 500 |
| The one image-word: a wordmark lockup, a hero number, a bleed punch word | Above 130, sized by the lockup or the frame | sentence case −0.03 to −0.045em; **uppercase wordmark +0.08 to +0.16em** | the brand's, else 500 |

- **28 px is the floor** for anything, anywhere (≈2.6% of the frame's short side at other sizes). The house guide's eyebrow range is 22–28, so with the floor an eyebrow is 28. If a layout only works smaller, cut words or zoom in.
- **Weight**: hierarchy comes from size and colour, not weight; headlines 400–500. A brand that specifies a heavier face for its wordmark overrides this for the wordmark only. Word-timed social captions over footage are the one sanctioned exception: they follow `ugc-craft`'s caption spec.
- **Only the image-word goes above 130 px**: one word or number that is a picture in itself, never a sentence.
- Sentence case everywhere except eyebrows, a brand's uppercase wordmark, and trailer cards (`video-editing`'s trailer format sets those in caps or small caps at +0.1 to +0.2em, fully legible on their hit frame). Uppercase at display size needs *positive* tracking: caps set tight read cramped.
- **Light on dark reads heavier**: under 60 px, light type on a dark ground uses 400–500, never lighter than 400.
- **Printed matter on a prop** (an invoice's line items, a document's body, a ticket's fine print) is drawn as grey bars or lines, not as glyphs under 28 px: text that cannot be read should not look like text. `three-assets`' `references/drawn-ui.md` has `textBars()`.
- **Cap height**: Inter's capitals are 0.727 em, so caps 96 px tall are set at `96 / 0.727 ≈ 132` px; on a centred label they sit 0.03 × size above the plane's centre (shift down by that to centre caps optically on a symbol).
- **Uppercase display type never fades up on flat opacity.** A per-letter opacity ramp shows mid-grey, half-there capitals that read as loading, not as a reveal. Reveal caps through a mask (rise through a mask just under the caps, `maskY = y − 0.36 × size`), a wipe (`maskX` behind a moving edge or line), or blur 6 → 0 with opacity stepped on in ≤ 2f; `references/reveals.md` §4.
- Hierarchy ratio ≥1.5–2× between levels; contrast ≥4.5:1 under 60 px, ≥3:1 above (`three-look` has the colour pairs that pass). One size pair per scene, three sizes at most.
- 1 world unit = 100 px at z = 0, so `size` is the on-screen size there. Type at another depth scales by `D0 / (D0 − z)` (`three-camera`); work it out, then confirm on a frame.

## Layout in each aspect

- No wrapping happens for you. Break lines yourself at 2–6 words; measure with `measure()` and stack lines at 1.1–1.2 × size.
- 16:9: keep words inside the house comfort zone, 8–10% per side (150–190 px left/right).
- **Beside a hero object** (text left, product right): the text column is ≤ 40–45% of the frame width from the left margin (about 610–690 px of type at 1920 after a 170 px margin), so at hero size (92–110 px) that is 2–3 words a line, and a 4–6 word line breaks in two. Keep ≥ 80 px between the column's longest line and the object's silhouette at its largest. Don't run the same text-left / object-right layout on every beat: move the column or centre the payoff.
- **A world moving under a headline** (a pull-back, a truck, lanes or rows sliding through the frame): type never collides with it mid-move. Route the moving parts out of the headline band (lay the world out so nothing travels through the line's box plus 40 px); if something must pass, fade it under a **feathered knockout** (a ground-coloured plane or mask with a ≥ 40 px soft edge) instead of a hard-edged patch, because a line that stops dead at an invisible box reads as a collision. Labels inside the moving world exit before the move or land after it settles; world text that shrinks below 28 px in a pull-back is drawn as bars (below).
- 9:16 (1080×1920): everything readable inside x 120–840, y 270–1210 (the platform UI superset); headlines 2–4 words a line, 64–132 px; the hook just below the top band (y 270–450).
- 1:1 and 4:5: 5–8% margins; 4:5 keeps key words inside the centre 1080×1080.
- Scale a whole block to fit with `fitBlock()` only as a last resort; re-breaking lines per aspect is better than shrinking.

## Recipes

All in `references/reveals.md`, compiled and captured:

| Recipe (numbers from `motion-language`) | Kit move |
| --- | --- |
| blurUp by word: 12f outCubic, 3f stagger, blur 10 → 0 | `line()`, `setLabel({ opacity, blur })`, y offset |
| riseMask: 13f outQuart, stagger 4f | `setLabel({ maskY })` at `y − maskDepth(text, style) * PX`: under the descenders |
| Per-character title with colour sweep | `letters()`, tint lands 1.6× slower than the move |
| Wordmark: tracking +0.32 → +0.01em over 15f outQuad (uppercase: → +0.08 to +0.16em), letters rising through a mask under the word's lowest ink (`maskDepth`: under the caps only when the word has no descender); or written in by a wipe | `letters().track(em, "left")` per frame, `setLabel({ maskY })` or `setLabel({ maskX, maskSoft })` |
| L→R sweep, two-pass ink | tint per word, 2f apart; grey → ink 5f later |
| Typewriter: 2–2.4 f/char, caret solid while typing | `letters()` visibility by index + a caret plane |
| Word-slot flip: −96° out, +92° in, slot morphs 14f | pivot on the baseline, `rotation.x`, measured slot widths |
| Scatter pops, beat cards | stepped opacity, no tween on the beat |
| Highlight block, pen underline | a plane scaled from its left edge; a stroke (`three-look`) |
| Count-up 40–48f / 120–210f, land punch 1.06 | `counter().set()`, group scale |
| Captions, karaoke | phrase planes on the camera overlay; `kick()` pops |
| Glow-resolve (social cards on dark): blurUp 12f + an additive halo copy 1 → 0.45 at 16 px | a second `label` per word with 48 px blur room, `AdditiveBlending`, a hair behind |
| Smear-in (one punch word): scale x 1.5 → 1 from the reading side, horizontal blur 14 → 0, 9f | `label(…, "left")`, the `uBlur` uniform set on x only |
| Rebus slot: a glyph at cap height inside the line, a stack rolling 3–5f per item, slowing on the last | `label`s either side of a square glyph plane (or a `three-look` coin or icon), laid out around the slot |

## Captions

Two specs, by job:

- **Social captions over footage** (feed edits, UGC, podcast clips, Gen Z): `ugc-craft`'s caption spec is the one spec (word groups, size, heavy weight with a stroke or scrim, active-word highlight); the house guide sanctions it as the exception to the weight cap. Build it with this kit (one `label` per group, drawn in the shipped font inside `withFonts`, never a family name alone).
- **Editorial captions and subtitles** (explainers, launch films, anything designed rather than shot): one phrase of 2–5 words at a time, cut on phrase boundaries from the VO's word timings (`transcribe`), no tween between phrases; legible as or before the word is spoken, held ≥15f after it. 16:9: 34–48 px, weight 400–500, bottom of the block ≥ 8% above the frame edge. 9:16: block centred 58–63% down (y ≈ 1110–1210), 48–72 px.
- Both sit on the camera-locked overlay (`three-camera` `overlay()`), so a punch-in or shake never moves them, wrapped in `onTop(group, 920)` (above world type; 960 if a flood passes under them). On footage or anything busy, a scrim plane at 0.5–0.6 opacity behind them.

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
    const head = line("Ship the whole film", TYPE.hero);   // wrap in onTop(head.group) if 3D objects share the frame
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
| Soft-light SaaS | blurUp by word, 96–120 px, 500; UI text drawn inside the UI canvases, ≥28 px where it is seen (zoom in rather than shrink) |
| 3D product hero | Headlines 110–130 px at −0.03em, 500; a single slammed word or number may go larger as the image-word; one punch word in the second colour; type over the 3D objects in `onTop()` |
| One-shot film | Words carried in from 170 px right, 3.6f apart, colour band sweeping each line |
| Whiteboard | Hand-written text revealed left to right by a soft x-wipe in its shader, 8–18f by width; left column at a 140 px margin |
| Music video | Karaoke lines, sung word flashing the accent |
| Milestone | `counter` with land punch; label above it in muted |
| Social title-card launch (K) | One card of 2–4 words, 72–110 px (≥ 90 in a feed), glow-resolve by word, one accent word in a lighter tint of the accent, a smear-in for the punch word, a rebus slot when the noun has a glyph; captions beside tilted UI two-tone (key words ink 500, rest muted 400) |

## Anti-patterns

- **Redrawing a canvas in the frame callback.** Draw once; animate mesh transforms, opacity and tint.
- **A font named but not shipped.** The preview on a Mac looks right; the export does not.
- **Scaling a small label up.** Soft edges. Draw at the size it is seen.
- **`MeshStandardMaterial` for type.** Lit type darkens on one side; a tone-mapped `MeshBasicMaterial` shifts the brand hex. Use the kit's shader (or `MeshBasicMaterial` with `toneMapped: false`).
- **Per-character animation on a sentence**, or a stagger so long the first word has settled before the last appears.
- **Tilted or receding type the viewer must read.** Keep text planes parallel to the screen unless the tilt is the point.
- **Type on footage without a scrim.**
- **A counter in a face's default proportional figures**: "$1,211" reads "$1, 2 1 1". Tabular figures on, or `"proportional"` slots.
- **A line nested in a group without `onTop`**: it sorts under whatever its group's order is (0), and a flood or panel covers it.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Font files in the project | `save-asset` the brand's woff2, or Inter's from the rsms/inter GitHub URL above, into `assets/` | Any OFL woff2 already on disk; else the kit falls back to the system sans: say so to the user |
| Caption timing | `transcribe` on the VO | Time phrases by ear from the script at the VO's words per minute |
| Checking legibility | `capture-frames` mid-reveal and on the held line | None |
| Text motion numbers | `motion-language` | — |

## Checks before you finish

1. `capture-frames` on every held line: the face is the brand font (not a fallback sans), edges crisp, nothing under 28 px, no headline heavier than 500.
2. Per-character words (`letters()`) at full resolution: no overlapping or gapped glyph pairs (look at a T, V, W or Y next to a lowercase letter). Mid-reveal frames of uppercase display type show no grey, half-opaque capitals. A counter mid-count shows no leading zeros, and a value with 1s in it (1,211) is evenly spaced: no wide gap either side of a 1.
3. A frame where a 3D object passes the type: the type stays in front. A frame where a cover, flood or panel overlaps type: the type is on the side of it you intended (each group went through `onTop` with its layer's order).
4. One frame per shipped aspect: no word outside the safe zone for that aspect; 9:16 captions sit 58–63% down. During every camera or world move, a 4 fps strip of the move shows nothing crossing or abutting a visible word (no line ending at a hard invisible edge beside it), and rise-masked words show their descenders whole.
5. Mid-reveal frame of each recipe: blur and colour sweep visible, no word clipped by its plane edge.
6. Every line is fully legible by 15–20f after its first word, and holds `max(30, 9 × words + 15)` frames once legible.
7. Every text plane is named after its words; no canvas is drawn inside a frame callback.
8. No randomness or wall-clock timing in any scene or component; `validate` passes.
