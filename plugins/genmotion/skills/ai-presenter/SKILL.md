---
name: ai-presenter
description: "Putting a person on screen in an ad when there is no footage: the user's own clip first, or a generated portrait driven by a lipsync model. Covers when not to use a face at all, the lipsync input spec (portrait, audio, neutral mouth), framing and headroom for 9:16, one take length (four seconds), lip-sync tolerance in frames, matching voice to face, the uncanny tells and the edit patterns that hide them, the seek-safe build on each engine, and the line between a synthetic presenter and a fabricated customer. Load it alongside a UGC owner, never instead of one."
---

# AI presenter

Most UGC formats are stronger with a person; most briefs arrive without one. This is how to close that gap without producing something that reads as fake, and without saying anything untrue about a real person.

Frames at 30 fps; positions on 1080×1920. Shared numbers (safe zones, moves, levels) are in `ugc-ad-foundations` and `ugc-craft`.

## When to use

- A UGC owner wants a face the user has not supplied: the presenter in `ugc-green-screen`, the person in `ugc-problem-solution`'s problem beat or CTA, the verdict face in `ugc-unboxing`.
- The user asks for "a person talking to camera", "an avatar reading my script", "a creator in the ad".

**Consider not using one first.** A synthetic presenter is the element viewers are best at spotting. For software, a faceless format (`ugc-screen-demo`, presenter-free `ugc-green-screen`) usually does the job better. If the user has filmed themselves and the ad is mostly that footage, it is an edit: `video-editing`.

## The two routes

| Route | How | Wins when | Costs |
| --- | --- | --- | --- |
| **The user's own clip** | `save-asset`, then trim and re-encode per `screen-capture` | Always, when it exists. Ask for it before offering a synthetic one; founders with a phone usually have not thought to offer it | They have to shoot it: chest up, window light, phone vertical, 3–5 takes of each line |
| **Generated portrait + lipsync** | `generate-image` a portrait, then drive it with a lipsync model through the `fal` connector, one take per line | A specific look is needed and no footage exists | Weak on long takes; every take ≤4 s |

## When the user can film it

Send them this, in one message, before generating anything:

- Phone vertical, at eye height, on something steady; the main camera, not the selfie camera if someone else can press record.
- Chest up, a window to one side, a real room behind (not a blank wall).
- Each line as its own take, said three times: once flat, once a little warmer, once faster. Start talking one beat after pressing record.
- Quiet room, phone 50–80 cm from the mouth; no music playing.
- Send the original files (not a messaging-app copy, which re-compresses them).

Their takes then go through the same trim, re-encode and framing as below; they are not bound by the four-second limit.

## Lipsync inputs

What the model needs to give a clean mouth:

| Input | Spec | Why |
| --- | --- | --- |
| Portrait | ≥1024 px on the short edge, generated **wider than 9:16** (3:4 or 4:5) so you can reframe between takes | Room to crop and to jump-zoom without upscaling |
| Pose | Front-facing to three-quarter, eyes to lens or just off it, head straight | Profile and tilted heads distort the mouth |
| Mouth | Closed, relaxed, neutral, no teeth, no smile; nothing near the mouth (hands, hair, mic) | The model animates from this rest pose |
| Light | Soft, one side brighter, the face evenly readable; a real room behind | Hard shadows across the mouth smear when animated |
| Audio | The line's VO clip, WAV, 48 kHz mono, normalised to −16 LUFS, one line per take, with the air trimmed (`ugc-craft` breath trim) | Clean onsets give clean visemes |
| Length | ≤4 s (120f) per take | The one take length in this pack (below) |

## Framing for 9:16

- **Chest up**, not head and shoulders (a corporate portrait) and not waist up (too small at feed size).
- **Face centre about 40% across** (x ≈ 430); leave the space on the side the eyes point to.
- **Eyes at y 500–750**, top of the head at y 300–380: inside the readable area (x 120–840, y 270–1210) and clear of the top UI.
- **The caption line** (y 1160) falls on the chest, never on the mouth.
- **A real room behind**, unevenly lit, with something in it. A gradient or a heavy blur is a studio code.
- **Reframe between takes**: alternate two crops (a jump zoom 1.0 / 1.2 from `ugc-craft`, or the face shifted 6% in x). A reframe mid-sentence is one of the strongest native codes.

## One take length: four seconds

Every synthetic take is **≤4 s (120f)**, then a cut: to a reframe, the product, a cut-away, a caption card. The longer a synthetic face holds, the more the tells add up (stillness, blink rhythm, the body not moving with the mouth). Across the whole ad, the presenter is on screen about a third of the time and the format carries the rest. The user's real clip is not bound by this, only by `ugc-craft`'s three-second rule for a change on screen.

| Tell | Fix (always an edit, not a model setting) |
| --- | --- |
| A long unbroken take | Cut at ≤120f to a cut-away, the product or a reframe |
| The body still while the mouth moves | Cut on any gesture the model produces; add the `ugc-craft` creep (+3%) so the frame lives |
| Eyes that never blink, or blink on a metronome | Cut before 120f |
| Perfect, centred, still framing | The 40% offset, the creep, a reframe on the next take |
| Audio cleaner than the room | Do not degrade the voice; cut shorter and let the bed carry the gaps (never a synthesised room tone or noise) |
| No hands ever | Cut to a hands-only product shot; nobody checks whether they are the same hands |
| Teeth or tongue smearing | Regenerate from a closed-mouth portrait; shorter lines |

## Sync tolerance

Lips are within **±1 frame** (33 ms) of the audio. Check on plosives: at the frame where the VO says a "p", "b" or "m", the lips are closed. If the whole take is offset, slide the clip by whole frames; never stretch it. A presenter clip and its audio are two clips placed at the same frame: place the VO with `place-audio` at the clip's start frame, and if the lipsync output carries its own audio track, strip it and use the original VO so levels stay normalised.

## Voice

One voice per project, chosen once with `pick-voice` and reused for every take; a voice that changes between scenes breaks the whole illusion. Match the voice to the face on **age, then energy, then accent**: age mismatch is the one viewers consciously notice. Delivery direction matters more than the voice: the usual failure is over-performance (a bright read sounds like an ad because it sounds like a read). Direct it flat and conversational, lifting only on the turn.

## Building it

Every presenter clip, generated or the user's, is trimmed and re-encoded per `screen-capture` (VP9 WebM at the project fps, a keyframe every 15 frames, a 0.5 s tail) before it is placed, because the renderer seeks every frame and the CLI cannot decode H.264. On Three.js each seek is registered with the scene's loading manager so the export waits for it.

- **Three.js** (default): the clip is a video texture on a plane sized from its real pixels, seeked per frame, never played (`three-assets`); the creep and reframes are camera moves (`three-camera`); a cutout over a source uses the key-shader route in `ugc-green-screen`.
- **HyperFrames**: a `<video>` element on the timeline inside a wrapper the timeline scales; audio from the separate VO clip.
- **React**: the clip in a wrapper scaled with `interpolate`; audio placed on the timeline.

## The honesty line

A synthetic presenter is fine; one presented as a specific real customer, employee or expert is not. Apply the claims rules in `ugc-ad-foundations`:

- No words attributed to a named person unless the user supplied the words and the name.
- No testimonial stating a result the user has not given you: "I lost fifteen pounds" from a generated face is a fabricated claim with a face on it.
- No implied identity ("as a dentist…") unless it is true and supplied.
- A generic person saying a generic true thing is fine.

When the brief asks for a testimonial with specifics nobody supplied, write a bracketed placeholder and tell the user in one sentence.

## Good and bad

- **Bad**: a 12 s generated take reading the whole script. **Good**: three takes of ≤4 s, two crops, product cut-aways between.
- **Bad**: a centred head-and-shoulders portrait on a gradient. **Good**: chest up, face at 40% across, a kitchen behind.
- **Bad**: a bright, smiling read. **Good**: flat, tired through the problem, a small lift on the turn.
- **Bad**: "Hi, I'm Sarah, a nurse, and this changed my life." **Good**: an unnamed person saying something true about the product.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| A talking presenter | The `fal` connector with a lipsync model; offer it once with `recommend-integration` | The user's clip via `save-asset`, or a faceless format |
| The portrait | `generate-image` | The user's own photo via `save-asset` (their consent, their face) |
| The voice | `pick-voice` then `voiceover`; the `elevenlabs` connector adds cloning and design | The user records the lines; or captions only and no presenter |
| Trimming, re-encoding, stripping audio | `ffmpeg` | Use the clip as delivered and check the sync frames twice |
| Placing the VO | `place-audio` | Edit the project's audio list by hand |

## Checks before you finish

1. `capture-frames` on the first and last frame of every presenter take: no synthetic take runs past 120f.
2. On one captured frame per take: chest up, face centre near x 430, eyes in y 500–750, head top below y 270, caption not over the mouth.
3. Capture the frame of two plosives per take: lips closed within ±1f.
4. Every presenter clip is VP9 WebM with the project fps as both `r_frame_rate` and `avg_frame_rate` and a keyframe every 15 frames (`screen-capture`'s probe).
5. One voice across the project (one `pick-voice` choice in `VIDEO.md`).
6. Read every line the presenter says: no identity or result nobody supplied.
7. `validate` passes; then the owner's checks and `ad-qa`.
