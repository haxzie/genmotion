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

1. **Do you have the logo file?** SVG is best, a large PNG is fine. Never redraw a mark from memory or a description: slightly wrong is worse than absent.
2. **Where is it used: before videos, after them, as a loop, or over other footage?** It decides the length, the ending and whether a key-colour version is needed.
3. **How should it feel?** Offer two options with a recommendation (for example "precise and calm" with no overshoot, or "playful" with one 6–10% overshoot).

## Pick the shape

| Shape | What happens | Wins when | House device |
| --- | --- | --- | --- |
| **Build** | Pieces assemble into the mark: strokes drawing on, tiles rolling, letters arriving | A geometric or modular mark that reads mid-assembly | Brand grid: 7 cells roll like a slot machine (one face every 24f, each roll 11f inOutCubic, cells 3f apart), the wordmark rises 22f outSmooth (y 22 px) |
| **Reveal** | The mark is there but hidden; something uncovers it: a mask, a light sweep, an iris | A simple mark that needs no explaining | Nike guide: the swoosh clip-draws over 16f outSmooth with a 26 px lift |
| **Transform** | Something else becomes the mark: a shape morphs, a UI element or the film's motif resolves into it | The film or the brand already has a motif that can plausibly become the logo | Codex: the writer blob swells and resolves into the mark; Gojiberry: a camera slam into a word, white flash, the mark pops |

Pick one. A sting that builds, then reveals, then transforms is three stings.

## Direction defaults

- **Style family**: I (brand identity loop) by default: the brand's own colours on a plain field, a visible grid only if the brand uses one. C (3D product hero) for an extruded, glossy mark in a Three.js project. A (beat-cut) for a hype bumper cut to a track.
- **Energy curve**: anticipation (3) → **hit (10) at 40–60% of the length** → settle and hold (4). The 10–20f before the hit are the quietest: the riser is the only thing growing.
- **Transitions**: none inside a sting; for an outro, the incoming film's last element persists into the build (transform shape).
- **Sound**: the sonic logo, about 3 s: whoosh or riser into the lock (0.5–1.5 s) → impact on the settle frame → a 2–4 note tonal button → shimmer tail 1–1.5 s. No VO, no bed.
- **Memorable moment**: the lock frame itself: the last piece arrives, the hit sounds, everything stops.

## Frame budgets

| Length | Anticipation | Build / reveal | **Lock (hit)** | Tagline | Hold to end |
| --- | --- | --- | --- | --- | --- |
| 2 s bumper (60f) | — | 0–15 | **15** | — | 15–60 (45f) |
| 3 s (90f) | 0–12 | 12–40 | **40** | 52–64 (12f blurUp) | 40–90 (50f) |
| 5 s (150f), default | 0–40 | 40–72 | **72** | 90–102 | 72–150 (78f) |
| 8 s intro (240f) | 0–90 | 90–120 | **120** | 140–152 | 120–240 (120f) |

- The hold after lock is ≥45f (1.5 s) at every length. It is the only frame anyone remembers. The one exception is a beat-cut bumper inside a music film, where 10–30f is the style.
- A reveal that takes more than 2 s (60f) starts to feel like a wait; a build may run 3–4 s if every step reads.
- Past 8 s it is no longer a sting but a title sequence: use `freeform-video`.

## Mark craft

- **Size**: the mark's larger dimension is 25–40% of the frame's short edge (270–430 px tall on 1920 × 1080; up to 60% of the width on 9:16, centred at 40–45% of the height). Clear space on every side ≥ the mark's cap height, or the brand's own clear-space rule.
- **Real geometry**: copy the SVG paths verbatim. Recolour only to the brand's documented variants (full colour, one-colour, reversed).
- **Landing ease**: marks land on the **gentle spring** (no overshoot) over 14–20f, scale 0.72–0.9 → 1, or a long-tail ease-out (outQuart or outExpo). Overshoot (1.06, outBack c1 1.28) only when the user chose playful, and only on the lock.
- **Wordmarks**: letters 1.4–2f apart, each 4–10f; or a tracking close from +0.32em to the final tracking over 15f outCubic while the letters fade up (Gojiberry's wordmark).
- **During the build**: one secondary micro-motion at most (a light sweep, a few particles that converge); everything converges toward the lock frame, nothing arrives after it.
- **After lock**: one ambient behaviour at most: a breathe of ≤1.5% scale at 0.2 Hz, or a camera creep ≤2%. **Freeze completely** when the sting will be cut into another film or looped, because the next shot or the loop point must match a still frame.
- **Tagline**: enters once, ≥10f after the lock, blurUp 12f, ≤5 words, and holds to the end.

## The sonic logo

| Cue | Lands | Level |
| --- | --- | --- |
| Riser or whoosh | `startFrame = lock − riserLength`, so it **ends on the lock frame** | 0.55–0.6 (−5 to −4.4 dB) |
| Impact | the lock frame ±1f (33 ms), layered: a 2–5 kHz transient + a 100–500 Hz body | 0.9 (−0.9 dB) |
| Tonal button | 0–4f after the impact: 2–4 notes or a chord | 0.6–0.8 |
| Tail | shimmer or reverb, 1–1.5 s, decaying to silence before the last frame | — |

Generate with `sfx` or `music`, describing the sound, not the picture: "a short rising whoosh into a solid low hit with a bright three-note synth chime, ending in a soft shimmer, 3 seconds, one-shot, no music". Generate 2–3 takes and pick by ear on the lock frame. No sub drop if the sting precedes speech. For a loop, the tail must reach silence before the loop point.

## Directed example: 5 s ident, music-free, 16:9

```markdown
## Direction
SMP: Small pieces, one system.
Idea: We show the modular mark as tiles that roll into place like a slot machine settling.
Style family: I brand identity loop — the mark is modular, the grid is the brand
Energy curve: 3 (tiles idle) → hit 10 at frame 72 → 4 hold
Sound: sfx-led — tile clicks 0.45 alternating lanes, riser 0.55 from 42 to 72, impact 0.9 on 72, three-note chime from 74, tail to 135
Memorable moment: 64–72 — the last three tiles land 3f apart and the wordmark locks on the hit

## Beats
| # | Frames | Job | On screen | Sound cue |
| 1 | 0–40 | Anticipation | 7 tiles roll one face every 24f, 11f per roll | Clicks per roll |
| 2 | 40–72 | Build | Tiles land centre-out 3f apart; wordmark rises 22f outSmooth | Riser 42–72 |
| 3 | 72 | Lock | Everything still | Impact + chime |
| 4 | 90–102 | Tagline | "Build anything" blurUp 12f | — |
| 5 | 102–150 | Hold | Frozen (it precedes other videos) | Tail decays by 135 |
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

- Bad: the logo fades in over 1 s, a whoosh plays somewhere near it, the logo drifts and shimmers forever. Good: four strokes draw on 3f apart, the last one locks on frame 72 with the impact on 72, the tagline rises at 90, nothing moves after.
- Bad: a redrawn approximation of the mark in brand-ish blue. Good: the user's SVG, paths copied verbatim, in the documented colour.
- Bad: "transparent version attached" (an MP4 that is black around the logo). Good: a key-colour MP4, a keyed ProRes 4444 file, and a note on how to use each.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The real mark | `save-asset` the logo file | Ask for it; never redraw |
| Brand colours, clear-space rules | `web-research` on the brand's site or guidelines | Ask the user rather than guessing |
| The sonic logo | `sfx` or `music` | Credited CC0 hits; silence only if the sting sits inside an already-scored film |
| Placing the sound | `place-audio` | Edit the project's audio list by hand |
| Alpha version, measuring | `ffmpeg` | Deliver the key-colour version and say it needs keying |
| Seeing it | `capture-frames` | None |
| Direction, moves, mix | `direction`, `motion-language`, `sound-design` | — |

## Checks before you finish

1. `capture-frames` on the lock frame and the last frame: the mark is exact (paths, colours, proportions match the file), unclipped, with clear space ≥ its cap height.
2. The mark's larger dimension measures 25–40% of the frame's short edge on the lock frame.
3. The lock sits at 40–60% of the length; capture lock −1, lock, lock +1: the last piece arrives exactly on the lock frame.
4. The hold after the lock is ≥45f; capture lock +15 and the last frame: identical except the one allowed ambient behaviour (and identical outright for a freeze, loop or overlay version).
5. The impact's onset is within 1 frame of the lock frame: compare the cue's start frame on the timeline with the lock constant the animation uses.
6. The tail decays to silence before the last frame of a loop; the loop's first and last frames match.
7. Overlay version: the key colour appears nowhere inside the mark; the keyed file shows a clean edge over black and over white.
8. `ebur128` on the export: true peak ≤ −1 dBTP (a sting is short, so integrated loudness reads unreliably; check the impact does not clip with `volumedetect`).
9. The `direction` self-critique passes; `validate` passes.
