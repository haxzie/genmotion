# Reveal recipes on the type kit

The kinetic-type recipes from `motion-language` (`references/text-motion.md` has the numbers and the reading-time rules), written as frame-callback code over `components/type.ts` (`references/type-kit.md`) and `components/ease.ts` (`three-camera`). `D` is `durationInFrames`; `ink`, `accent`, `grey` are `THREE.Color`s built once; `tmp` is one scratch `THREE.Color`. `TYPE` is the table in SKILL.md plus the roles a recipe names: `wordmark` (the brand's face, sized by the lockup), `number` (the image-word, above 130 px), `caption` (28–48 px by spec) and `ui` (≥ 28 px where seen), all weight ≤ 500. Every `// builder` line runs inside the scene's `withFonts(ctx, [{ family: "Inter", url: interUrl }], () => { … })` builder (SKILL.md, A complete scene), so no texture is drawn in a fallback face; type that shares the frame with 3D objects is wrapped in `onTop()`. Every recipe was compiled and captured.

Contents: 1 blurUp by word · 2 riseMask and mask push-up · 3 Per-character title with colour sweep · 4 Wordmark landing (mask rise, wipe-written) · 5 Two-pass ink and L→R sweep · 6 Typewriter · 7 Word-slot flip · 8 Scatter pops and beat cards · 9 Highlight and underline · 10 Count-up · 11 Captions and karaoke · 12 Exits · 13 Glow-resolve · 14 Smear-in · 15 Rebus slot

## 1. blurUp by word (the house default)

```ts
const head = line("Ship the whole film", TYPE.hero);           // builder
head.group.position.y = 120 * PX;
// frame: 12f outCubic, 3f stagger, from y +0.5em, blur 10 -> 0, opaque by 35% of the move
head.words.forEach((w, i) => {
  const p = prog(frame, 4 + i * 3, 12, outCubic);
  const out = prog(frame, D - 14, 7, inCubic);                 // exit 7f, done 7f before the cut
  w.position.y = (1 - p) * -0.5 * TYPE.hero.size * PX + out * 20 * PX;
  setLabel(w, { opacity: Math.min(1, p / 0.35) * (1 - out), blur: (1 - p) * 10 + out * 10 });
});
```

First word 3–6f after the cut so the cut reads. Stagger × words ≤ ~18f; above that, reveal by line.

## 2. riseMask and mask push-up

```ts
const MASK = head.group.position.y - maskDepth("Ship the whole film", TYPE.hero) * PX; // under the lowest ink
head.words.forEach((w, i) => {
  const p = prog(frame, i * 4, 13, outQuart);
  w.position.y = (1 - p) * -1.3 * TYPE.hero.size * PX;          // from a full line height below
  setLabel(w, { opacity: 1, maskY: MASK });
});
```

Push-up (one line replaces another in the same slot): the old words rise one line height, 12f outQuart, stagger 4f, fading over their last 4f (the kit masks only below a line, so the fade stands in for the top edge); the new line rises into the same bottom mask starting 4f after the old one begins to leave. No blur needed: the mask edge is the effect.

## 3. Per-character title with colour sweep

```ts
const title = letters("Moonlight", { ...TYPE.display, color: "#ffffff" });
const light = new THREE.Color("#9ec5f4");
title.letters.forEach((l, i) => {
  const s = 6 + i * 1.4;                                        // 1.2–1.6f per character
  const p = prog(frame, s, 12, outSmooth);
  const c = prog(frame, s, 12 * 1.6, outCubic);                 // colour lands 1.6x slower: a front travels
  l.position.y = (1 - p) * -46 * PX;
  setLabel(l, { opacity: p, blur: (1 - p) * 13, color: tmp.lerpColors(light, ink, c) });
});
```

Per character is for 2–3 key words in the whole film (a title, the product name).

## 4. Wordmark landing

Two tested versions; both land the last letter **on** the lock frame, and neither ever shows a grey, half-opaque capital (a flat per-letter opacity ramp does, and reads as loading).

**a. Rise through a mask, tracking close anchored at the symbol.** The mask sits under the word's lowest ink (`maskDepth`): under the caps for an all-caps wordmark like this one, under the descenders for a name with a g, j, p, q or y, whose tails a caps-height mask would clip on every frame.

```ts
const outQuad = (t: number) => 1 - (1 - t) ** 2;
const mark = letters("GENMOTION", TYPE.wordmark);                // builder
mark.group.position.set(NAME_X, NAME_Y, 0);                      // NAME_X = the edge beside the symbol
const CAP_MASK = NAME_Y - maskDepth("GENMOTION", TYPE.wordmark) * PX; // just under the caps (no descenders)
// frame: tracking +0.32em -> +0.12em over 15f outQuad, ending ON the lock (an uppercase wordmark settles
// at +0.08 to +0.16em; sentence case at -0.01 to -0.03em). outQuad, not outCubic: a 15f outCubic has
// 0.8% of its travel left for the last 3f, which reads as stopped; outQuad keeps 4%.
mark.track(lerp(0.32, 0.12, prog(frame, LOCK - 15, 15, outQuad)), "left");
// each letter rises through the mask, 1.5f apart, 4f each, blur 6 -> 0; the last one lands on LOCK
mark.letters.forEach((l, i) => {
  const p = prog(frame, LOCK - 16 + i * 1.5, 4, outCubic);
  l.position.y = (1 - p) * -0.8 * TYPE.wordmark.size * PX;
  setLabel(l, { opacity: p > 0 ? 1 : 0, blur: (1 - p) * 6, maskY: CAP_MASK });
});
```

Check the close's travel: the far letter of a 9-letter word at 96 px moves `0.2em × 96 × 8 ≈ 154 px`; outQuad leaves `154 × (3/15)² ≈ 6 px` for the last 3f (≥ 2 px is visible; outCubic leaves 1.2 px). For a shorter close or a smaller word, recompute: `travel × (3 / dur)^k ≥ 2 px`, k = 2 for outQuad, 3 for outCubic.

**b. Written in by the element that became the mark** (a Transform sting: an arm, a stroke, a light line runs from the symbol along the baseline and the name exists only behind it):

```ts
// builder: the word at its final tracking; a thin bar whose origin is its left end
const name = letters("GENMOTION", { ...TYPE.wordmark, tracking: 0.12 });
name.group.position.set(NAME_X, NAME_Y, 0);
const nameW = name.track(0.12, "left");
const arm = new THREE.Mesh(new THREE.PlaneGeometry(1, 6 * PX),
  new THREE.MeshBasicMaterial({ color: LOOK.accent, transparent: true, toneMapped: false }));
arm.geometry.translate(0.5, 0, 0);
arm.position.set(NAME_X - 40 * PX, NAME_Y - TYPE.wordmark.size * 0.36 * PX, 0);
// frame: the edge travels at constant speed and passes the last letter ON the lock (no ease-out:
// a decelerating edge arrives early by eye); the bar then fades over 8f
const edge = lerp(NAME_X - 20 * PX, NAME_X + nameW + 10 * PX, prog(frame, LOCK - 18, 18));
arm.scale.x = Math.max(1e-4, edge - arm.position.x);
arm.material.opacity = 1 - prog(frame, LOCK, 8, outCubic);
name.letters.forEach((l) => setLabel(l, { opacity: 1, maskX: edge, maskSoft: 0.15 * TYPE.wordmark.size * PX }));
```

Each letter is placed where it sits in the kerned word, so tracking animates with no reflow. `maskY`/`maskX` are world values: if the group sits inside a moving lockup group, read `getWorldPosition` each frame. Slide the mark in beside it 8–9f later; if the mark travels, move mark and wordmark as one group so the mark never crosses a visible letter.

## 5. Two-pass ink and L→R sweep

```ts
// draw the words white; tint per frame
line3.words.forEach((w, i) => {
  const on = prog(frame, 64 + i * 2, 6, outCubic);              // L->R: 2f apart, 6f each
  setLabel(w, { opacity: 1, color: tmp.lerpColors(ink, accent, on) });
});
// two-pass ink: appear grey, ink 5f later
cta.words.forEach((w, i) => {
  const a = prog(frame, 10 + i * 3, 10, outCubic);
  const k = prog(frame, 15 + i * 3, 8, outCubic);
  setLabel(w, { opacity: a, color: tmp.lerpColors(grey, ink, k) });
});
```

One emphasised word per line and one punch colour per film (`motion-language`, text emphasis).

## 6. Typewriter

```ts
// builder: one plane per character, laid out at their final tracked positions (no reflow)
const typed = letters("genmotion.dev", { ...TYPE.ui, tracking: 0 });
const caret = new THREE.Mesh(new THREE.PlaneGeometry(4 * PX, TYPE.ui.size * 1.1 * PX),
  new THREE.MeshBasicMaterial({ color: LOOK.text, toneMapped: false }));
caret.name = "caret";
// frame: 2.4 f/char, caret solid while typing, blinking 16f on / 16f off when idle
const shown = Math.floor(Math.max(0, frame - START) / 2.4);
typed.letters.forEach((l, i) => setLabel(l, { opacity: i < shown ? 1 : 0 }));
const last = typed.letters[Math.min(shown, typed.letters.length) - 1];
caret.position.x = last ? last.position.x + (last.userData.w as number) + 3 * PX : typed.letters[0]!.position.x;
const typing = shown < typed.letters.length;
caret.visible = typing || Math.floor((frame - START) / 16) % 2 === 0;
```

Delete is the same index running down at ≈2.1 f/char. Typewriter delete ("Introducing" → the name) reuses one slot: build both words, show one at a time.

## 7. Word-slot flip

```ts
// builder: pivot each word on its baseline so it flips about it
for (const w of [oldWord, newWord]) w.geometry.translate(0, (TYPE.hero.size * 0.35) * PX, 0);
// frame
const out = prog(frame, F, 10, inOutCubic), inn = prog(frame, F + 4, 13, outCubic);
oldWord.rotation.x = -1.68 * out;                               // 0 -> -96 degrees
setLabel(oldWord, { opacity: 1 - out });
newWord.rotation.x = 1.6 * (1 - inn);                           // +92 degrees -> 0
setLabel(newWord, { opacity: inn });
// the rest of the sentence slides as the slot width morphs over 14f
const slot = lerp(measure("fast", TYPE.hero), measure("effortless", TYPE.hero), prog(frame, F, 14, inOutCubic));
tail.position.x = slotX + slot * PX + spaceW;
```

## 8. Scatter pops and beat cards

```ts
// a word every 6f; 4f pop, scale 0.9 -> 1, opacity stepped 0 / 0.5 / 1 (deliberately not smooth)
words.forEach((w, i) => {
  const age = frame - i * 6;
  const o = age < 0 ? 0 : age < 1 ? 0.5 : 1;
  w.scale.setScalar(0.9 + 0.1 * prog(frame, i * 6, 4, outCubic));
  setLabel(w, { opacity: o });
});
// beat-cut card: no tween, on for exactly its beat; micro-settle 1.06 -> 1 over 12f
card.visible = frame >= on && frame < off;
card.scale.setScalar(lerp(1.06, 1, prog(frame, on, 12, outCubic)) + (frame - on) * 0.0012);
```

Place scattered words from a seeded hash of their index (`hash1(i)`), never a random source.

## 9. Highlight and underline

```ts
// highlight block behind a word, growing from its left edge over 12f outCubic
const hl = new THREE.Mesh(new THREE.PlaneGeometry(1, TYPE.hero.size * 1.05 * PX),
  new THREE.MeshBasicMaterial({ color: LOOK.highlight, toneMapped: false }));
hl.geometry.translate(0.5, 0, 0);                               // origin on the left edge
hl.position.set(word.position.x - 8 * PX, 0, -0.01);
hl.name = "highlight";
// frame
hl.scale.x = Math.max(1e-4, (word.userData.w as number + 16 * PX) * prog(frame, F, 12, outCubic));
```

The pen underline is a stroke that draws along its path (`three-look`, `references/line-art.md`), 12f, starting 12f after its phrase is legible.

## 10. Count-up

```ts
const n = counter("#,###", TYPE.number);                       // builder
// small stat 40–48f, hero 120–210f, outCubic so it slows into the landing
const v = 9940 * prog(frame, S, 45, outCubic);
n.set(frame < S + 45 ? v : 9940);                               // a fast count may also use Math.round(v)
const land = prog(frame, S + 45, 5, outCubic) - prog(frame, S + 50, 13, outCubic);
n.group.scale.setScalar(1 + 0.06 * land);                       // land punch 1.06: 5f up, 13f down
```

Start big counts from 60–80% of the target or the last milestone, so the count is a landing, not a wait. Stats in a row stagger 10f. A bar or ring tied to the number draws on the same eased progress.

## 11. Captions and karaoke

```ts
// captions: one phrase (2–5 words) on screen at a time, cut on the phrase boundary, no tween
const CUES = [{ at: 6, until: 52, text: "Every frame is" }, { at: 52, until: 96, text: "a pure function" }];
const caps = CUES.map((c) => { const m = label(c.text, TYPE.caption); m.name = `caption-${slug(c.text)}`; hud.group.add(m); return m; });
// frame
CUES.forEach((c, i) => setLabel(caps[i]!, { opacity: frame >= c.at && frame < c.until ? 1 : 0 }));
```

- Captions live on the camera-locked overlay (`three-camera` `overlay`) in px units, so camera moves never shake them. In the overlay 1 unit = 1 px: build them with a style scaled by `1 / PX`, or put them in a child group scaled by `1 / PX`.
- Position: 9:16 caption block centred 58–63% down the frame (y ≈ 1110–1210 at 1080×1920); 16:9 bottom of the block ≥ 8% above the bottom edge. Editorial captions: 9:16 48–72 px, 16:9 34–48 px, weight 400–500, on a scrim (a dark rounded plane at 0.5–0.6 opacity) whenever the background is footage or busy. Social captions over footage take `ugc-craft`'s spec instead (SKILL.md, Captions).
- Time cues from the VO's word timings (`transcribe`), legible as or before the word is spoken, held ≥15f after it.
- Karaoke: the line enters 5f before its first word (7f outQuad from y −30 px); each sung word flashes the accent and pops to 1.16 with a decaying wobble (`1 + 0.16 · kick(time, [wordTime], 8)`), then fades toward the text colour.

## 12. Exits

Every non-carrier line leaves 6–9f inCubic (about 0.6× its entrance), along the axis it came in on, finished 4–8f before the cut; `prog(frame, D - 14, 7, inCubic)` in the recipes above. The handoff word, if any, has no exit (`three-transitions`).

## 13. Glow-resolve (cards on a dark or gradient ground)

The social launch card's entrance (`motion-language` text-motion, Glow-resolve): each word resolves from blur while a soft copy of it behind, in the accent, fades from a bright halo to a faint one. The halo is a second label with more blur room, drawn additively and a hair behind the word so it sorts first.

```ts
const TEXT = "Now live";
const card = line(TEXT, TYPE.hero);                              // builder
const halos = TEXT.split(" ").map((p, i) => {                    // builder: one soft copy per word
  const h = label(p, { ...TYPE.hero, color: "#b79cff" }, "left", 48);   // 48 px of room for the halo's blur
  h.material.blending = THREE.AdditiveBlending;
  h.position.set(card.words[i]!.position.x, 0, -0.01);            // a hair behind: transparent sort draws it first
  card.group.add(h);
  return h;
});
onTop(card.group);
// frame: 12f outCubic, 3f stagger, from y +0.3em, blur 12 -> 0; halo 1 -> 0.45 at 16 px
card.words.forEach((w, i) => {
  const p = prog(frame, 4 + i * 3, 12, outCubic);
  const y = (1 - p) * -0.3 * TYPE.hero.size * PX;
  w.position.y = y;
  halos[i]!.position.y = y;
  setLabel(w, { opacity: Math.min(1, p / 0.35), blur: (1 - p) * 12 });
  setLabel(halos[i]!, { opacity: (1 - 0.55 * p) * Math.min(1, p / 0.2), blur: 16 });
});
```

- The halo's blur stays 14–20 px: the kit's blur is a 7 × 7 box, so a wider halo shows its taps as a dotted grid round the strokes (faintly visible already at 16 px on a 100% crop; invisible at feed size). A halo under about 0.35 opacity disappears into the word (tested at 110 px).
- A halo on every word of a two-word card, or on the accent word only of a longer one; never on body text or captions. On a light ground skip the halo (additive light vanishes on white) and use plain blurUp.
- Exit with the ground's move (`motion-language`, Rise-through, Brand-shape pass); when the card must leave alone, 6f opacity with blur 0 → 8 on both.

## 14. Smear-in (one punch word)

The word arrives stretched along its reading direction and snaps to shape: a horizontal-only blur plus a scale from the reading side. Set the kit's blur uniform directly, since `setLabel({ blur })` blurs both axes.

```ts
const punch = label("Unlimited", TYPE.hero, "left");            // builder: "left" puts the origin on the reading side
punch.position.x = X0 * PX;                                      // X0: the word's left edge in px
onTop(punch);
// frame: 9f outQuart, scale x 1.5 -> 1 from the left edge, horizontal blur 14 -> 0, opaque by 40%
const p = prog(frame, T, 9, outQuart);
punch.scale.x = 1 + 0.5 * (1 - p);
(punch.material.uniforms.uBlur!.value as THREE.Vector2).set(((1 - p) * 14) / punch.userData.wPx, 0);
setLabel(punch, { opacity: Math.min(1, p / 0.4) });
```

Once per card, on the word that carries the claim. A centred word smears from its centre: build it with `label(text, style)` (centre origin) and scale about that.

## 15. Rebus slot (a glyph inside the line)

"Trade [stack] anything": a square glyph slot at cap height between two words, the words laid out around it, the stack rolling through its items and slowing onto the last. The glyphs are textures drawn once (the film's own illustrative glyphs; real marks only when the user supplies them).

```ts
const L = label("Trade", TYPE.hero, "left");                     // builder
const R = label("anything", TYPE.hero, "left");
const SLOT = TYPE.hero.size * 0.74;                              // ≈ cap height of a grotesque, px
const GAP = TYPE.hero.size * 0.26;                               // ≈ a word space
const glyphs = STACK.map((tex, i) => {                           // STACK: square glyph textures, sRGB, drawn once at 2×
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(SLOT * PX, SLOT * PX),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }),
  );
  m.name = `rebus-${i}`;
  return m;
});
const lw = L.userData.w / PX, rw = R.userData.w / PX;
const x0 = -(lw + GAP + SLOT + GAP + rw) / 2;                    // centre the whole line, slot included
const slot = new THREE.Group();
slot.add(...glyphs);
L.position.x = x0 * PX;
slot.position.set((x0 + lw + GAP + SLOT / 2) * PX, 0.02 * TYPE.hero.size * PX, 0);
R.position.x = (x0 + lw + GAP + SLOT + GAP) * PX;
const row = new THREE.Group();
row.add(L, slot, R);
onTop(row);
const STEPS = [4, 4, 4, 4, 5, 8, 12];                            // frames per item, slowing into the last
// frame: find the item that is up and how far into its 3f roll
let t = frame - T0, k = 0;
while (k < glyphs.length - 1 && t >= (STEPS[k] ?? 12)) { t -= STEPS[k] ?? 12; k++; }
const r = frame < T0 ? 0 : outCubic(Math.min(1, t / 3));
glyphs.forEach((g, i) => {
  const cur = i === k, prev = i === k - 1 && r < 1;
  g.visible = cur || prev;
  g.position.y = (cur ? (1 - r) * -0.45 : r * 0.45) * SLOT * PX;   // in from below, out above
  (g.material as THREE.MeshBasicMaterial).opacity = cur ? r : 1 - r;
});
```

- Slot 0.9–1.1× the cap height; a glyph larger than the words turns one line into two images.
- A single glyph (a coin, a link icon) instead of a stack: pop it in 10f (scale 0.6 → 1, no overshoot) 2–3f after the word before it, then let it spin slowly (one turn per 2–3 s) or hold.
- Glyphs of different widths: lay the line out per item and lerp the words' x over 8f when the item changes, so the sentence never jumps.
- On a 3D film the glyph can be the real object (a `coin()` or `squircleIcon()` from `three-look` `references/social-looks.md`), scaled so its face is the slot size; wrap the row in `onTop()` only if nothing must pass in front of the glyph.
