---
name: brand-sting
description: "The logo lockup, bumper or brand reveal: 2 to 8 seconds, no narration, no claim, just the mark arriving. Covers the three sting shapes (build, reveal, transform), why a sting is as much a sound design problem as a motion one, how long to hold the final lockup, and the transparent-background variant for use as an overlay elsewhere. Load it for a standalone bumper or when a launch video's own closing shot needs strengthening."
---

# Brand sting

The shortest thing in the whole pack, and the least forgiving. There is no script to hide behind: it is one mark, arriving well or arriving badly.

## When to use

Load this for a standalone bumper, an intro or outro tag, or when a `launch-playbook` or `announce-*` video's closing shot needs to be built properly rather than left as a static logo fade.

Not this skill for a full launch narrative; a sting is the last two seconds of one, not the whole thing.

## The three shapes

| Shape | What happens | Wins when |
| --- | --- | --- |
| **Build** | Pieces assemble into the mark: a grid tiling in, strokes drawing on, fragments converging | The brand has a geometric or modular mark that reads well mid-assembly |
| **Reveal** | The mark is already there, occluded or dark, and something uncovers it: a wipe, a light sweep, a mask opening | The mark is simple enough that a reveal does not need explaining |
| **Transform** | Something else becomes the mark: a shape morphs, a UI element resolves into the logo | The video already has a strong visual motif that can plausibly become the brand |

Pick one, never combine two. `genmotion-brand-grid` is a build (a pixel-tile grid stairs into the wordmark); `nike-brand-guide-video` is closer to a reveal-then-build hybrid inside a longer brand-guide piece, which is the one context where combining is earned because it is not trying to be a two-second sting.

## Timing

| Phase | Duration |
| --- | --- |
| The motion | 1 to 4s, depending on complexity. A build can run longer than a reveal; a reveal that takes more than two seconds starts to feel like a wait. |
| The hold | 1 to 2s minimum on the finished lockup. Do not cut away the instant it lands. This is the only frame anyone remembers. |
| Total | 2 to 8s. Past 8s this is no longer a sting, it is an intro, and wants pacing rules from `ugc-craft` instead. |

## Sound

A sting lives or dies on its sound as much as its motion. Three elements, all short:

- **A whoosh or a build sound** under the motion, rising into the landing.
- **A hit** exactly on the frame the mark locks into place. One transient, not a swell.
- **Optional tail**: a short resonant decay after the hit, giving the hold somewhere to sit rather than going dead silent the instant the hit lands.

Generate with `generate_sfx`, describing the sound rather than the picture: "a short rising whoosh into a solid low hit, with a brief bright decay" rather than "logo reveal sound."

## The hold

The lockup, once formed, does not move again. No secondary animation, no shimmer loop, no continued drift. A sting that keeps animating after the mark has landed reads as unfinished rather than polished. If the brand wants a tagline under the mark, it fades in during the hold, once, and stays static.

## The transparent variant

For use as an overlay elsewhere (composited over other footage, or as an intro bumper that sits ahead of a different piece), render the sting with a transparent background rather than a solid one: no full-frame background color, the mark and its immediate motion elements only. This is a separate composition or a clearly flagged mode within one, not something to improvise by guessing which layer is "the background" after the fact.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The real mark | `save_asset` the actual logo file | Never redraw a logo from memory or description |
| Brand colours and type | `WebSearch`, `WebFetch` on the real site | Ask the user rather than guessing |
| The sound | `generate_sfx` | Silence is acceptable only if the sting sits inside an already-scored video |
| The motion | Read your project's own authoring guidance for the exact motion and camera-move API | |

## Checks before you finish

1. `capture_frames` on the final held frame. The lockup is exactly right: correct mark, correct colour, nothing clipped.
2. Confirm the hold is at least a full second with zero further motion.
3. Listen for the hit landing exactly on the frame the mark locks.
4. If a transparent variant was asked for, confirm there is no opaque background layer.
5. Your project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).
