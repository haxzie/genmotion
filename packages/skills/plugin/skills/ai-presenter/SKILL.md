---
name: ai-presenter
description: "Getting a person on screen when there is no footage: a generated presenter driven by lipsync, or the user's own clip. Covers the two routes and when each one wins, framing and crop for a vertical canvas, matching a voice to a face, the uncanny-valley failure modes and the edit patterns that dodge them, and the line between a synthetic presenter and a fabricated customer. Load it alongside a face-led ugc-* format, never instead of one."
---

# AI presenter

Most UGC formats want a person. Most briefs arrive without one. This is how to close that gap without producing something that reads as fake, and without saying something untrue about a real person.

## When to use

Load this when a face-led format (`ugc-testimonial`, `ugc-street-interview`, `ugc-podcast-clip`, `ugc-founder-story`, `ugc-skit`, `ugc-green-screen`) needs a presenter the user has not supplied.

**Consider not using it first.** A synthetic presenter is the highest-risk element in an ad: it is the thing a viewer is best at spotting. Before reaching for one, check whether a faceless format does the job. For software especially it usually does, and it does it better.

Faceless formats that need no presenter at all: `ugc-screen-demo`, `ugc-text-story`, `ugc-asmr-product`, `ugc-listicle`, and most of `ugc-green-screen`.

## The two routes

| Route | How | Wins when | Costs |
| --- | --- | --- | --- |
| **Generated portrait plus lipsync** | `generate_image` a portrait, then drive it with a lipsync model through the fal connector | You need a specific look, and no real footage exists | Weakest on long takes. Good for four to six seconds; cut before it runs longer. |
| **The user's own clip** | `save_asset` their recording, then `ffmpeg` to trim and reframe | Always the best option when it exists | Requires the user to have shot something. |

Ask for route two before offering one. A founder with a phone has better footage than any model will produce, and they usually have not thought to offer it.

## Framing

The crop is what makes a presenter read as a creator rather than a spokesperson.

- **Chest up**, not head and shoulders. Head and shoulders is a corporate portrait.
- **Off-centre.** Put the face about 40 percent across, not 50. Leave the dead space on the side the eyeline points at.
- **Eyes at the upper third**, not the middle. A face centred vertically reads as a passport photo.
- **The background is a real room**, unevenly lit, with something in it. A gradient or a blur is a studio code.
- **Vertical crop from a wider source.** Generate or shoot wider than 9:16 and crop in, so you have room to reframe between cuts. A reframe mid-sentence is one of the strongest native codes there is.

## Voice

One voice per project, chosen once with `pick_voice` and reused. A presenter whose voice changes between scenes is the fastest way to break the whole illusion.

Match the voice to the face on age, energy and accent, in that order. A mismatch on age is the one viewers consciously notice; a mismatch on accent they feel without naming.

Delivery direction matters more than voice selection. The failure is almost always over-performance: an avatar reading brightly sounds like an ad because it sounds like a read. Direct it flat, conversational, with the energy only lifting on the turn.

## Dodging the uncanny valley

The tells are all about duration and stillness. Every fix is an edit decision, not a model decision.

| Tell | Fix |
| --- | --- |
| A long unbroken take | Cut every 2 to 4 seconds. Cut away to b-roll, the product, a caption card. |
| The body does not move while the mouth does | Keep takes under six seconds, or cut on any gesture the model does produce. |
| The eyes do not blink or blink too regularly | Cut before it becomes noticeable. Three seconds is safe, eight is not. |
| Perfect framing, perfectly still | Add a slow drift: 2 to 3 percent scale over the shot. |
| The audio is cleaner than the room | Do not fix this by degrading the audio. Cut shorter instead. |
| Hands never appear | Cut away to a hands-only shot of the product. Nobody checks whether they are the same hands. |

The pattern underneath all of it: **the presenter is a cutaway, not a shot.** Build the ad so it works with the presenter on screen a third of the time, and the format carries the rest.

## The honesty line

A synthetic presenter is fine. A synthetic presenter presented as a specific real customer is not.

- Never attribute words to a named person unless the user supplied the words and the name.
- Never write a testimonial that states a result the user has not given you.
- Never imply the presenter is an employee, a customer or an expert unless they are.
- A generic person saying a generic true thing is fine. A generic person saying "I lost fifteen pounds" is a fabricated claim with a face on it.

If the brief asks for a testimonial with specifics nobody supplied, write the line with a bracketed placeholder and say so in a sentence rather than inventing it.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| A talking presenter | The `fal` connector: `generate_image` a portrait, drive it with a lipsync model | The user's own clip through `save_asset`, or a faceless format. Recommend the connector once with `recommend_integration` and carry on. |
| The voice | `pick_voice` then `generate_voiceover`, or the `elevenlabs` connector | The built-in generator covers this; the connector only adds voice cloning and design. |
| A portrait to drive | `generate_image` | The user's own photo through `save_asset`. |
| Trimming and reframing | `ffmpeg` on the shell PATH | Crop in CSS on the clip's wrapper instead. |
| The drift that keeps a take alive | Your project's own motion or keyframe authoring guidance | Cut more often. |

## Checks before you finish

1. `capture_frames` on the presenter's first and last frame of each take. No take runs longer than six seconds without a cut.
2. Look at the crop: chest up, face off-centre, eyes on the upper third.
3. Play it and watch the mouth. If you are watching the mouth, the take is too long.
4. Read every line the presenter says. Is any of it a claim nobody gave you?
5. One voice across the whole project.
6. This project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).
