---
name: announce-milestone
description: "Funding rounds, ARR, star counts, user counts, acquisitions: the number-hit choreography (a 1.2 to 1.6 second count-up, then hold, label after value), what actually earns a milestone video, the gratitude beat, and investor or customer logo walls. Load it when the ask is a number going up, with no feature to demonstrate. Not this skill when there is a product to show: use launch-playbook or announce-feature instead."
---

# Announce milestone

A milestone video has no demo. The number is the whole content. Everything here exists to make one number land with weight.

## When to use

Load this for a funding round, an ARR or user-count milestone, a star-count or download-count celebration, or an acquisition. Route elsewhere when there is a product moment to show alongside the number; a number plus a demo is `launch-playbook`'s metric-first shape, not this.

## What earns a milestone video

Not every number is worth one. Before building, check it against this:

- **It is a real threshold**, not an arbitrary point in a steady climb. 10,000 users earns a video; 10,347 does not.
- **It moved recently.** A milestone video about something that happened eight months ago reads as filler.
- **It is verifiable or self-evidently true** (a public GitHub star count, a public funding announcement). Never state a private number as if it were public without the user's explicit confirmation to share it.

If none of these hold, say so and suggest `announce-feature` or a plain social post instead of forcing a milestone shape onto a number that does not deserve one.

## The count-up

This is the single most load-bearing piece of choreography in the format, and it is easy to get wrong by rushing it.

| Phase | Duration | What happens |
| --- | --- | --- |
| Ramp | 1.2 to 1.6s | The number counts up from zero (or from the last milestone), decelerating into place. Tween a proxy value and write the formatted number on update; never animate with a wall-clock timer. `font-variant-numeric: tabular-nums` so the digits do not shift width mid-count. |
| Hold | 1.5 to 2.5s | The final value sits still. This is the moment, not the count. |
| Label | After the hold, not during | The label (what the number means) fades or steps in only once the number has landed. Value, then meaning, never together. |

A ring or arc fill, if the design wants one, finishes exactly in sync with the count-up: drive it off the same proxy value as the digits, not a separate timer of its own. Read your project's own authoring guidance for the exact technique (a stroke reveal, a shader uniform, whatever this engine's equivalent is).

## Structure

| Beat | Time | Job |
| --- | --- | --- |
| Cold open | 0 to 4s | The number's context, or a hint of scale, before the number itself appears |
| The count-up | 4 to 9s | As above |
| What it means | 9 to 16s | One sentence: why this number matters, to whom |
| Gratitude | 16 to 22s | See below |
| Close | 22 to 26s | Wordmark, held |

For a funding announcement specifically, insert a short second act between "what it means" and gratitude: idea to shipped product, in three or four fast beats, the way `lovable-funding-announcement` builds a swelling grid of builder cards before its own number lands.

## The gratitude beat

Not optional. A milestone is never achieved alone, and skipping the thank-you is the single most common mistake in this format. Name who it is for: users, contributors, customers, the team. It does not need to be long, three or four seconds is enough, but it has to be there.

## Logo walls

For investors or notable customers: two to three seconds, never held long enough to read individually, arranged as a simple grid or a slow horizontal drift. Never claim a relationship (investor, customer, partner) that has not been confirmed by the user. A logo wall with a name that should not be there is a legal problem before it is a design one.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The real number, confirmed | Ask the user directly | Never estimate, round without saying so, or reuse an old number |
| Narration | `pick_voice` then `generate_voiceover` | A silent cut. The count-up and the label carry the whole thing on their own. |
| The count-up and ring fill | Read your project's own authoring guidance for the exact motion API | A static number with a hard cut in, weaker but honest |
| Contributor or customer avatars | `save_asset` for the real ones | Do not generate placeholder avatars presented as real people |

## Checks before you finish

1. The number on screen matches exactly what the user gave you. No rounding without saying so.
2. `capture_frames` at the end of the count-up hold. The digits are not still animating.
3. The gratitude beat exists and names who it is for.
4. Any logo or name in a logo wall was confirmed by the user.
5. Your project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).
