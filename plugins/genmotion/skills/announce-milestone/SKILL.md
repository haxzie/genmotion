---
name: announce-milestone
description: "Funding rounds, ARR, GitHub stars, user and download counts, acquisitions: one number made to land. Covers what earns a milestone video, the count-up choreography measured from GenMotion's stat templates (a 120 to 210 frame ease-out count, the 1.06 land punch, celebration within two frames, the payoff hold), the digit slot-roll variant, number formatting and honesty, the gratitude beat, logo walls, the tick-riser-impact sound design, and beat sheets for 10, 15, 20 and 30 seconds. Load it when the content is a number going up with no feature to demonstrate."
---

# Announce milestone

A milestone video has no demo. The number is the content, and everything here exists to make one number land with weight, then say thank you. Frames at 30 fps. Read `direction` first; moves come from `motion-language`, the mix from `sound-design`.

## When to use

- "We hit 10k GitHub stars", "celebrate our star count", "announce our Series B", "1 million downloads", "$10M ARR", "we got acquired".
- A thank-you to a community, attached to a number.

Another owner fits better when:

| The ask is really | Owner |
| --- | --- |
| A number plus the product working | `launch-playbook` (metric-first shape) |
| A shipped feature | `announce-feature` |
| Explaining what a set of numbers means | `explainer` (by-the-numbers shape) |
| Only the logo | `brand-sting` |

## What earns a milestone video

Check before building, and say so if it fails:

- **A real threshold**: 10,000 users, not 10,347. A round number, a doubling, a first.
- **Recent**: it happened this week or month.
- **Verifiable or approved for sharing**: a public star count or press release, or a private number the user explicitly confirms may be published.

If it fails, suggest a plain post or an `announce-feature` video instead of forcing the shape.

## Ask first

1. **What is the exact number, and is it public?** Never round, estimate or reuse an old figure without saying so.
2. **Who is it thanking?** Users, contributors, customers, investors, the team: the gratitude beat names them.
3. **Where does it play?** X or LinkedIn (1:1 or 4:5, muted), a site or a keynote (16:9, sound on), or Reels and TikTok (9:16).

## Direction defaults

- **Style family**: J (milestone / stat): warm paper (#FBFAF8 or #FAFAFA), ink #111114–#1C1917, muted ≥5.3:1 contrast, one brand accent; a grotesque at 500, 250–264 px, −0.04 to −0.045em, tabular figures; caps labels 28 px at +0.2em. A blueprint grid (rules drawn in at 3f stagger) is the optional texture. For a funding film, B for the story act, J for the number.
- **Energy curve**: steps to one hero number. The **land** is the peak; the 10–30f before the count starts are calm; after the land, the energy steps down through meaning and thanks to the mark.
- **Pacing**: Calm (45–70f between new information), then one long payoff hold of 90–120f. The count itself is the tension; do not cut during it.
- **Transitions**: usually one scene. Multi-scene films use the persisting element (the number or the mark carries across) as the signature and a blur-out exit (blur 12–16 px) as the workhorse.
- **Sound**: music-led at 1.0, or at 0.5–0.6 under SFX. A soft tick per visible step, a riser that ends on the land, an impact on the land frame. VO optional and warm, never triumphant.
- **Memorable moment**: the land: digits stop, punch to 1.06, confetti or poppers fire, the impact hits, all within 2 frames of each other.

## The count-up

| Phase | Frames | What happens |
| --- | --- | --- |
| Number enters | 12f, outSmooth | Rise 50 px, blur 10 → 0, scale 0.94 → 1. It enters at its start value, already in place |
| Count | **120–210f** (4–7 s) for a hero number; 40–48f for each stat in a row | Ease-out cubic, `1 − (1 − t)³`: fast through the low digits, decelerating into the land. Never linear |
| Land | the last count frame | Punch 1 → 1.06 → 1, 5f up and 13f down (outCubic); confetti or poppers within ±2f (one template fires at land −2 and land +2) |
| Payoff hold | 90–120f | The number breathes 0.4–0.6% scale (period ~68f); nothing else moves. The meaning line enters ≥15f after the land |

- **One clock**: any ring, bar or chart line is driven by the **same eased progress** as the digits, so the line's head and the last digit settle on the same frame. Never a second timer.
- **Start value**: from 0 when the climb is the story (stars, a first product); from the previous milestone when that is meaningful ("5,000 → 10,000"); from about 70% of the target when the number is large and the climb is not the point (a $400M round counts 280 → 400).
- **The unit label** ("GitHub stars", "ARR") can sit with the number from the start, because it tells the eye what is counting. **The meaning** ("thank you to 10,000 builders") waits until after the land.
- **Stats row**: up to 3 small counters, staggered 10f, each 40–48f; the hero number still gets its own scene.

### Slot-roll variant

For a mechanical, celebratory feel, roll each digit column instead of counting: each column is a vertical strip of 0–9 that spins and lands on its digit, rolling with `1 − (1 − u)^3.6` (a long landing) over 90–150f, columns landing 3f apart from left to right so the rightmost lands on the land frame. Separators and units stay still. For tile-like rolls (one face every 24f, each roll 11f inOutCubic, cells staggered 3f), see the brand-grid device in `brand-sting`.

## Number formatting and honesty

- Show exactly the number given. Abbreviate only above six digits ("$400M", "1.2M"), with the exact figure in the caption or VO if it matters. "10,000+" only if true.
- Prefixes and suffixes (`$`, `M`, `★`, `%`) are static glyphs beside the counting digits, not part of the count.
- Reserve the width of the final string and right-align the digits, so the number never shifts as digits or separators appear. Count in whole steps; currency counts in whole units of its suffix.
- Never claim a private number, an investor or a customer the user has not confirmed. A logo that should not be there is a legal problem before it is a design one.

## Beat sheets

| Length | Frames and beats |
| --- | --- |
| **10 s** (300f), single scene | Lockup or repo name 0–12 · number enters 6–18 · count 12–150 · **land 150** · meaning line 170 · hold and thanks to 270 · blur-out 270–300 |
| **15 s** (450f) | Context 0–30 · number enters 20–32 · count 30–210 · **land 210** · confetti 208–212 · meaning 230 · gratitude 300–375 (names or avatars) · mark 375–450 |
| **20 s** (600f) | Context hook 0–90 (what this is, e.g. the repo card) · count 90–300 · **land 300** · payoff hold to 400 · gratitude 400–510 · mark 510–600 |
| **30 s** (900f), funding | Hook 0–60 (the idea) · story act 60–360 (idea → shipped → spread, 3–4 beats of 75f, persisting element) · breath 360–390 · count 390–570 · **land 570** · what it means 600–690 · investors 690–780 (logo wall 60–90f) · gratitude 780–840 · mark 840–900 |

VO (optional): ≤20 words at 10 s, ≤30 at 15 s, ≤42 at 20 s, ≤64 at 30 s. **Silent during the count** so the ticks and the land are heard; the number is said once, after the land, as spoken ("ten thousand stars").

## The gratitude beat

Not optional: a milestone is never achieved alone, and skipping the thank-you is this format's most common mistake. 60–90f, named: "To every contributor", real avatars floating past (the star template spreads 64 avatars over 136f, each living 64–94f, 60% of them in the side gutters so the copy stays clean), a list of first names, or the community's own word for itself. Real avatars only, fetched with `save-asset`; never generated faces presented as real people.

## Logo walls

Investors or notable customers: 60–90f, a simple grid or a slow drift, never held long enough to read one by one, every name confirmed by the user. Logos in one tone (all ink or all white), not their brand colours, so no one logo wins.

## Layout per aspect

- **16:9**: number centred or on the left third at 250–264 px; the label above or below at 28–46 px.
- **1:1 / 4:5**: number ≥220 px; keep it inside the central 1080 × 1080.
- **9:16**: number at 40–45% of the height; the final string ≤720 px wide (inside x 120–840), so ≤5 characters at 250 px or scale the type down; the label above it, never in the bottom 37%.

## Sound

- **Ticks**: a soft tick at 0.45 (−7 dB) per visible step change, thinned so there are never more than one every 3f; they decelerate with the count, which sells the ease better than the picture.
- **Riser**: 0.55 (−5.2 dB), starting `land − riserLength`, ending exactly on the land.
- **Impact**: 0.7–0.85 (−3 to −1.4 dB) on the land frame ±1f, layered transient + body; poppers or a confetti burst on the same frame.
- **Music**: a bright 100–128 BPM track at 1.0 (0.5–0.6 under SFX); place the count so the land falls on a downbeat, ideally the start of a phrase. The track's button lands on the mark.

## Building it

- **Three.js (default)**: digits from `three-type`'s `counter()`: one canvas-texture atlas of 0–9 at a fixed advance (tabular), one plane per digit column, updated each frame from the eased value, leading zeros hidden so a count from 0 never reads "0,042"; the punch is a scale on the group; confetti is seeded instanced quads with gravity as a pure function of frames since the land (`three-assets` for avatar and logo textures, `three-look` for the paper stage). A ring is a `RingGeometry` whose `thetaLength` follows the same eased progress.
- **HyperFrames**: tween a proxy value on the timeline and write the formatted string on each update; tabular figures in the font settings; confetti as seeded elements.
- **React**: `<CountText>` from `@genmotion/motion` for the count, a spring or `interpolate` for the punch.

## Good and bad

- Bad: the number counts linearly for 1 s and the confetti fires half a second later. Good: 150f ease-out, punch, poppers and impact on the same frame, then 3 s of stillness.
- Bad: "10K" in the hero and "10,347" in the caption. Good: "10,000 ★" because it is exactly 10,000 today, or "10,347 ★".
- Bad: the meaning line fades in with the count. Good: the count lands, then "Thank you, contributors" rises 20f later.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The confirmed number | Ask the user; `web-research` for public counts | Never estimate |
| Avatars, logos | `save-asset` for the real files | Names as type; no placeholder people |
| Ticks, riser, impact | `sfx` | Credited CC0 sounds, or the track's own hit |
| Music | `music` | SFX-led with room tone |
| Narration | `pick-voice`, then `voiceover` | Silent; the number and the label carry it |
| Seeing it | `capture-frames` | None |
| Loudness | `ffmpeg` | None |
| Direction, moves, mix | `direction`, `motion-language`, `sound-design` | — |

## Checks before you finish

1. The number on screen equals what the user gave, character for character; any abbreviation is true and stated.
2. `capture-frames` at 25%, 50% and 100% of the count: the 25% frame already shows over half the final value (ease-out, not linear).
3. Capture land −1, land, land +2: the digits are final on the land frame, the punch peaks by land +5, confetti is visible by land +2.
4. Capture land +30 and land +60: the digits are identical (nothing still animating) and the string's position has not shifted.
5. Any ring or chart reaches its end on the same frame as the last digit.
6. The meaning line enters ≥15f after the land; the gratitude beat exists and names who it thanks.
7. Every logo and avatar was supplied or confirmed by the user.
8. The impact sits on the land frame ±1f; ticks never closer than 3f; `ebur128` gives −14 LUFS ±1 and true peak ≤ −1 dBTP.
9. In 9:16, the number and label sit inside x 120–840, y 270–1210.
10. The `direction` self-critique passes; `validate` passes.
