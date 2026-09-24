---
name: ugc-craft
description: "The edit language of a short-form ad: jump-cut cadence and the breath trim, the b-roll cut-in rule, caption styles per platform and how to build them word by word, zoom punches on emphasis, the sound-design beats that hold retention, music choice and why trend audio does not survive an export, and the never-three-seconds-without-a-change rule. Load it when you are cutting and dressing an ad rather than planning one."
---

# UGC craft

Planning decides whether an ad is worth watching. Craft decides whether it gets watched. This is the second half.

## When to use

Load this once the storyboard is settled and you are cutting, captioning and dressing the ad. Also load it when a user says a finished ad "drags", "feels flat", or "looks AI".

Skip it for format choice (a `ugc-*` style skill), the opening (`ugc-hooks`) and the words (`ugc-scripting`).

## The three-second rule

Never let three seconds pass without a change. Not a new idea, a *change*: a cut, a punch-in, a caption swap, a new element entering, a colour shift, a sound. Retention on short-form is a function of visual event density, and a held shot longer than three seconds is where viewers leave.

This is the single most useful thing in this document. Most flat ads are flat because the shots are too long, not because the script was wrong.

## Cutting

**Jump cuts, not dissolves.** A dissolve is a production code. Cut hard, and let the cut be visible. Two takes of the same framing spliced with a one-frame mismatch reads as native; the same two takes crossfaded reads as an ad.

**The breath trim.** Cut the half-second of silence before and after every spoken line. This is where most of the dead air in a cut lives. Aim for lines that start almost on top of each other, because that is how people actually talk when they are excited about something.

**Cadence by section:**

| Section | Average shot length |
| --- | --- |
| Hook | Under 1.2s. Two or three visual events inside three seconds. |
| Body | 1.5 to 2.5s. Longer only when the thing on screen is genuinely being watched. |
| Demonstration | 2 to 4s, the one place a longer hold earns itself. |
| CTA | One shot, held. The only deliberate stillness in the ad. |

**Punch on emphasis.** When a line has a stressed word, punch in on it: a 3 to 6 percent scale step, one frame, no ease. Not a zoom, a step. Three or four across a 30-second ad, no more; past that it reads as a nervous tic. Read your project's own authoring guidance for the exact motion API this needs.

## B-roll

Any run of speech longer than 15 to 20 seconds without a cut-away needs one. The cut-away covers the jump, breaks the visual monotony, and buys a place to hide a bad take.

What works as a cut-away, in order of preference: the actual thing being described, the user's own footage, a screen recording, a generated still with a slow move on it, typography. What does not work: a stock shot of somebody smiling at a laptop.

Sourcing is `stock-and-broll`.

## Captions

Captions are not optional. Most of the audience never turns the sound on, and styled per-word captions measurably improve retention even for the ones who do.

| Platform | The look it expects |
| --- | --- |
| TikTok | Word by word, heavy weight, thick stroke or a solid block behind. Centred, around 62 percent down the frame. |
| Reels | Similar, slightly smaller, often two lines. Same vertical position. |
| Shorts | Cleaner. One or two words, less stroke, higher contrast. |
| Meta feed | Two to three lines, sentence case, restrained. It is a feed, not a full-screen player. |

Rules that hold everywhere:

- **Never at the true bottom.** The bottom fifth is the platform's own UI. Captions sit at roughly 60 to 70 percent down.
- **One to three words per card** for word-by-word styles, a short clause for line styles.
- **Word timing comes from the audio**, not from guessing. If the narration was generated, use its word timings.
- **The caption is not the script.** Trim filler words out of the caption even when they are spoken. "So I, uh, tried it" captions as "I tried it".
- **Stroke, not shadow.** A drop shadow disappears on a busy frame. A 6 to 10px stroke does not.

For a fuller treatment, build the caption track as its own layer, timed word by word off the narration, with a heavier styled skin for a loud hook-led cut or an embedded, cinematic placement for a quieter one. `ugc-ad-foundations`'s `ugc-bold-caption` frame preset carries a caption skin already sized for this.

## Sound

Sound is half of retention and the half people skip.

| Beat | Sound |
| --- | --- |
| Frame 1 | Something. Music starting on a downbeat, a transient, a word already in progress. Never silence. |
| Every hard cut | A short whoosh, or nothing at all, but be consistent. Half-scored cuts sound like a mistake. |
| Every UI interaction | A click. A screen demo with silent clicks reads as a mockup. |
| Every caption card, in a bold-caption style | A tick or a soft pop. Subtle enough to be felt, not heard. |
| The turn | The audio *drops*. One beat of near-silence before the solution is the loudest thing in the ad. |
| The result | A confirmation tone, one note, resolving. |

Generate them with `generate_sfx`, one per moment, and place each one at the frame it belongs to. Mix the levels afterwards: balance each effect against the voiceover and the music bed by ear.

## Music

- **A bed, not a soundtrack.** Under narration it sits far enough down to be felt rather than heard: duck the bed under the voiceover (a voiceover carve), pulling the music down whenever a line is playing and bringing it back up between lines.
- **Trend audio does not survive.** A trending sound is a platform-side attachment, not a file; it cannot be baked into an export, and licensing it into a rendered MP4 is a different question from using it natively. Score with a licensed bed and tell the user they can swap to a trending sound in the platform's own editor if they want it.
- **Cut to its transients.** If there is a bed, the hard cuts land on its beats. This costs nothing and is most of what "professionally edited" means.

## The texture pass

The last thing, and the thing that decides whether it reads as a person or as a render:

- **Nothing is perfectly centred.** Offset the important things a few percent.
- **Nothing starts at rest.** Every clip begins mid-motion.
- **No easing on the fast things.** Snap the cuts, snap the caption cards, snap the punches.
- **Let one thing be slightly wrong.** A crop that clips a corner, a frame that drifts. Intentional imperfection, not random.
- **No brand chrome until the end card.** No watermark, no logo bug, no lower third.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Word timings for captions | The voiceover's own timings from `generate_voiceover` | Time them by hand at 2.5 words per second and check with `capture_frames` |
| Sound effects | `generate_sfx` | A music bed with cuts on its transients. Never a silent cut. |
| Cut-away footage | `save_asset`, `generate_image`, or `stock-and-broll` | Typography cut-aways. A full-frame line of text is a legitimate b-roll shot. |
| Mixing and ducking | Balance levels and duck the bed under narration (a voiceover carve) | Set a static volume per clip and check by ear on the export |
| Punch-ins and moves | A small, fast scale step on the stressed word, one frame, no ease | Hard cuts between two framings of the same still |

## Checks before you finish

1. Scrub the ad in three-second steps with `capture_frames`. Any two adjacent captures that look the same mark a shot that is too long.
2. Mute it and watch. The pitch survives.
3. `capture_frames` on two caption cards. Legible at arm's length, off the bottom fifth, stroked not shadowed.
4. Listen to the first half-second. There is sound in it.
5. Count the punch-ins. Four or fewer in 30 seconds.
6. This project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).
