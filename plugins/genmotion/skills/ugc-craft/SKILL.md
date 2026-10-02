---
name: ugc-craft
description: "The edit language of a short-form UGC ad, with one number for each move: the cadence table and the three-second rule, the breath trim and J/L cuts, the three named zoom moves (jump zoom, punch-in, focus push) and the one creep for stills, the canonical caption spec (grouping, size, stroke, position, timing, platform variants), the sound map with levels, music beds and trend audio, and the texture pass. Load it when cutting and dressing a UGC ad, or when one drags, feels flat or looks AI-made."
---

# UGC craft

Planning decides whether an ad is worth watching; craft decides whether it gets watched. This skill holds the UGC-specific numbers for cutting, moving, captioning and scoring. Shared motion numbers come from `motion-language`, levels from `sound-design`, safe zones from `ugc-ad-foundations`; this skill names how a UGC ad uses them.

Frames are at 30 fps.

## When to use

- Once the beat table in `VIDEO.md` is settled and you are cutting, captioning and scoring a UGC ad.
- When a user says a finished ad "drags", "feels flat" or "looks AI".
- Whenever another skill says "caption spec per `ugc-craft`" or names a jump zoom, punch-in or focus push.

Not for: picking the format (a UGC owner), the opening (`ugc-hooks`), the words (`ugc-scripting`). Footage the user filmed and wants cut (a talking head, a vlog, a podcast clip) belongs to `video-editing`, which has its own caption reference for long-form and SRT work.

## The three-second rule

Nothing on screen holds more than 90f (3 s) without a change: a cut, a zoom move, a caption group, a new element, a state change in the UI, a mark landing. Not a new idea, a **change**. Most flat ads are flat because the shots are too long, not because the script is wrong.

| Section | Shot or change interval | Why |
| --- | --- | --- |
| Hook (first 1.5–3 s) | ≤36f (1.2 s); two or three visual events | The scroll decision is made here |
| Body | 45–75f (1.5–2.5 s) | Long enough to read one caption group and see one action |
| Demonstration | 60–120f (2–4 s), with a change inside every ≤90f | The one place a longer look earns itself |
| CTA | One held shot, ≥60f | The only deliberate stillness in the ad |

## Cutting

- **Hard cuts, on a word or a sound.** A dissolve is a production code. Cut on the first frame of a stressed word, on a SFX transient, or on a music beat (big changes on a bar's beat 1, per `sound-design`).
- **The breath trim.** Cut the silence around every spoken line: leave 2–3f before the first consonant and 3–5f after the last syllable, and keep any remaining gap ≤3f (0.1 s). Generated VO arrives with 0.2–0.5 s of air at each end; trim it with the clip's start offset rather than moving the clip.
- **J and L cuts for cut-aways.** The VO runs continuously; picture cuts away and back. Let the cut-away land 3–6f after the word it illustrates starts, and return before the sentence ends, so the voice motivates the cut.
- **Cut on action.** Cut mid-gesture (a hand entering, a tap, a lid lifting); motion hides the cut.
- **Never cut a step the claim depends on.** A visible jump (a hard cut plus a "2 hours later" caption) is honest; a seamless one that hides time is not.

## The three zoom moves and the creep

Five skills used to define "punch-in" five ways. These are the only four moves a UGC ad uses, and every UGC skill means exactly these.

| Move | Numbers | Use it for | Limit |
| --- | --- | --- | --- |
| **Jump zoom** | Scale steps 1.0 → **1.2** on the cut frame, no ease; the next cut steps back to 1.0 (or to a new framing) | Covering a jump cut on the same face, hands or still, so two takes read as two shots | Alternate 1.0 / 1.2; never two zoomed shots in a row |
| **Punch-in** | 1.0 → **1.12** over **8f inCubic**, hold ≥15f, release over 12f inOutCubic or cut out (the `motion-language` punch-in, at one value) | The stressed word, the price, the music hit | ≤4 per 30 s, ≥60f apart; never during a caption change |
| **Focus push** | Push-in over **30f inOutCubic** to the zoom that puts the target's text at ≥34 px (typically 1.4–2.5×); hold while it is read; release over 24f or cut on the result | Moving the viewer to a UI element, a line in a source, a detail on the product | One per beat; the cursor and marks stay still while the camera moves |
| **Creep** | +3% scale over the shot, inOutSine, plus an optional 4–7 px drift at 0.2–0.3 Hz | Keeping any still alive: a generated photo, a presenter cutout, a stock frame | One ambient behaviour per shot (`motion-language`) |

Zoom interpolates in log space (`motion-language` → `references/easing.md`), centred on the target, not the frame centre. On Three.js a zoom on designed content is a camera dolly (`three-camera`); a zoom on a footage or screenshot plate scales the plate around the target (tested in `video-editing`'s `references/footage-in-scene.md`). Captions live on `three-camera`'s camera-locked overlay, re-fitted after any fov change, so zooms never move them. Never zoom an orthographic camera under captions: its zoom is part of the projection and scales the overlay with it.

## Captions: the one spec

Captions are not optional: the feed is muted by default, and every spoken line is on screen. This is the caption spec every UGC skill cites.

| Property | Value | Why |
| --- | --- | --- |
| Grouping | 1–3 words, ≤15 characters, one line | Read in one fixation |
| Breaks | At punctuation, at any pause ≥5f (0.15 s), or at 3 words | The group matches how the line is said |
| Timing | Each group appears on its first word's start frame and is hard-killed on the next group's start frame (or 6f after its last word ends, whichever is first). Never two groups at once | Stale captions are the classic seek bug |
| Entrance | 4f pop, scale 0.9 → 1, outCubic; no fade-in, no slide | Matches `motion-language`'s two-frame pop family; anything slower reads as a title |
| Active word | One highlight colour, plus a 1.1 scale pop over 4f on the stressed word only | One emphasis per group, one highlight colour per ad |
| Size | 76–96 px at 1080 wide (Bold caption up to 110) | Readable at arm's length on a phone |
| Weight and case | Heavy sans 700–900; sentence case, or ALL CAPS for Bold caption | |
| Stroke | 8 px black stroke (6–10), no drop shadow | A shadow vanishes on a busy frame; a stroke does not |
| Position | One line centred at y 1160 on 1080×1920 (inside y 1110–1210); two lines grow upward to y 1040; never over the mouth or the line being read | `ugc-ad-foundations` shared numbers |
| Text | Captions trim filler the voice says ("so I, uh, tried it" → "I tried it") but never change meaning | |
| Emoji | 0–1 per group, on a keyword, 1.2× the text size | More reads as 2021 |

Platform skins (same geometry, different style):

| Placement | Skin |
| --- | --- |
| TikTok, Reels, Shorts | The spec above |
| Meta feed 4:5, LinkedIn 1:1 or 4:5 | Sentence case, up to 2 lines of ≤42 characters, 52–60 px, white on a 60% black rounded box, no word pop; centred in the lower part of the central 1080×1080 |

**Word timings** come from the audio, never from guessing: the `voiceover` result's own timings when it gives them, otherwise `transcribe` on the generated file, otherwise 2.5 words/s and a check with `capture-frames` on three words. Build captions as their own layer: on Three.js one canvas-texture plane per group in a camera-parented overlay (`three-type`); on HyperFrames timed elements on the timeline with an explicit hide at the group's end; on React one `<TextAnimation>` per group from `@genmotion/motion`, mounted only for the group's frames.

## Sound

`sound-design` holds the levels and the measuring; this is the UGC cue map. Place every cue at the frame its visual event happens, from the same constants the animation uses.

| Beat | Sound | Level (linear / dB) |
| --- | --- | --- |
| Frame 1 | A transient, a downbeat, or a word already in progress. Never silence or a fade-in | — |
| Hard cuts | A short swish on every hard cut, or on none. Half-scored cuts sound like a mistake | 0.5 (−6) |
| UI tap or click | On the press frame, up to 1f early | 0.9 (−0.9) |
| Caption pop (Bold caption only) | A soft tick on keyword groups, not every group | 0.45 (−7) |
| Mark landing, product set-down | Pop or soft impact on the contact frame ±2f | 0.5–0.7 (−6 to −3) |
| The turn | 10f of near-silence (bed and room tone cut), then everything returns on the cut | — |
| Result or success | One confirmation tone on the success frame | 0.6 (−4.4) |
| Room tone under VO-only stretches | Continuous, never digital zero | 0.03–0.05 (−30 to −26) |

At most 2 SFX at once and none over a word that carries the claim; 3–8 cues per 30 s is the working range for a talking-style ad, about one per interaction for a screen demo.

## Music

- **A bed, not a soundtrack.** 0.12 (−18.4 dB) under VO; 0.5–0.6 when only SFX share it; 1.0 when it is the only thing. Instrumental only under any voice. Normalise the source first (`sound-design`).
- **Cut to it.** If there is a bed, hard cuts land on its beats; pick a tempo with whole frames per beat (90, 100, 120 or 150 BPM at 30 fps).
- **Trend audio does not survive an export.** A trending sound is a platform-side attachment with platform-side licensing. Score with a licensed or generated bed (`music`, or `sound-design`'s ladder) and tell the user they can swap to a trending sound in the platform's editor; never rip one into the file.
- **Drop it for the line that matters.** Cutting the bed under the single most important line is stronger than any SFX.

## The texture pass

The last pass, and the one that decides whether it reads as a person or a render:

- **Nothing perfectly centred.** Offset the subject 3–6% of the frame width off the axis.
- **Nothing starts at rest.** Every clip and still is already moving on its first frame (trim the clip's head; start the creep at a non-zero progress).
- **Snap the fast things.** Cuts, caption groups and jump zooms have no ease; only punch-ins and focus pushes are eased.
- **One deliberate imperfection.** A crop that clips a corner, a reframe mid-sentence. Intentional and authored, never random.
- **No brand chrome until the end.** No watermark, logo bug or lower third.

## Good and bad

- **Bad**: every line gets a zoom, alternating in and out, plus a whoosh. **Good**: two punch-ins in 30 s, on the price and the result, each with nothing else moving.
- **Bad**: a four-word caption fading in over 12f at the bottom of the frame. **Good**: two-word groups popping on each word's start frame at y 1160, hard-killed when the next group starts.
- **Bad**: the music at 0.4 under the VO because "it's a good track". **Good**: 0.12 under the VO, back to 0.5 under the product moment, cut entirely for the CTA line.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Word timings | `voiceover` timings, or `transcribe` | 2.5 words/s, checked with `capture-frames` |
| Sound effects | `sfx` | Credited CC0 sounds via `web-research` + `save-asset`; or the bed's own transients |
| Music | `music` | `sound-design`'s ladder; no music beats an unlicensed track |
| Trims, loudness | `ffmpeg` | None for loudness: an unmeasured export is not finished |
| Moves | `motion-language`, `three-camera` on Three.js | Hard cuts between two framings of the same still |

## Checks before you finish

1. `capture-frames` every 90f (3 s) across the ad: no two adjacent captures look the same.
2. `capture-frames` on two caption groups at their first frame: one line, inside y 1110–1210, 8 px stroke, no other group visible.
3. Count the moves: eased punch-ins ≤4 per 30 s and ≥60f apart; no jump zoom followed by another zoomed shot.
4. `capture-frames` at the start and end of each focus push: the target's text is ≥34 px at the end, and the caption did not move.
5. Measure the export with `ffmpeg` (`ebur128=peak=true`): −14 LUFS ±1, true peak ≤ −1 dBTP; the first 0.1 s is not silent.
6. Listen at every VO line: the bed clip is 0.12, and the claim line is clear.
7. Then run `ad-qa`.
