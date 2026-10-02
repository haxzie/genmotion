---
name: freeform-video
description: "The fallback when no other skill owns the request: a custom video of any kind, such as a birthday clip, a talk or event intro, an event countdown, an abstract loop, a visual for a song, an invitation, a quote card or an internal update. Covers a three-concept pitch before building, a five-line plan, per-format defaults (length, aspect, style family, energy curve, sound), the timing triad for every element, beat sheets for 10, 20, 30 and 60 seconds, loop and countdown rules, and frame-checked finishing. Load it when search finds no clear format match."
---

# Freeform video

Most requests fit a format skill. When none does, this is the default: a short film planned from first principles, with one idea developed beat by beat, rather than improvised scene by scene. The risk in this skill is the median video (a centred title fading up, a gradient, a stock swell), so the first job is to find an idea worth building. Frames at 30 fps. Read `direction` first, then this; moves come from `motion-language`, the mix from `sound-design`.

## When to use

- Search ranked nothing clearly above the rest, or the top owners are about something else.
- Personal and occasion pieces: "a birthday video for my friend", a wedding or farewell clip, an invitation.
- Event pieces: a talk intro or title card, an event countdown, a looping screen for a venue.
- Abstract or musical pieces: a looping visual, a visual for a song, a quote animation, an internal update or team shout-out.
- A brand guidelines film (family I) or a title sequence longer than a sting.

If an owner fits even roughly, use it: its structure is worth more than a blank page.

| The ask is really | Owner |
| --- | --- |
| A product, app or company launch | `launch-playbook` |
| A number to celebrate | `announce-milestone` |
| Only a logo, 2–8 s | `brand-sting` |
| Explaining something | `explainer` |
| Cutting the user's own footage | `video-editing` |
| A paid vertical ad | the `ugc-*` owners |

## Ask first

1. **Where will it play, and how long should it be?** A phone story, a projector at an event, a group chat, a site.
2. **What should someone feel or do after watching?** Offer two options with a recommendation.
3. **What personal material is there?** Names (spelled exactly), photos, a song, in-jokes, dates. For personal pieces this is the whole film.

## Step 1: pitch three concepts, build one

Write three one-line concepts as "We show X as Y" (`direction` Step 3), each down a different path:

1. **The subject's own world**: built from their nouns. A friend who climbs: the birthday message climbs a wall hold by hold.
2. **The feeling**: a calm farewell as a slow sunset that the names drift through.
3. **An unexpected format**: a countdown, a front page, a chat thread, a boarding pass, a game's loading screen, a weather report.

Pick the least obvious one that still serves the purpose. If two have the same silhouette (centred title, image underneath), replace one. Tell the user the three and which you chose; for a personal piece, let them pick.

## Step 2: the five-line plan

Write into `VIDEO.md` with the Direction block:

1. **Purpose**: who watches, where, what they feel or do after.
2. **Length**: from the table below.
3. **Aspect**: 9:16 for phones and stories, 16:9 for screens and projectors, 1:1 or 4:5 for feeds and chats.
4. **Message**: one sentence.
5. **Beats**: 3–6, one line each, with frames.

## Defaults by kind

| Kind | Length | Aspect | Family | Energy curve | Sound |
| --- | --- | --- | --- | --- | --- |
| Birthday, farewell, thank-you | 15–45 s | 9:16 or 1:1 | E (as a chat), J (an age that counts up), or the concept's own world | Warm build → one peak on the name or the wish → soft end | A bright track at 1.0, a pop per photo |
| Talk or event intro | 8–20 s | 16:9 | A (beat-cut type) or I | Anticipation → title hit at 60–70% → hold | Track at 1.0, hit on the title |
| Event countdown | 10–60 s | 16:9 | A | Steps up every digit, peak at zero | A tick per second, a hit at zero |
| Abstract or venue loop | 6–30 s | 16:9 or the screen's own | G, I or C | Flat and breathing; no peak | None, or an ambient loop that cycles cleanly |
| Visual for a song | the track's length | 16:9 or 9:16 | H (music video) | The track's own | The song at 1.0, nothing else |
| Quote or poem card | 8–20 s | 1:1, 4:5 or 9:16 | A or F | Words build to the last line | Optional soft bed |
| Invitation | 10–20 s | 9:16 | Concept's own | Tease → the date and place (peak) → details held | Track at 1.0 |
| Internal update | 20–60 s | 16:9 | B or J | Steps to the one thing to remember | Bed 0.18 under VO, or none |

## Timing triad (every element)

- **Enter** 9–18f (0.3–0.6 s), decelerating (outCubic or outSmooth); text by word, 3–4f apart.
- **Hold** at least `max(30, 9 × words + 15)` frames from the frame it is legible; ≥2× its entrance.
- **Exit** about 0.6× the entrance (6–9f for text), accelerating (inCubic), clearing 4–8f before a cut.
- **Scene phases**: build in the first 30%, breathe 30–70% (one ambient behaviour: a 4–7 px camera drift, a 2–4 px float or a 0.4–2.2% breathe), resolve in the last 30%.

All numbers and curves are in `motion-language`; use them as given.

## Beat sheets

| Length | Beats (frames) |
| --- | --- |
| **10 s** (300f) | Hook 0–60 · develop 60–180 · **peak 180–240** · resolve and hold 240–300 |
| **20 s** (600f) | Hook 0–90 · develop 90–330 (2 beats) · breath 330–350 · **peak 350–450** · resolve 450–600 (final hold ≥75f) |
| **30 s** (900f) | Hook 0–90 · develop 90–540 (3–4 beats of 110–150f) · breath 520–540 · **peak 540–660** · resolve 660–900 |
| **60 s** (1800f) | Hook 0–120 · act 1 120–720 · a smaller peak ~700 · act 2 720–1260 · breath 1240–1260 · **peak 1260–1440** · resolve 1440–1800 |

The peak sits at 60–75% for most freeform pieces (later than a launch, because there is no product to reveal early); the last 60–120f are calmer than everything before them.

### Directed example: 20 s birthday, 9:16, for a group chat

| # | Frames | Job | On screen | Sound |
| - | - | - | - | - |
| 1 | 0–90 | Hook | A chat thread already open: "is everyone in??" (3 → 42f) | Message ping on the bubble's first visible pixel |
| 2 | 90–210 | Develop | Six friends each send one word, bubbles 20f apart, spring from the tail | A ping per bubble, alternating lanes |
| 3 | 210–330 | Develop | Photos arrive as image bubbles, 30f apart, each held long enough to recognise | Soft pop 0.5 per photo |
| 4 | 330–350 | Breath | Typing dots, nothing else | The track drops out |
| 5 | 350–450 | **Peak** | The six words fly out of their bubbles and lock into "HAPPY 30TH, SAM" | Track's drop + impact 0.8 on the lock |
| 6 | 450–600 | Resolve | Reactions bloom (18f springs, 4f apart); the line holds | Track rings out on its button |

## Special rules

- **Loops**: the last frame equals the first (on the export, last frame vs frame 0 at 320 px measures PSNR ≥ 30 dB, `direction`'s critique §1); every ambient cycle divides the loop length exactly (a 300f loop takes sines with periods of 300, 150, 100, 75 or 60f); no fade to black; any sound is an ambient bed whose end crossfades into its start.
- **Countdowns**: one digit per second (30f) or per beat; each digit cut on the second, held still, with a tick at 0.45–0.55 on its first frame; a hit at 0.8–0.9 on zero, then the title.
- **Visual for a song**: the music clock drives everything; scenes start on bar lines, cuts on beats, big changes on phrase starts (`sound-design` has the beat grid). Lyrics, if any, arrive about 0.15 s before the sung word.
- **Personal pieces**: names spelled exactly as given, photos from the user only (`save-asset`), no generated faces of real people, nothing private on a piece meant for a group chat unless the user said so.
- **Fade to black** is allowed only on the very last 14–16f; between scenes, carry an element, flood or exit-then-cut.

## Building it

- **Three.js (default)**: `three-look` before the first scene (stage, light, palette), `three-type` for text, `three-camera` for pushes, drift and orbits, `three-transitions` for floods, irises and flashes, `three-assets` for photos and logos. One shared `components/` module for the recurring object and the house curves.
- **HyperFrames**: one sub-composition per beat; finite tweens only; `<audio>` for the track.
- **React**: one scene per beat with `@genmotion/motion`.

## Good and bad

- Bad: "Happy Birthday Sam!" fades up over a confetti gradient for 10 s. Good: a group chat where 30 friends each send one word, which assemble into the wish on the drop.
- Bad: an event countdown where each digit zooms and spins differently. Good: one digit per second, hard cut, the same tick, a flash and the title on zero.
- Bad: a "cool intro" that is a logo with a lens flare. Good: the talk's title typed into a terminal and run, the screen fills with its output, the speaker's name lands on the hit.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Photos, logos, the user's song | `save-asset` | Ask the user to put files in `assets/` |
| Music | `music` | Per `sound-design`'s ladder; without one, an SFX-led piece |
| Sound effects | `sfx` | Credited CC0 sounds, or the music's own transients |
| Images that do not exist yet | `generate-image` | Type and shapes only; never a generated photo of a real person |
| Seeing it | `capture-frames` | None |
| Loudness, loop check | `ffmpeg` | None |
| Direction, moves, mix | `direction`, `motion-language`, `sound-design` | — |

## Checks before you finish

1. `VIDEO.md` has the three concepts, the chosen one, the five-line plan, the Direction block and a Beats table whose frames sum to the length; the export matches the planned length and aspect.
2. `capture-frames` on one frame per beat: each shows its line of the plan; frame 15 already shows the hook (no fade from black for a phone or feed piece).
3. The peak is at the planned frame and the 10–30f before it are calmer.
4. Every text line meets its hold formula; exits finish 4–8f before each cut (the frame 3f before a cut shows background only).
5. Names, dates and places are exactly as the user gave them.
6. Loops: the first and last frames are identical (compare the captures) and the audio has no click at the loop point.
7. Every cut is a handoff or a clean exit-then-cut; a fade to black only at the very end.
8. With sound: `ebur128` gives −14 LUFS ±1 and true peak ≤ −1 dBTP; frame 1 is audible, and the last picture frame lands on the music's button or inside a fade that ends on a bar line.
9. The `direction` self-critique passes (the swap test: this could not be anyone else's video); `validate` passes.
