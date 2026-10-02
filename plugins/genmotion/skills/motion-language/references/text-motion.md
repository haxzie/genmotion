# Text motion: kinetic type recipes and reading time

The type moves GenMotion's templates use, with exact numbers, plus the reading-time rules every one of them must obey. Frames at 30 fps. Read it when a scene puts words on screen and you are choosing how they arrive, hold and leave.

Contents: 1 Reading time first · 2 Choosing by role · 3 Recipes · 4 Holds on text · 5 Emphasis · 6 Numbers · 7 Building on each engine · 8 Text anti-patterns

---

## 1. Reading time first

A move that makes text unreadable is wrong however good it looks. These rules come before any recipe.

- **Hold** from the frame the line is fully legible (the entrance does not count): `max(30, 9 × words + 15)` frames, and at least 2 frames per character (15 characters per second). A 1–3 word line in a rapid sequence may hold 18f; shorter than its formula, it is texture, not message.
- **Read it twice**: if you cannot read the line twice during its hold, it is too fast.
- **Staggers stay short**: the whole line should be legible within about 15–20f of its first word arriving. Word stagger × word count ≤ ~18f; for long lines, animate by line instead of by word.
- **By word or line for anything over 3 words.** Per-character animation is for 2–3 key words in the whole film (a title, the product name, a wordmark).
- **Order of arrival = order of importance**. The first thing to appear is what the viewer reads first.
- **VO-mirrored text** is legible before or as the word is spoken, and holds ≥15f after it.
- **Words on screen at once**: ≤7 in feed formats, ≤12 in explainers.

## 2. Choosing by role

| Role | Default recipe | Why |
| --- | --- | --- |
| Hero headline | blurUp by word, or riseMask | Confident arrival, readable fast |
| Sub line, body | fadeUp by line, 12f, small travel | Supports, never competes |
| Eyebrow / label | fadeUp by word, stagger 2, 10f | Quick, small |
| Product name, title card | Per-character with a colour sweep | One of the 2–3 per-character moments |
| Swapping one word in a sentence | Word-slot flip | Keeps the sentence still, changes the noun |
| Replacing a whole line | Mask push-up | One continuous upward pass |
| Introducing a name | Typewriter delete | "Introducing" → the name, in the same slot |
| Hype / beat-cut | One word per card, no tween | Rhythm is the motion |
| Scattered words, collage | Scatter pops | Tactile, lively |
| Lyrics, karaoke | Line-in, sung-word flash | Timed to the voice |
| Wordmark | Letters 1.4–1.5f apart with tracking tightening | A signature landing |

## 3. Recipes

### blurUp (the house default)
- By word. Duration 12f (12–14) outCubic, stagger 3f (hero 3–4, sub 2, slow slide-ins 5).
- From y +0.5em (10–34 px), blur 10 px → 0 (heavy display type 14–34 px), opacity reaching 1 by about 35% of the move so the word is readable while it settles.
- Exit: 6–8f inCubic, y −10 to −20 px, blur up to 10, all words together or stagger 1–2f.

### riseMask
- Words rise from below an invisible baseline mask: y 100% → 0 of the line height, 13f outQuart, stagger 4f. No blur needed: the mask edge is the effect.
- Hold: float or breathe on the whole line.

### Mask push-up (line → line in one slot)
- The old line's words leave **up out of their own mask**: 12f outQuart, stagger 4f.
- The new line rises into the same slot starting 4f after the old one begins to leave.
- The old line can also leave last-word-first (stagger 5f, 12f, +460 px, blur 5) for a "carried off" feel.

### Word-slot flip (swap one word)
- Old word: rotate X 0 → −96° over 10f inOutCubic (pivot on its baseline).
- The slot's width morphs to the new word's width over 14f, so the rest of the sentence slides smoothly instead of jumping.
- New word: flips up from +92° → 0 over 13f, then breathes.
- Cycling chip: a new word every 24f, a 12f flip, the width morph on each; collapse after the last (20f).

### Per-character title
- Stagger 1.2–1.6f per character, each 8–16f outSmooth, blur 13 → 0, y 46 → 0.
- Optional colour sweep: each character starts in a light tint (e.g. #9ec5f4) and reaches ink over 1.6× its own move, so a colour front travels across the word.
- The line exits on an accelerating ease (bezier 0.5, 0, 0.88, 0.2) upwards.

### Colour sweeps and inking
- **L→R sweep**: each word reaches its final colour 2f after the previous one (6f each).
- **Two-pass ink**: words appear grey (un-inked, e.g. #b9bcc6) and ink 5f later, so the line "lands" twice.
- **Colorama band**: a 520 px gradient band (light orange → deep orange) sweeps each line inOutSine and leaves the final colour behind.

### Typewriter
- UI and search fields: 2–3 frames per character, finishing about 4f before the send/press.
- Captions that type: 0.8–0.85 characters per frame (fast, legible as a whole).
- Terminal / code: about 12 characters per second behind a block caret.
- The caret is a shaped element, **solid while typing**, blinking only when idle (8f period, or 16f on / 16f off for iOS-style).
- Reserve the full string's width invisibly before typing starts, so nothing reflows. Open layout slots 6–12f before their content.
- Delete: ≈2.1 f/char, or a 6f inOutCubic wipe-back.

### Scatter pops
- One word every 6f at scattered positions.
- Each pop is 4f outCubic, scale 0.9 → 1, opacity stepped 0 / 0.5 / 1 (a two-frame pop, deliberately not smooth).
- Hard word pops for a punch line: opacity over 2f, stagger 7–8f.

### One word per card (beat-cut)
- No tween: the card is simply there on the beat.
- Holds are multiples of the musical unit (at 90 BPM an eighth note is 10f: holds 5–15f; countdown digits 30f).
- Accent cards: a 2-frame strobe of solid foreground colour, inverted colours, the biggest size.
- A micro-settle variant: the line hard-cuts in at scale 1.06 and settles to 1 over 12f; words grow +0.12% per frame while held.

### Words carried in from the side (one-shot style)
- Words arrive from 170 px right, 3.6f apart, 24f each, outQuint.
- Exit per word 1f apart, 12f inQuad, up 70 px.

### Karaoke / lyrics
- The line enters 0.15 s (≈5f) before its first sung word: 7f easeOut, from y −30.
- Words appear 0.035 s (≈1f) apart, scale 0.8 → 1, in a muted colour.
- The sung word flashes the accent, pops to 1.16 with a decaying wobble, and fades toward white.
- The line grooves y + beat pulse × 6 px. It leaves over its last 0.2 s (6f) easeIn, +24 px.

### Wordmark landing
- Letters 1.4–1.5f apart, 4f each, while tracking tightens from +0.32em to +0.01em over 15f outCubic. Then the mark slides in beside it over 8–9f.
- Because each letter is placed individually with computed positions, the tightening never reflows anything.

### Caption grows into a headline
- A typed caption (30 px) grows to headline size (96 px) over 12f inOutCubic, then breaks into scatter or settles.

### Underline and highlight
- A pen underline draws along its stroke over 12f, starting 12f after its phrase is legible.
- A highlight block sits behind the word and scales x 0 → 1 from its left edge over 10–14f outCubic.

## 4. Holds on text

| Behaviour | Numbers | Use |
| --- | --- | --- |
| Float | y ± 2–4 px at 0.25 Hz | Headlines, lines |
| Breathe | scale ± 0.4–1.5% at 0.2 Hz | Numbers, a single hero word |
| Wave | ± 6 px at 0.5 Hz, phase −0.6 per word | Playful only, short holds |
| Shimmer | opacity −14% at 0.6 Hz | A highlighted word |
| Glow | glow radius 6–12 px at 0.3 Hz | Dark themes, one word |
| Grow | +0.12% scale per frame | Beat-cut words, slow push feel |

- One behaviour per line, with **one shared phase** across the line (per-word phase breaks the baseline), except the deliberate wave.
- No per-letter wobble on holds: a single slow drift on the whole line.
- Often the better hold is the camera's 4 px drift, with the type itself still.

## 5. Emphasis

- One emphasised word per line: the accent colour, a heavier weight, or a size step. Never all three, never two emphasised words.
- The film's punch colour appears on one word in the film's most important line, not on every line.
- Emphasis gradient text by character (warm orange → amber) for one phrase at most.
- The brand accent is for fills, rules, glows and display type. Under 60 px it may carry a short label only if it clears 4.5:1 on its ground; a low-contrast accent (< 4.5:1) never carries small text.

## 6. Numbers

- Tabular figures, so digits don't shuffle as they change.
- Small stats count over 40–48f; a hero number over 120–210f, outCubic, so it slows into the landing. Stats in a row stagger 10f.
- Land punch: 1 → 1.06 over 5f, back to 1 over 13f (outCubic). Celebration (confetti, poppers, a ring) within ±2f of the land frame.
- A chart or bar tied to the number draws on the **same** eased progress, so both settle on the same frame.
- A slot-machine list spin lands with `1 − (1 − u)^3.6` over 4.5 s for a long, readable landing.
- Hold the final number ≥30f (a hero number 90–120f), breathing 0.4–1.5%.

## 7. Building on each engine

- **Three.js**: every word or character is its own plane with a canvas texture from the shared label helper (`three-type`); animate the meshes, never redraw the canvas per frame.
  - **Blur**: pre-render the word at 3–4 blur levels (0, 4, 8, 12 px) once in the builder and cross-fade between them as the entrance resolves, or use a blur `ShaderMaterial` on the plane. If neither is worth it, substitute opacity + a 2–4% scale settle, and keep the rise.
  - **Masks** (riseMask, push-up): a clipping plane on the text materials (local clipping enabled on the renderer), or an occluder plane in the background colour just in front of the text's lower edge.
  - **Flips**: `mesh.rotation.x` with the geometry translated so the pivot sits on the baseline.
  - **Tracking and slot widths**: measure glyph and word widths once in the builder (canvas `measureText`), then position planes from those numbers.
  - **Colour sweeps**: tint each plane's material colour per frame (`material.color.lerpColors(light, ink, t)`) with a white texture.
- **HyperFrames / React**: spans per word or character with transforms and filters; never CSS transitions; never animate letter-spacing on wrapped text (it reflows); reserve width for typed strings.

## 8. Text anti-patterns

- Every line arriving with the same 20 px fade-up: pick recipes by role (§2).
- Per-character animation on a sentence: by word or line.
- Text leaving as the VO finishes saying it: hold ≥15f past the spoken word.
- An exit longer than the entrance: exits are about 0.6× the entrance.
- Bouncy overshoot on text baselines: overshoot belongs on buttons and badges; text settles.
- A stagger so long the first word has faded in before the last has started: keep the line inside ~18f.
- Reflow during typing or during a word swap: reserve widths, morph the slot.
