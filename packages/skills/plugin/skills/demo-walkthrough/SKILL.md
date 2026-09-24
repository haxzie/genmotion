---
name: demo-walkthrough
description: "The longer product tour, 60 to 180 seconds: chapter structure and signposting, the one-workflow-end-to-end rule over a feature tour, pacing for a viewer who chose to watch rather than one who has to be hooked, and when to break the material into a series instead of one long cut. Load it for onboarding videos, sales-enablement demos, or any tour too long for launch-playbook's 90-second ceiling."
---

# Demo walkthrough

The only format in this pack aimed at a viewer who already opted in. They clicked play on purpose. That changes almost every rule.

## When to use

Load this for an onboarding video, a sales-enablement or investor demo, or a product tour with more material than a 90-second launch cut can honestly carry. Route to `launch-playbook` instead when the goal is to win attention from a cold or scrolling audience; that skill's hook and pacing rules apply here only loosely, because this viewer is not deciding whether to keep watching in the first three seconds.

## The one-workflow rule

The single most common failure in this format is a feature tour: eight capabilities, ninety seconds, none of them landing. The fix is to show **one real job, done completely, start to finish**, rather than touching many features briefly.

Pick the workflow that best represents why someone would actually use the product, not the one with the most features to show off. A viewer who watches one task done well understands the product; a viewer who watches nine features flash by understands nothing.

If the brief genuinely has several important workflows, that is a sign to build a series (see below), not to compress them into one video.

## Chapter structure

Even a single-workflow video benefits from named chapters, because the viewer is choosing to sit through more than a launch cut and wants to know where they are.

| Chapter | Share of runtime | Job |
| --- | --- | --- |
| Orientation | 10 to 15 percent | What we're about to do, and why it matters. One sentence, then move. |
| The workflow | 65 to 75 percent | The one real job, start to finish, no skipped steps |
| The result | 10 to 15 percent | What came out of it, held on screen |
| Next step | 5 to 10 percent | Where to go from here, specific, not a generic CTA |

Signpost chapters visually: a small persistent label, a progress indicator, or a title card between sections. This is one format where a title card is allowed, because the viewer benefits from knowing the shape of what they are watching, unlike a cold-feed ad where a title card is a code for "skip me."

## Pacing for an opted-in viewer

Everything in `ugc-craft` about cutting hard and often is written for a viewer deciding whether to keep watching. This viewer already decided. That does not mean slow; it means **paced to the material, not to a retention algorithm**:

- **Hold shots as long as the content needs**, not as long as `ugc-craft`'s 1.5 to 2.5 second body cadence suggests. A configuration step that takes four seconds to read needs four seconds on screen.
- **Cut on completed thoughts**, not on a fixed rhythm.
- **No punch-ins for their own sake.** Push in on a detail only where it genuinely needs magnification, not as a pacing device; read your project's own authoring guidance for the exact motion API.
- **Narration can run ahead of or explain what is about to happen**, which a short-form ad's "demonstrate, don't describe" rule forbids. Here, a line like "next, we'll connect this to your existing data" is useful orientation, not padding.

The failure mode to watch for is the opposite of a UGC ad's: not too slow to hold attention, but so uniformly measured that ninety seconds feels longer than it is. Vary shot length by what is actually happening, and it reads as paced rather than as either rushed or draggy.

## When to break it into a series

If the honest answer to "what's the one workflow" is "there are three equally important ones," do not force them into one video. Build three demo-walkthroughs instead, each with its own one-workflow rule intact, linked by a shared intro chapter or a consistent chapter-numbering scheme ("Part 1 of 3"). A three-part series where each part is genuinely tight beats one nine-minute video where nothing gets the room it needs.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Real, complete footage of the workflow | `save_asset`, `screen-capture` for ffmpeg and framing | Rebuild the UI in HTML rather than skip steps in a real recording |
| Narration that can explain ahead | `pick_voice` then `generate_voiceover` | Chapter title cards carry the structure instead |
| Chapter signposting | Your project's own title-card design guidance | A simple persistent label in a corner |
| Detail magnification | Your project's own motion/keyframe authoring guidance | A closer static crop, held |

## Checks before you finish

1. `project_overview` against the chapter table: does the workflow chapter actually take up 65 to 75 percent of the runtime, or did it get compressed?
2. Watch it start to finish once. Note every point you felt the urge to skip; that is where pacing is wrong for the material, not where it needs to be faster.
3. No step in the demonstrated workflow is skipped or implied.
4. The next-step CTA is specific to this product, not generic.
5. Your project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).
