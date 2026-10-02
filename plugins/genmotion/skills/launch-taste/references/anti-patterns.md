# Anti-patterns: what weak launch films do

Learned from the study films graded Mixed or Weak (and from the faults of the good ones). Each item: the symptom you can see on captured frames or measure on the export, why it hurts, and the fix. Read it when a film "looks templated" and you cannot say why, and run §Template tells on every cut.

Contents: Idea · Structure and energy · Frame and type · Motion and transitions · Sound · Template tells · Integrity

---

## Idea

1. **Re-filming the landing page.** Whole site sections at web density, one per 10 s, with only captions changing. *Why*: nothing in it needs time; the viewer reads nothing at video pace. *Fix*: pull one or two hero details per section, show them big, and replace the tour with one run of input → result.
2. **A capability with no product.** The film says a feature exists (in type) but never shows it, the logo, or where it lives. *Fix*: the product on screen doing the thing, at least once, at the peak.
3. **Static product footage.** The UI is on screen for 9 s and does nothing the film claims (idle panes, an unchanged grid). *Fix*: show it working, or cut it to the length of one move.
4. **Abstract demos.** Translucent boxes "demonstrating" an effect that only someone who already knows the term can read. *Fix*: a tiny real scene (a headline over a picture) per demo.
5. **Decoration posing as the idea.** A glow, particles, a tag cloud, a gradient doing the work an idea should. *Fix*: SKILL.md step 2.
5a. **The device dies after the reveal.** The first third builds a real device; the proof beats switch to stock UI and the device never returns, so the claim is asserted in type rather than shown. *Fix*: build every run from the device; a contrast device keeps both sides in frame (SKILL.md step 2).

## Structure and energy

6. **Peak early, then flat.** The film's biggest moment in the first 10% (often a luminance jump at a cut), then a plateau. *Fix*: move the reveal to its band (SKILL.md step 7) and build to it.
7. **The peak is a transition.** The highest motion energy is a logo zoom or a wipe, while the payoff (the joke, the result) is quieter. *Fix*: the payoff gets the biggest scale change; the transition is fast and modest.
8. **Plateau then deflation.** A camera move starts at full speed and spends half the film slowing down; the end card arrives after dead air. *Fix*: ease in, arrive somewhere (a hero item that becomes the end card), land the mark on a hit.
9. **Uniform rhythm.** Ten beats of about 2 s each; every item popping at a fixed interval. *Fix*: the hero beat about twice as long, minor beats half; group reveals (hero first, then a cluster, then the rest).
10. **Metronomic builds.** Identical teases at exactly equal spacing and equal intensity. *Fix*: tighten the intervals, raise the intensity, let fragments grow, add slight irregularity.
11. **The upside-down announcement.** The problem setup gets the energy; "that changes today" is a quiet card. *Fix*: the solution is the peak.
12. **Too long for its idea.** The concept is fully told by 8 s; the film runs 26. *Fix*: cut to the idea's lifetime, or add a second beat that develops it.
13. **Dead air.** Black for 0.6–1.2 s at the head (an empty thumbnail), a 2 s gap before the logo, VO pauses rendered as blank frames, 8–10 s of silent end card. *Fix*: frame 0 in motion; no gap longer than direction's breath; hold the end card 2–4 s with a tail.
14. **No ending.** The file stops mid-move, or the music is still at full level on the last frame. *Fix*: a button, a tail, a held lockup with one ambient behaviour.

## Frame and type

15. **The caption is the loudest thing on screen.** A bold caption chip outranks the product, or a second condensed face fights the headline. *Fix*: captions below the product in the hierarchy (smaller, lower contrast), one type voice for headlines.
16. **Captions chunked by count.** Groups that straddle a full stop ("…system / Drop"), which read as nonsense muted. *Fix*: break at phrase boundaries.
17. **Text the viewer never gets to read.** Typing at nearly 30 characters per second that scrolls off the frame edge; a tagline on screen for 8 frames. *Fix*: direction's hold formula; the whole line inside the frame.
18. **Overlays that cover the message.** A character or banner placed over the very sentence the film is about. *Fix*: compose so the message stays clear at the end.
19. **Low-contrast secondary type.** Dark grey italic on charcoal, sage on sage, 16 px eyebrows. *Fix*: direction's contrast and size floors.
20. **Underexposure.** A dark film whose frame averages near black; on a phone in daylight it is a black rectangle. *Fix*: one bright focal point always; check on a phone-sized capture.
21. **Palette drift.** A different colour system per section of a film about "one" product. *Fix*: one palette; a colour script only within it.
22. **Patchwork.** Four type voices and four visual systems in 60 s (a sticker world, a dark terminal, a framed browser, 3D type over a person). *Fix*: one family; at most one deliberate crossing.

## Motion and transitions

23. **A wipe zoo.** Checkerboard, slab, panel, black-out: a new style and colour at every cut, all silent. *Fix*: one signature, one workhorse.
24. **One transition as a tic.** The same bloom or blur dissolve five or more times with identical timing. *Fix*: the signature at the turns only; exit-then-cut elsewhere.
25. **Camera starting at full speed.** A pan that jumps from rest to full velocity reads as a scroll. *Fix*: ease in over 10–15f.
26. **Long exponential tails.** A slider that covers its travel in 8 frames and then creeps for 50 makes the beat slack. *Fix*: ease to rest in about 15f and move on.
27. **Judder.** A constant pan whose frame-to-frame motion dips every 3–4 frames (a capture not locked to the output rate). *Fix*: render frame-accurately.
28. **Constant decorative drift.** Background blobs that never stop moving, so no stillness can mean anything. *Fix*: one ambient behaviour, on the focal element.
29. **Collisions.** An expanding ripple crossing a text reveal; a strike-through that misses its words. *Fix*: capture the frames where systems overlap and look.

## Sound

30. **Silence where sound is the subject** (a music recap, a sound feature, a megaphone gag, a lightning strike with no thunder). *Fix*: a sound-on master.
31. **A wall of loudness.** LRA near 2–5 LU, no dips, no tail. *Fix*: a breath, a cut on the payoff, a decay.
32. **A dry voice and nothing else.** Synthetic narration with no bed and no cues reads as a screen recording. *Fix*: a low bed and one soft cue on the moments that matter.
33. **Music laid under the edit.** Lifts and whooshes landing mid-beat, nothing on counters, typing or reveals. *Fix*: cut to the track, or move its events onto the picture's.
34. **The product masked by its own score.** A beat-driven bed under the sounds being sold. *Fix*: remove the bed (`sound-picture.md`).
35. **A quiet master.** −23 to −28 LUFS integrated plays far softer than everything around it. *Fix*: `sound-design`'s loudness target.

## Template tells

Any one of these on screen makes a film read as agent-made or template-made. Check every cut for them:

- Corner metadata: a year, a version string, frame dimensions, section numbers with arrows, in tiny mono caps.
- A radial glow centred on the canvas (not the subject) with dust specks, as the default backdrop.
- A static coloured glow pinned to one corner for the whole film.
- Floating pastel balls or sticker pills unrelated to the content.
- Per-letter opacity fades as the only type move; blur-in/blur-out on every transition.
- Exact periodicity: every pop, swap or tease on the same frame interval with the same envelope.
- A "feature cloud" of tags orbiting a centred phrase with flickering squares.
- A **tile wall** as the "scale" beat: a grid of unlabelled cards, sparkline or bar tiles, or app screenshots standing in for "many". Show many of the device's own event instead.
- A **generic dashboard** as the proof: funnel, line chart and KPI cards that any product in the category could own, with the film's device nowhere in the frame.
- A payoff line alone on a flat brand-colour flood (the device thrown away at the peak).
- Chromatic-aberration outline type; thumbnail-preset lettering (white marker face, black stroke, drop shadow, warped baseline).
- A system emoji inside set typography.
- Identical enter and exit timing for every section.
- Generated imagery with mush, ghost shapes of the mark inside it, pseudo-text labels, soft shadows that disagree with the scene.

## Integrity

- **Never replicate a real brand's identity** (its mark, wordmark, look, tagline or artwork) to make a film look premium, and never invent version or year labels for it. It is impersonation, and it shows nothing about the product.
- **Loops must loop**: the last frame hands back to the first (direction's loop-seam check). An excerpt is not a loop.
- **Timeline bugs**: a layer dropping to black because its source clip ended early. Capture the last frame of every layer's clip.
