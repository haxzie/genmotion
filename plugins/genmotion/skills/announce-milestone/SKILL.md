---
name: announce-milestone
description: "Funding rounds, ARR, GitHub stars, user and download counts, acquisitions: one number made to land. Covers what earns a milestone video, the count as the hook from frame 0, a clock that never parks (count capped at 40% of the film, the breath before the land), the subject's own object on the same clock, the 1.06 land punch and confetti, number sizing by width, the gratitude beat with an image, a living end card, the tick-riser-impact sound, and beat sheets for 10, 15, 20 and 30 seconds. Load it when the content is a number going up with no feature to demonstrate."
---

# Announce milestone

A milestone video has no demo. The number is the content, and everything here exists to make one number land with weight, then say thank you. Frames at 30 fps. Read `direction` first; moves come from `motion-language`, the mix from `sound-design`.

## When to use

- "We hit 10k GitHub stars", "celebrate our star count", "announce our Series B", "500,000 installs", "$10M ARR", "we got acquired".
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
- **Energy curve**: steps to one hero number. In a feed (X, LinkedIn, Reels, TikTok) **the count is the hook**: the number is on screen and moving on frame 0, with no calm context before it (`direction`'s hook rule). The calm stretch is the **breath**: the 10–30f just before the land, when only the last digits crawl and the music drops. The **land** is the peak; after it the energy steps down through meaning and thanks to the mark.
- **Pacing**: the count runs ≤ 40% of the film; then calm (45–70f between new information) with a payoff hold of ~90f from the land to the end of the meaning line. Do not cut during the count.
- **Transitions**: usually one scene. Multi-scene films use the persisting element (the number or the mark carries across) as the signature and a blur-out exit (blur 12–16 px) as the workhorse.
- **Sound**: music-led. A soft tick per visible step, a riser that ends on the land, an impact on the land frame; levels from `sound-design` (see Sound below). VO optional and warm, never triumphant.
- **Memorable moment**: the land: digits stop, punch to 1.06, confetti fires, the impact hits, all within 3 frames of each other.

## The count-up

| Phase | Frames | What happens |
| --- | --- | --- |
| Number enters | frames 0–12, outSmooth | Rise 50 px, blur 10 → 0, scale 0.94 → 1, **counting while it enters**: frame 0 already shows a value moving off the start value |
| Count | **≤ 40% of the film** (10 s: 120f, 15 s: 180f, 20 s: 240f) for a hero number; 40–48f for each stat in a row | The clock `trunc(outQuart, 0.85)` = `outQuart(0.85u) / outQuart(0.85)` (`motion-language` easing): fast through the low digits, still moving on the last frame. Over a 180f count the last 30f carry 0.7% of the range (the **breath**: only the last digits crawl) and the 30f before carry 2.8%, so nothing parks. Plain outCubic or outQuart over 150f+ parks ~2 s before the land. Never linear |
| Land | the last count frame | Punch 1 → 1.06 → 1, 5f up and 13f down (outCubic); confetti or poppers on the land to +3f |
| Payoff hold | ~90f, land to the end of the meaning line | The number breathes 0.4–0.6% scale (period ~68f); the meaning line enters 15–20f after the land; nothing else new |

- **One clock, drawn as the subject's own object**: the element that moves with the count is the thing the number counts, drawn as that thing, not a generic chart. Star counts: a constellation filling in, a point per batch of stars, lines joining as it grows. A language-learning app's learners: a world map whose cities light up. A podcast's plays: its own waveform growing. It is driven by the **same eased progress** as the digits, so the last point lands with the last digit; never a second timer. **Test: cover the number. The image alone should still say whose milestone it is.** A rising line with a dot passes for any app after a recolour, so it fails.
- **Share the centre**: in 1:1 and 4:5 the number sits over or inside its object (the number at the centre of the constellation, over the map), never a number at the top and a chart along the bottom with an empty band between.
- **Start value**: from 0 when the climb is the story (stars, a first product); from the previous milestone when that is meaningful ("5,000 → 10,000"); from about 70% of the target when the number is large and the climb is not the point (a $400M round counts 280 → 400).
- **The unit label** ("GitHub stars", "ARR") can sit with the number from the start, because it tells the eye what is counting. **The meaning** ("thank you to 10,000 builders") waits until after the land.
- **Stats row**: up to 3 small counters, staggered 10f, each 40–48f; the hero number still gets its own scene.

### Slot-roll variant

For a mechanical, celebratory feel, roll each digit column instead of counting: each column is a vertical strip of 0–9 that spins and lands on its digit, rolling with `1 − (1 − u)^3.6` (a long landing) over 90–150f, columns landing 3f apart from left to right so the rightmost lands on the land frame. Separators and units stay still. For tile-like rolls (one face every 24f, each roll 11f inOutCubic, cells staggered 3f), see the brand-grid device in `brand-sting`.

## Number formatting and honesty

- Show exactly the number given. Abbreviate only above six digits ("$400M", "1.2M"), with the exact figure in the caption or VO if it matters. "10,000+" only if true.
- Prefixes and suffixes (`$`, `M`, `★`, `%`) are static glyphs beside the counting digits, not part of the count.
- Tabular figures, so the string never moves while its length is constant. **Centre the current string**; it reflows only when a digit or separator is added. When the target has one more digit than the start (5,000 → 10,000, 999,999 → 1,000,000), that happens on the land frame, under the punch, where the shift reads as part of the land; in a count from 0 the short lengths pass in the first fast frames. Do not reserve the final width and right-align: a shorter start value then sits off-centre for the whole count. Count in whole steps; currency counts in whole units of its suffix.
- Never claim a private number, an investor or a customer the user has not confirmed. A logo that should not be there is a legal problem before it is a design one.

## Beat sheets

| Length | Frames and beats |
| --- | --- |
| **10 s** (300f), single scene | Number and its object counting from frame 0 (enter 0–12) · count 0–95, breath 95–120 · **land 120** (confetti 120–123) · meaning 138–210 · thanks and mark share the end card 210–300 (lock by 222, 78f hold, one ambient behaviour) |
| **15 s** (450f) | Count 0–150 (enter 0–12), breath 150–180 · **land 180** (confetti 180–183) · meaning 200–270 · gratitude 270–360, with an image of the community · mark 360–450 (lock by 372, 78f hold, one ambient behaviour) |
| **20 s** (600f) | Count 0–210 on the subject's own object (the repo card filling with stars), breath 210–240 · **land 240** · meaning 258–360 · gratitude 360–480 (avatars or the community image) · mark 480–600 (lock by 492) |
| **30 s** (900f), funding | Hook 0–60, in motion from frame 0 (the product working, not a title) · story act 60–360 (idea → shipped → spread, 3–4 beats of 75f, persisting element) · count 360–540, breath 540–570 · **land 570** · what it means 588–660 · investors 660–735 (logo wall) · gratitude 735–810 · mark 810–900 (lock by 822) |

Every slot fits its hold: a meaning line of ≤ 6 words needs ≤ 69f (`max(30, 9 × words + 15)`, `direction`), a thanks line of ≤ 8 words ≤ 87f, and the mark holds 75–120f after it locks. A site or keynote (a chosen audience, sound on) may open on 30–45f of context, in motion, before the count; take the frames from the meaning beat. The music's button or fade ends **on the last picture frame**.

VO (optional): ≤20 words at 10 s, ≤30 at 15 s, ≤42 at 20 s, ≤64 at 30 s. **Silent during the count** so the ticks and the land are heard; the number is said once, after the land, as spoken ("ten thousand stars").

## The gratitude beat

Not optional: a milestone is never achieved alone, and skipping the thank-you is this format's most common mistake. 60–90f, named ("To every contributor", the community's own word for itself), and **with an image of who is thanked**, not type alone: real avatars floating past (the star template spreads 64 avatars over 136f, each living 64–94f, 60% of them in the side gutters so the copy stays clean), a list of first names, or the clock's object turned into the community (the constellation's points become contributors' names; the map's cities glow as the thanks rises). Real avatars and real names only, fetched with `save-asset` or given by the user; never generated faces presented as real people.

## The end card

The mark (or the name set as a wordmark) locks 10–12f into its slot and holds 75–120f with **one visible ambient behaviour**: the clock's object keeps living (the constellation twinkles, the map's dots pulse) or the mark breathes 1% on ~68f. A frozen end card is a Fix in `direction`'s critique. Nothing new after the mark.

## Logo walls

Investors or notable customers: 60–90f, a simple grid or a slow drift, never held long enough to read one by one, every name confirmed by the user. Logos in one tone (all ink or all white), not their brand colours, so no one logo wins.

## Layout per aspect

Size the number by **width**, not a fixed px: the final string, including separators, prefix, suffix and the 1.06 punch, is ≤ ~82% of the frame width. Measure the final string at a trial size (`measure()` in `three-type`, `measureText` elsewhere) and scale: `size = trial × maxWidth / (1.06 × measured)`. A 9-character string ("2,500,000") in a grotesque at 500 with tabular figures is ≈ 4.8 em wide.

- **16:9**: 250–264 px when it fits (≤ 1575 px wide with the punch), centred or on the left third; the label above or below at 28–46 px.
- **1:1 / 4:5**: ≤ 880 px wide at 1080 (≈ 173 px for "2,500,000", up to ~260 px for "10,000"), sharing the centre with its object.
- **9:16**: number at 40–45% of the height; the final string ≤ 720 px wide (inside x 120–840); the label above it, never in the bottom 37%.
- **The meaning line is the film's second-largest type**: 0.45–0.6 × the number's size (80–100 px under a 170 px number), never caption size. It is the story ("3× since March", "from 12 people to 40"); the unit label stays small.

## Sound

- **Ticks**: one per visible step change, thinned so there are never more than one every 3f; they decelerate with the count, which sells the ease better than the picture, and slow to the crawl in the breath.
- **Riser**: starts `land − riserLength`, ends exactly on the land.
- **Impact**: on the land frame ±1f, layered transient + body; the confetti fires with it.
- **Breath**: the music drops in the 10–30f before the land (the track's own dropout, or a 6–10 dB dip), so the impact is the loudest moment.
- **Levels**: take them from `sound-design`'s `references/sfx-cues.md` and nowhere else: designed SFX at its timing-table levels (counter ticks 0.5, riser 0.55–0.6, impact 0.7–0.85, logo hit 0.9 on the mark), and its synthesised placeholders at 1.0, as its placeholder section says. This skill sets no ladder of its own.
- **Music**: a bright 100–128 BPM track; place the count so the land falls on a downbeat, ideally the start of a phrase. The button or the fade ends on the last picture frame, not before: a fade that finishes early leaves a silent end card.

## Building it

- **Three.js (default)**: digits from `three-type`'s `counter()` (tabular, leading zeros hidden). `counter()` centres the final pattern and right-anchors the digits in it, so to keep the current string centred make one counter per digit length shown for more than a few frames ("###,###" for the count, "#,###,###" from the land), each centred, and swap visibility on the frame the length changes. The clock is `trunc(outQuart, 0.85)` from `components/ease.ts` (`three-camera` `references/rig.md`). The punch is `1 + 0.06 × (prog(f, land, 5, outCubic) − prog(f, land + 5, 13, outCubic))` on the group (not `pop()`, which starts from 0). Confetti is `three-assets`' `references/confetti.md`: a seeded `InstancedMesh` burst from the edges of a box around the number and its label (that file's test scene is this skill's count, centring and land). Avatars and logos via `three-assets`, the stage via `three-look`; a ring is a `RingGeometry` whose `thetaLength` follows the clock.
- **HyperFrames**: tween a proxy value on the timeline and write the formatted string on each update; tabular figures in the font settings; confetti as seeded elements.
- **React**: `<CountText>` from `@genmotion/motion` for the count, a spring or `interpolate` for the punch.

## Good and bad

- Bad: the number counts linearly for 1 s and the confetti fires half a second later. Good: a 180f count on the truncated clock, punch, poppers and impact on the same frame, then the meaning line.
- Bad: frame 0 shows last year's number, still, beside an empty field; the count starts at 1 s. Good: frame 0 is the number already moving over its object.
- Bad: the climb drawn as a rising line with a dot. Good: a star count's constellation filling in; cover the number and it is still a star count.
- Bad: "10K" in the hero and "10,347" in the caption. Good: "10,000 ★" because it is exactly 10,000 today, or "10,347 ★".
- Bad: the meaning line fades in with the count. Good: the count lands, then "Thank you, contributors" rises 20f later.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The confirmed number | Ask the user; `web-research` for public counts | Never estimate |
| Avatars, logos | `save-asset` for the real files | Names as type, over the clock's object turned into the community; no placeholder people |
| Ticks, riser, impact | `sfx` | Credited CC0 sounds, or the track's own hit |
| Music | `music` | SFX-led with room tone |
| Narration | `pick-voice`, then `voiceover` | Silent; the number and the label carry it |
| Seeing it | `capture-frames` | None |
| Loudness | `ffmpeg` | None |
| Direction, moves, mix | `direction`, `motion-language`, `sound-design` | — |

## Checks before you finish

1. The number on screen equals what the user gave, character for character; any abbreviation is true and stated.
2. `capture-frames` at frame 0 and 6 (feeds): the values differ (already counting) and the number is centred (its box's centre within 8 px of the frame's). At 25% of the count, `(shown − start) / (final − start)` > 0.5, i.e. over half the **range**, not the final value.
3. Capture land −1, land, land +2: the digits are final on the land frame, the punch peaks by land +5, confetti is visible by land +2.
4. Capture land +30 and land +60: the digits are identical (nothing still animating) and the string's position has not shifted.
5. The clock's object (constellation, map, ring) reaches its end on the same frame as the last digit.
6. The meaning line enters ≥15f after the land; the gratitude beat exists, names who it thanks and shows them (an image, not type alone).
7. Every logo and avatar was supplied or confirmed by the user.
8. The impact sits on the land frame ±1f; ticks never closer than 3f; `ebur128` gives −14 LUFS ±1 and true peak ≤ −1 dBTP.
9. In 9:16, the number and label sit inside x 120–840, y 270–1210.
10. Cover the number on the 50% frame: the image alone still says whose milestone it is.
11. The meaning line is the second-largest type; the final string with the punch is ≤ 82% of the frame width (≤ 880 px at 1080, ≤ 720 px in 9:16).
12. Confetti: land +2 to land +20 show no piece over the number or its label.
13. The last frame and the frame 30f before it differ on the end card (the ambient behaviour is visible); `silencedetect=noise=-50dB:d=0.3` reports no silence that starts in the last 0.5 s.
14. The `direction` self-critique passes; `validate` passes.
