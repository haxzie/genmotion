---
name: ugc-unboxing
description: "The first-impression ad: a box, hands in frame, the product revealed one layer per beat, with foley carrying the retention. Covers direction defaults, beat sheets with frame budgets at 15, 30 and 45 seconds, hook options, the one-layer-per-beat rule, why hands beat a face, scale and packaging as the subject, a foley plan with levels and cuts on transients, the software version (an unboxing is the onboarding, and the script says so), and building the reveal from matched stills and camera moves on Three.js."
---

# UGC unboxing

A box, two hands, and a product that arrives in pieces. The format sells anticipation: the viewer stays because something is still covered.

Read `direction` first, then this, with `ugc-ad-foundations` (shared numbers, claims), `ugc-craft` (moves, captions) and `sound-design` (levels). Frames at 30 fps; positions on 1080×1920.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, and never putting words in a real person's mouth. The checks at the end are a quality bar to clear, not a template to reproduce.

## When to use

- The request names an unboxing, a first impression, "what's in the box", a haul or a packaging reveal, and the product has a physical form (or a first-run experience that behaves like one).
- The tell is a noun you could put on a table.

Not this when:

- The interesting part is the interface working: `ugc-screen-demo`.
- There is a felt problem the product ends: `ugc-problem-solution`.
- The user **filmed their own unboxing** and wants it cut, captioned and scored: `video-editing` (this skill's beat order and foley plan still apply as the edit plan).

## Ask first (only what the request does not answer)

1. Do you have product photos or footage? (Real beats generated every time here.)
2. What is the reveal moment, the thing people should see last?

## The one-layer rule

Every beat removes exactly one layer, and what is still covered buys the next few seconds. Never two layers in one cut: the moment the viewer can see everything, the ad is over. In practice a layer that sits on screen longer than about 4 s (120f) with nothing changing loses people; cut a beat or add a move.

| Layer | What comes off | Why it holds |
| --- | --- | --- |
| Sealed box | Nothing | The sealed object is the hook: a question with a lid |
| Seal | Tape, sticker, shrink-wrap | The first irreversible act; the sound does most of the work |
| Lid | The outer box | Reveals arrangement, not product: tissue, foam, a card |
| Reveal | The wrap | The first time the thing exists; held against a hand |
| Texture | Nothing | Weight, finish, one detail nobody photographs |
| First use | The protective film | The product doing its one job |
| Verdict | Nothing | Two flat sentences, looking at the product, not the lens |

## Direction defaults

| Line | Default |
| --- | --- |
| Style family | C (3D product hero) adapted to a real room: the product is the hero, but under available light on a real surface, never a glossy stage. B for the software version. Look: Native (Camcorder for a nostalgia angle) |
| Energy curve | An anticipation staircase: hook 6 → seal 6 → lid 7 → a 15f breath of near-silence → **reveal 9 (the peak, at 30–45% of the length)** → texture and use 7 → verdict 4 |
| Pacing | Medium: one layer per 90–120f; inside each, a creep or push so nothing holds 90f still |
| Transitions | Workhorse: hard cut on a foley transient. Signature: the reveal wipe (the product still uncovering the box still behind a hard edge over 12f inCubic), used once |
| Sound | SFX-led: foley carries it, literal density; VO sparse; music optional |
| Memorable moment | The reveal frame: the product lifted against a hand after the breath |

## Beat sheets

**30 s (900f)**

| # | Frames | Job | On screen | Sound | VO (words) |
| --- | --- | --- | --- | --- | --- |
| 1 | 0–90 | Hook | The sealed box on a real surface, a hand already entering at frame 0; creep running | Hand on cardboard at frame 1 | "This came on Tuesday." (4) |
| 2 | 90–180 | Seal | Close on the tape, push-in; hard cut on the tear's transient (about frame 150) | Tape tear, one long pull | — |
| 3 | 180–270 | Lid | Lid off: tissue, foam, the card; product still covered | Cardboard slide; tissue crinkle | "Packed like it's fragile." (4) |
| 4 | 270–390 | Reveal (peak) | 270–285 breath (room tone only); 285: reveal wipe 12f; product lifted against a hand, held | Soft set-down on contact | "[Product name]." (2) |
| 5 | 390–540 | Texture | The one detail, macro, off-centre; focus push 30f | A magnet click, a hinge, whatever it really sounds like | "It's heavier than it looks." (5) |
| 6 | 540–720 | First use | The product doing its one job; no VO over the action | The product's own sound | — |
| 7 | 720–900 | Verdict + CTA | Product at rest, hand withdrawing; CTA text ≥60f | Bed (if any) resolves | "I'd buy it again. Link's in my bio." (8) |

23 words: an unboxing comes in well under the 73-word budget, because the foley is the soundtrack.

**15 s (450f)**: 0–60 sealed hook · 60–120 seal (cut on the tear) · 120–210 lid + 15f breath · 210–300 reveal (peak) · 300–375 first use · 375–450 verdict + CTA. ≤20 words.

**45 s (1350f)**: 0–90 hook · 90–210 seal · 210–330 lid · 330–480 reveal (peak at about 345) · 480–630 texture · 630–810 first use · 810–840 a beat of silence · 840–1020 second use · 1020–1170 third use · 1170–1350 verdict + CTA. The silences between uses give the 45 s cut its texture; without them it feels like the 15 s cut read slowly.

## Hook options

**Curiosity gap** (the sealed box, "This came on Tuesday", "I don't know what's in here"), **Pattern interrupt** (the box dropped onto the desk on frame 0, the thud on frame 1), **Social proof** (a stack of the same box, only with a real number), and for software **Result** ("This doesn't come in a box, so here's the next best thing"). Never open on a face: a face with a box behind it sorts as a product video. `ugc-hooks` has the frame-0 builds.

## Hands, scale and packaging

- **Hands over a face.** First-person hands are the viewer's proxy; they carry no casting, accent or implied endorsement; and VO over hands can be rewritten without re-rendering a presenter. A face appears at most once, at the verdict, reacting rather than presenting.
- **A scale reference in every shot with the product**: a hand, a thumb, a desk edge, a mug. A product alone at an unknown size reads as a render, and renders read as ads.
- **Shoot the unglamorous layers**: tissue, foam, the little card. A fake unboxing skips them.
- **One specific true detail** ("it's heavier than it looks") beats an adjective stack ("incredible build quality"); only what the user confirmed.
- **An honest surface**: a desk, a rug, a counter with something else on it. A seamless white sweep is a studio.

## Foley plan

Build the sound first, then cut the picture to it: place every cue at its frame, note the transients, and land each hard cut on one. Levels per `sound-design` (sources normalised first: SFX to a −3 dBFS peak).

| Moment | Sound | Level (linear / dB) |
| --- | --- | --- |
| Seal | Tape tearing, one long pull: the loudest effect in the ad | 0.85 (−1.4) |
| Lid | Cardboard sliding on cardboard, low and dry | 0.6 (−4.4) |
| Tissue | Paper crinkle, close and quiet | 0.45 (−7) |
| Breath before the reveal | Room tone only, 15f | 0.05 (−26) |
| Product set-down | Soft thud on the contact frame ±2f | 0.6 (−4.4) |
| Magnet, click, hinge | A single click; cut exactly on its transient | 0.9 (−0.9) |
| Music, if any | Instrumental, out of the way at the reveal | 0.5 under foley; 0.12 under VO |

Every hard cut sits on a transient: a cut with no sound under it either moves or gets a sound. Prompt `sfx` with the sound, not the picture ("packing tape ripped off a cardboard box, close, dry, one-shot, 1 second"); generate 2–3 takes of the tear. Design for mute anyway: captions carry the verdict.

## The software version

Most software has no box, and inventing one is a lie the viewer catches on frame 0. **A software unboxing is the onboarding**, and the hook says so in its first five words: "This doesn't come in a box, so here's the next best thing."

| Physical layer | Software equivalent |
| --- | --- |
| Sealed box | The install button or the sign-up screen |
| Seal | The first launch, the splash, the permission prompt |
| Lid | The empty state, before any data |
| Reveal | The first real thing you make in it |
| First use | The moment it does the job you came for |
| Verdict | Two flat sentences over the finished artifact |

Build the screens per `ugc-screen-demo` (rebuilt UI or a recording via `screen-capture`), and keep a real hand: a hand entering to tap a phone puts the physical grammar back over a digital reveal. Merch, hardware and printed kits are genuinely physical; use the real thing when the user has it.

## Building it

You almost never have footage; build it from matched stills and moves.

- **Three stills, one prompt family**: `generate-image` the sealed box, the open box with the product still wrapped, and the product in a hand, with the same surface, light direction and hand description in every prompt (and the same seed when the model takes one) so they cut together. The user's photos via `save-asset` replace any of them.
- **Fake the hand move with the camera**: a creep (+3%) or a focus push (30f) on a still, slightly off-axis, reads as a handheld reveal (`ugc-craft`).
- **Short clips**: if a video model is connected (`fal`, `replicate`), 2–4 s handheld clips of the seal or the lift, prompted per `stock-and-broll`; still cut on the foley.
- **Three.js** (default): each still is a plane sized from its real pixels (`three-assets`); moves are camera dollies (`three-camera`); the reveal wipe is the product plane revealed by an animated clipping plane or an alpha-map threshold over 12f inCubic, hard-edged, not a dissolve; captions in a camera-parented overlay (`three-type`). Keep every cue frame as a constant in `components/` and read it both for the cut and for `place-audio`.
- **HyperFrames / React**: stills as images in wrappers the timeline scales; the reveal wipe as a clip-path or mask tween.

Nothing in the composition is random or clock-driven: the reveal timing is authored.

## Good and bad

- **Bad**: the product visible on frame 0 beside the box. **Good**: only the sealed box, a hand already moving.
- **Bad**: lid and wrap off in one cut. **Good**: lid at 180, a breath, the product at 285.
- **Bad**: the product floating on white with no scale. **Good**: in a hand, on a desk with a mug.
- **Bad**: a cut half a beat after the tear. **Good**: the cut on the tear's transient frame.
- **Bad**: a fabricated box for a download. **Good**: "This doesn't come in a box" and the onboarding mapped layer by layer.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Product imagery | `save-asset` for the user's photos, `generate-image` for the rest | Typography and a silhouette; weaker, but it ships |
| Foley | `sfx` | Credited CC0 foley via `web-research` + `save-asset`; never a silent cut |
| Narration | `pick-voice` then `voiceover` | Caption-led and silent; this format survives mute well |
| Short handheld clips | A video model through `fal` or `replicate` | Stills with camera moves |
| Music | `music` | None: foley and room tone carry it |

## Checks before you finish

1. `capture-frames` at frame 0: no product visible; a hand or movement is.
2. Capture one frame per beat: exactly one layer came off between each pair.
3. Every frame containing the product has a scale reference.
4. For each hard cut, capture the cut frame and the one before: the cue sheet has a transient on the cut frame (±1f).
5. Capture the 15f before the reveal: nothing new arrives and only room tone plays.
6. Read only the captions start to finish: the reveal and the CTA still land.
7. Software version: the first five spoken words say there is no box; no invented packaging anywhere.
8. Export measured: −14 LUFS ±1, true peak ≤ −1 dBTP, the tape tear the loudest effect.
9. `validate` passes; then run `ad-qa` in full.
