---
name: brand-sting
description: "The logo sting, bumper, ident or brand reveal: 2 to 8 seconds, no narration, one mark arriving. Covers the three shapes (build, reveal, transform), the sting energy curve with the hit at 40 to 60 percent, frame budgets for 2, 3, 5 and 8 second stings, mark size and clear space, the landing ease and what may move after lock, house devices with timings, the riser-hit-button-tail sonic logo, loop and overlay variants with an honest note on alpha, and frame-exact checks. Load it for a logo animation, intro or outro bumper, or a stronger closing lockup."
---

# Brand sting

The shortest thing in the pack and the least forgiving: one mark, arriving well or badly, in a few seconds, with nothing to hide behind. A sting is half motion and half sound; the hit has to land on the frame the mark locks. Frames at 30 fps. Read `direction` first; moves come from `motion-language`, the sonic logo from `sound-design`.

## When to use

- "Logo animation for our brand", an intro or outro bumper, a channel ident, a reveal for an event screen, a looping lockup.
- The closing lockup of a `launch-playbook` or `announce-*` film that needs to be built properly instead of a fade.

Another owner fits better when:

| The ask is really | Owner |
| --- | --- |
| A launch narrative that ends on the logo | `launch-playbook` |
| A brand guidelines film (palette, type, applications) | `freeform-video` with style family I |
| A long title sequence for a talk or event (over 8 s) | `freeform-video` |

## Ask first

1. **Do you have the logo file?** SVG is best, a large PNG is fine. Never redraw an existing mark from memory: slightly wrong is worse than absent.

**No logo file** (the one policy; `launch-playbook` and `three-assets` follow it too):

- Default: **set the name as a wordmark** in the brand's face (or the house face, Inter 500), and build the sting on it. That is never wrong.
- The user *described* a mark (a new studio with no file yet, "a star that is also a compass needle") and said "just make it": you may build a **stand-in** from geometry to that description. Keep it in one file (`components/brand.ts`) so the real file replaces it 1:1, write it under "I assumed" in `VIDEO.md` as "stand-in mark built from your description, not your logo", and ask for the real file in your reply before anyone ships it.
- A known brand whose logo exists somewhere: never draw it; ask for the file, and use the wordmark meanwhile.
- Never call anything you built "the logo".
2. **Where is it used: before videos, after them, as a loop, or over other footage?** It decides the length, the ending and whether a key-colour version is needed.
3. **How should it feel?** Offer two options with a recommendation (for example "precise and calm" with no overshoot, or "playful" with one 6–10% overshoot).

## Pick the shape

| Shape | What happens | Wins when | House device |
| --- | --- | --- | --- |
| **Build** | Pieces assemble into the mark: strokes drawing on, tiles rolling, letters arriving | A geometric or modular mark that reads mid-assembly | Brand grid: 7 cells roll like a slot machine (one face every 24f, each roll 11f inOutCubic, cells 3f apart), the wordmark rises 22f outSmooth (y 22 px) |
| **Reveal** | The mark is there but hidden; something uncovers it: a mask, a light sweep, an iris | A simple mark that needs no explaining | Nike guide: the swoosh clip-draws over 16f outSmooth with a 26 px lift |
| **Transform** | Something else becomes the mark: a shape morphs, a UI element or the film's motif resolves into it | The film or the brand already has a motif that can plausibly become the logo | Codex: the writer blob swells and resolves into the mark; Gojiberry: a camera slam into a word, white flash, the mark pops |

Transform has two extra rules. The thing before the mark must **read as itself on a still frame** (a compass needle is one continuous needle with a hub, not two spikes pinched at a point; check one frame at full resolution). It must also read **as what it means**: a compass needle needs polarity (the north end solid or bright, the south shaded or outlined), or "finds north" cannot be seen. And the moment it starts becoming the mark needs a **trigger beat**: a click, a glint, a snap to position, with its own sound. The trigger is the first frame of the build, never followed by a pause.

Pick one. A sting that builds, then reveals, then transforms is three stings.

## Direction defaults

- **Style family**: I (brand identity loop) by default: the brand's own colours on a plain field, a visible grid only if the brand uses one. C (3D product hero) for an extruded, glossy mark in a Three.js project. A (beat-cut) for a hype bumper cut to a track.
- **Background**: the brand's hex, exact at the frame's centre and corners on the export (±2 levels). No vignette, no grain (`three-look`'s brand-identity row). A lift, if any, is a declared tint of the brand's own colour.
- **Energy curve**: anticipation (3) → **hit (10) at 40–60% of the length** → settle and hold (4). **The breath is inside the build**: in the 6–10f before the lock, motion slows and the sound thins (the riser is the only thing growing), but something is always progressing. A still beat *before* the build is a stall, not a breath.
- **Frame 0 is already moving**: the anticipation's motion has started by frame 15 (a ring part-drawn, a needle mid-swing), and it fills a deliberate part of the frame (the subject spans at least 15% of the short edge), not a speck in a large dead field. Fill it with **motion**, not size: never start oversized and pull out, because a shrinking, calming subject drains the energy the build needs. The anticipation's energy rises into the trigger (a swing that tightens and quickens, a sweep that accelerates), and the build's first 10f change more than the anticipation's last 10f.
- **Transitions**: none inside a sting; for an outro, the incoming film's last element persists into the build (transform shape).
- **Sound**: the sonic logo, about 3 s: whoosh or riser into the lock (0.5–1.5 s) → impact on the settle frame → a 2–4 note tonal button → shimmer tail 1–1.5 s. No VO, no bed.
- **Memorable moment**: the lock frame itself, and it must be a **picture** event, not only a sound: the last piece arrives with an outCubic (not easing to nothing over 20f), a facet glint 6–10f long peaks on it, or a 1–2f flare. Even a calm sting has one; calm decides its size, not its absence. lock −1 → lock is the largest visual change of the last 10f.

## Frame budgets

| Length | Anticipation | Build / reveal | **Lock (hit)** | Tagline | Hold to end |
| --- | --- | --- | --- | --- | --- |
| 2 s bumper (60f) | — | 0–15 | **15** | — | 15–60 (45f) |
| 3 s (90f) | 0–12 | 12–40 | **40** | 52–64 (12f blurUp) | 40–90 (50f) |
| 5 s (150f), default | 0–36 | 36–72 | **72** | 90–102 | 72–150 (78f) |
| 8 s intro (240f) | 0–90 | 90–120 | **120** | 140–152 | 120–240 (120f) |

- **Anticipation** is continuous motion (a search, a swing, tiles rolling), never a settle followed by a wait. If it contains a damped swing, its last visible swing is where it ends (`motion-language`: amplitude under 1°, checked on a frame strip), so plan the build to start there.
- **Build** is ≥30f with its moves **staggered** across it (for example: arms extend 36–56, the lockup slides 46–66, the name tracks in 56–72), never four moves stacked into the last 15f.
- The hold after lock is ≥45f (1.5 s) at every length. It is the only frame anyone remembers. The one exception is a beat-cut bumper inside a music film, where 10–30f is the style.
- A reveal that takes more than 2 s (60f) starts to feel like a wait; a build may run 3–4 s if every step reads.
- Past 8 s it is no longer a sting but a title sequence: use `freeform-video`.

## Mark craft

- **Size**: the symbol's larger dimension is 25–40% of the frame's short edge (270–430 px tall on 1920 × 1080; up to 60% of the width on 9:16, centred at 40–45% of the height). Clear space on every side ≥ the mark's cap height, or the brand's own clear-space rule.
- **Horizontal lockup** (symbol + name side by side): the whole lockup is 55–70% of the frame width, the wordmark's cap height is 0.3–0.4× the symbol's height, and the gap between symbol and name is about 0.25× the symbol's height (0.75–1× the cap height). Centre the lockup optically as one unit, not the symbol. When the ranges collide (a long name such as a 9-letter uppercase wordmark), **lockup width wins**: keep it at 55–70%, take the symbol to 25–28% of the short edge, and set the wordmark one weight heavier (500 rather than 400) so it holds its own beside a dense symbol. A tracking-close on the wordmark anchors at the edge nearest the symbol, so the letters never travel into the gap.
- **Real geometry**: copy the SVG paths verbatim. Recolour only to the brand's documented variants (full colour, one-colour, reversed).
- **Landing ease**: marks land on the **gentle spring** (no overshoot) over 14–20f, scale 0.72–0.9 → 1, or a long-tail ease-out (outQuart or outExpo). Pieces that must visibly arrive *on* the lock frame land with outCubic: a long tail reads as arriving several frames early. Overshoot (1.06, outBack c1 1.28) only when the user chose playful, and only on the lock.
- **Wordmarks**: letters 1.4–2f apart, each 4–10f; or a tracking close from +0.32em to the final tracking over 15f outCubic while the letters fade up (Gojiberry's wordmark). An uppercase wordmark settles at +0.08 to +0.16em (sentence-case ones at −0.01 to −0.03em); sizes and kerning per `three-type`.
- **Nothing passes through the type**: a symbol gliding to its lockup slot must not cross the wordmark's slot while the name is visible. Move the lockup as **one group** (symbol + name), so the name rides in beside the symbol; or bring the name in only after the symbol has cleared its slot.
- **During the build**: one secondary micro-motion at most (a light sweep, a few particles that converge); everything converges toward the lock frame, nothing arrives after it.
- **After lock**: exactly one ambient behaviour, never fully static (the house standard): a creep of ≤1% scale over the hold, or a breathe of ≤1% at 0.2 Hz. A hard cut into unrelated footage keeps it. Deliver a frozen-tail variant only when the user asks for one (a matched handoff into a specific shot); a loop handles its ends with the unbuild below.
- **Tagline**: enters once, ≥10f after the lock, blurUp 12f, ≤5 words, and holds to the end.

## The sonic logo

| Cue | Lands | Level |
| --- | --- | --- |
| Riser or whoosh | `startFrame = lock − riserLength`, so it **ends on the lock frame** | 0.55–0.6 (−5 to −4.4 dB) |
| Impact | the lock frame ±1f (33 ms), layered: a 2–5 kHz transient + a 100–500 Hz body | 0.9 (−0.9 dB) |
| Tonal button | 0–4f after the impact: 2–4 notes or a chord | 0.6–0.8 |
| Tail | shimmer or reverb, 1–1.5 s, decaying to silence before the last frame | — |

- **The anticipation has sound too** (ticks on a swing, an air bed, a soft whoosh on the search): with sound on, a sting never opens on more than 0.5 s of silence.
- **Contrast**: the impact's first 10 ms RMS is **≥8 dB above the riser's last 100 ms**, and the riser has no internal dip over 6 dB. Per-clip volumes do not guarantee this (sources are normalised differently); measure it (`sound-design`'s `references/sfx-cues.md`) and pull the riser down 6–8 dB at its top if it fails.

Generate with `sfx` or `music`, describing the sound, not the picture: "a short rising whoosh into a solid low hit with a bright three-note synth chime, ending in a soft shimmer, 3 seconds, one-shot, no music". Generate 2–3 takes and pick by ear on the lock frame. No sub drop if the sting precedes speech. For a loop, the tail must reach silence before the loop point.

## Directed example: 5 s ident, music-free, 16:9

```markdown
## Direction
SMP: Small pieces, one system.
Idea: We show the modular mark as tiles that roll into place like a slot machine settling.
Style family: I brand identity loop — the mark is modular, the grid is the brand
Energy curve: 3 (tiles idle) → hit 10 at frame 72 → 4 hold
Sound: sfx-led (riser texture matched to the Feeling: a filtered or tonal swell for calm, a noise riser for energetic) — tile clicks 0.45 alternating lanes from frame 0, riser 0.55 from 42 to 72, impact 0.9 on 72 (≥8 dB over the riser's top), three-note chime from 74, tail to 135
Memorable moment: 64–72 — the last three tiles land 3f apart and the wordmark locks on the hit

## Beats
| # | Frames | Job | On screen | Sound cue |
| 1 | 0–36 | Anticipation | 7 tiles already rolling at frame 0, one face every 24f, 11f per roll | Clicks per roll |
| 2 | 36–72 | Build | A snap on 36 starts it; tiles land centre-out 3f apart from 40; the lockup group (tiles + wordmark) rises 22f outSmooth from 50 | Riser 42–72, thinning only in 64–72 |
| 3 | 72 | Lock | The last tile and the wordmark land | Impact + chime |
| 4 | 90–102 | Tagline | "Build anything" blurUp 12f | — |
| 5 | 102–150 | Hold | 0.8% scale creep, nothing else | Tail decays by 135 |
```

## Variants

- **Outro / transform**: the film's last element (a card, a colour flood, a cursor) persists into the sting's frame 0 and becomes the first piece of the build.
- **Loop** (event screens, a site hero): the last frame equals the first. Run build → hold → unbuild (the build reversed at 0.6× its duration, ease-in) → the same empty frame; every ambient cycle divides the loop length exactly.
- **Overlay over other footage**: GenMotion's exports (MP4, WebM, MOV) carry **no alpha channel**, so a transparent sting cannot be rendered directly; say so before promising one. Deliver: (a) a version on a flat key colour that appears nowhere in the mark (#00FF00 for most marks, #0000FF for green ones), built with no glow, blur or motion blur crossing the mark's edge; and (b) an alpha file keyed from it with `ffmpeg`:

  ```
  ffmpeg -i sting-key.mp4 -vf "colorkey=0x00FF00:0.25:0.05,format=yuva444p10le" -c:v prores_ks -profile:v 4 sting-alpha.mov
  ```

  Check the edge on a captured frame over black and over white; a fringe means the similarity value (0.25) needs raising or the mark has a soft edge that should be hardened. For marks that glow on dark, a black-background version used with a screen blend mode is often cleaner than a key.

## Building it

- **Three.js (default)**: `three-assets` loads the SVG paths (shapes or extruded geometry) and textures; `three-look` sets the stage, light and tone mapping (an extruded mark in three tones of the brand colour: face, bevel, side); `three-camera` for a slow push or an orbit of 10–30° that settles before the lock; `three-type` for the wordmark if it is set type rather than artwork; `three-transitions` for a flash or iris reveal. Clip-draw is a shader or a growing mask plane; tile rolls are planes whose UV offset follows the roll curve.
- **HyperFrames**: the SVG inline in one composition; strokes drawn with dash offsets on the timeline; the hit as an `<audio>` element at the lock time.
- **React**: the SVG as a component; `@genmotion/motion` springs (`gentle`, time-scaled to the landing length) and `interpolate` for dash offsets.

## Good and bad

- Bad: the logo fades in over 1 s, a whoosh plays somewhere near it, the logo drifts and shimmers forever. Good: four strokes draw on 3f apart, the last one locks on frame 72 with the impact on 72, the tagline rises at 90, and only a 0.8% creep moves after.
- Bad: a needle settles at f32, nothing moves or sounds until f58, then four moves cram into f58–72. Good: the needle searches until f40, snaps to north with a tick and a glint on 42, and the build runs 42–72 with its moves staggered.
- Bad: a grain-and-vignette backdrop that boils on a brand hex. Good: the brand's midnight, flat and exact at centre and corners.
- Bad: a redrawn approximation of the mark in brand-ish blue. Good: the user's SVG, paths copied verbatim, in the documented colour.
- Bad: "transparent version attached" (an MP4 that is black around the logo). Good: a key-colour MP4, a keyed ProRes 4444 file, and a note on how to use each.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The real mark | `save-asset` the logo file | The name as a wordmark; a described mark only as a flagged stand-in (Ask first) |
| Brand colours, clear-space rules | `web-research` on the brand's site or guidelines | Ask the user rather than guessing |
| The sonic logo | `sfx` or `music` | Credited CC0 hits; else `sound-design`'s synthesised placeholders (riser, impact, chime), named as placeholders; silence only if the sting sits inside an already-scored film |
| Placing the sound | `place-audio` | Edit the project's audio list by hand |
| Alpha version, measuring | `ffmpeg` | Deliver the key-colour version and say it needs keying |
| Seeing it | `capture-frames` | None |
| Direction, moves, mix | `direction`, `motion-language`, `sound-design` | — |

## Checks before you finish

1. `capture-frames` on the lock frame and the last frame: the mark is exact (paths, colours, proportions match the file, or the stand-in is flagged in `VIDEO.md`), unclipped, with clear space ≥ its cap height.
2. The symbol's larger dimension measures 25–40% of the frame's short edge on the lock frame; a horizontal lockup is 55–70% of the width and centred as one unit.
3. The lock sits at 40–60% of the length; capture lock −1, lock, lock +1: the last piece arrives exactly on the lock frame.
4. Motion has started by frame 15, the subject is not shrinking through the anticipation, and a strip of every 4th frame from 0 to the lock shows no run of more than 10f where nothing changes. The build is ≥30f with staggered moves; a Transform's precursor reads as itself on one full-resolution frame.
5. Capture every frame of the build (or a strip of every 2nd): no moving element crosses a visible word.
6. The hold after the lock is ≥45f with exactly one ambient behaviour; consecutive held frames of the export have PSNR > 45 dB (`ffmpeg -i a.png -i b.png -lavfi psnr -f null -`): the creep is there, but no grain boils.
7. Sample the export's background at the centre and the four corners on the lock frame: each within ±2 levels of the brand hex (the export's YUV conversion alone can move a dark hex 1–2 levels; if a sample sits at −2, check the source frame from `capture-frames` before blaming the look).
8. The impact's onset is within 1 frame of the lock frame: compare the cue's start frame on the timeline with the lock constant the animation uses, then on the export's waveform.
9. Sound on: no silence over 0.5 s from frame 0 (`silencedetect=noise=-50dB:d=0.5` reports no `silence_start: 0`); the impact's 10 ms RMS is ≥8 dB above the riser's last 100 ms and the riser has no dip over 6 dB.
10. The tail decays to silence before the last frame of a loop; the loop's first and last frames match.
11. Overlay version: the key colour appears nowhere inside the mark; the keyed file shows a clean edge over black and over white.
12. `ebur128` on the export: true peak between −1 and −3 dBTP, so the impact is as loud as it can safely be (a sting is under 6 s, so integrated loudness is advisory here and `sound-design`'s ±1 LU rule does not apply; if the hit peaks below −3 dBTP, raise everything together). Audio and video streams are the same length (`ffprobe` both): pad the tail with silence rather than end the audio early.
13. The `direction` self-critique passes (a sting's Hook is judged on motion by frame 15); `validate` passes.
