---
name: ugc-hooks
description: "The hook library: the first three seconds of a UGC ad, where most of the outcome is decided. Carries the visual plus verbal plus rhythm triple, eight hook families with the audience temperature each one fits, how to realise a hook as frame zero in a composition, and a reference library of sixty-plus hook lines with their paired visuals. Load it whenever you are choosing or rewriting an opening. Not a format: pick one of the ugc-* style skills for that."
---

# UGC hooks

The hook is not the first line. It is the first *frame*, the first five words and the first movement, arriving together. Get one of the three wrong and the other two do not save it.

## When to use

Load this whenever you are writing, choosing or rewriting the opening of a short-form ad, and whenever a format skill tells you to pick a hook family. Load it again when the user says an ad "starts slow" or "doesn't grab".

Skip it for the body and the CTA, which belong to `ugc-scripting`, and for the edit rhythm after the opening, which belongs to `ugc-craft`.

## The triple

Every working hook does three things in the first second. Write all three down before you write the line.

| Layer | The question it answers | Fails when |
| --- | --- | --- |
| **Visual** | What is on screen at frame zero, before anything animates? | It is a logo, a title card, a black frame, or a person about to speak. |
| **Verbal** | What are the first five words? | They are a greeting, a name, a throat-clear ("So I've been using...") or a sentence that needs the next one to mean anything. |
| **Rhythm** | What moves or cuts inside the first second? | Nothing does. A held frame reads as a pause, and a pause reads as an ad. |

Two out of three is a weak hook. If you can only get two, the one to keep is the visual.

## Frame zero

Frame zero is the thumbnail, the autoplay still, and the half-second a scrolling thumb spends deciding. Treat it as a poster.

Rules that hold across every family:

- **Something is already happening.** Mid-gesture, mid-mess, mid-scroll. Never a person settling into frame.
- **One focal point**, in the middle 60 percent of the height, big enough to read at thumbnail size.
- **The largest text on screen is the hook line**, not the brand.
- **No logo.** It buys nothing in second one and costs the whole frame.
- **Contrast carries it.** If the frame reads as grey at a glance, it will be scrolled past.

Read `references/first-frame.md` for how to build each family's frame zero in a composition, with the text effect and timing for each.

## The eight families

Pick by **audience temperature**: how much the viewer already knows about the problem and the product.

| Family | What it does | Temperature | Example shape |
| --- | --- | --- | --- |
| **Pain** | Names the failure state out loud, flatly | Cold to warm | "Three hours to make one video. Every week." |
| **Curiosity gap** | Opens a loop the viewer has to close | Cold | "Nobody told me you could do this in a browser." |
| **Pattern interrupt** | Breaks the visual or verbal expectation | Cold | A hand slams a laptop shut. "Stop." |
| **Social proof** | Borrows someone else's judgement | Warm | "Four hundred people tried this last week." |
| **Contrarian** | Attacks the thing the viewer assumes | Cold to warm | "Stop paying an editor." |
| **Authority** | Positions the speaker as someone who would know | Warm | "I've shipped forty launch videos. Here is what changed." |
| **Result** | Leads with the outcome, backwards | Warm to hot | "This took eleven minutes." |
| **Direct callout** | Names the viewer | Hot | "If you're a founder about to launch, this one is for you." |

Selection rule, in order:

1. **Cold traffic** (they do not know the problem is solvable): pattern interrupt or curiosity gap. Nothing else survives a cold feed.
2. **Warm** (they know the problem, not the product): pain or social proof.
3. **Hot** (they know the product): result or direct callout.
4. **Contrarian** works cold and warm, and is the highest-variance family: it either doubles the hook rate or tanks it. Test it, never default to it.
5. **Authority** needs a real credential. Without one it reads as a stranger asserting.

When the brief does not say the temperature, assume cold. A cold hook works on a warm audience; the reverse is not true.

## Realising a hook in a composition

The hook is one scene, two to three seconds, and it usually has three elements on a tight stagger.

| Element | Timing | Notes |
| --- | --- | --- |
| The visual | Present at 0.00 | Never animate the background in. It has to be there before the first frame renders. |
| The hook text | In by 0.15, settled by 0.4 | One line, two at most. Set it in the frame preset's largest display size. |
| The movement | Starts before 0.5 | A punch-in, a hard cut, a hand entering, a caption word landing. Something. |

Use a named text-animation effect if your project's animation system offers one, rather than hand-rolling per-word spans. For the hook line specifically, the effects that hold up are the hard ones: a snap, a slam, a per-word cut-in. Anything that fades, floats or eases in slowly reads as a title card.

Give the hook its own scene file. It is the thing you will rewrite five times, and `ugc-variants` swaps it wholesale.

## Testing hooks

Hooks are the axis with the most variance, so they are the axis you vary first. Three hooks against one body and one CTA teaches you more than nine random ads.

- Build the ad once, complete.
- Emit three hook variants with `ugc-variants`, changing nothing else.
- The hook families should be *different families*, not three phrasings of the same one. Three pain hooks tell you nothing.

The number to watch is three-second retention. Under 30 percent is the field average; 65 to 70 is what a working hook does.

## The library

`references/hook-library.md` holds sixty-plus usable hook lines grouped by family, each with the visual it needs and the temperature it fits. Read it when you are choosing a specific line rather than a family.

Do not lift a line verbatim into a real ad without swapping the specifics for the user's own. A hook's power is in the detail, and a generic detail is not a detail.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The hook's own frame | `generate_image` for a staged still, `save_asset` for the user's own | Typography alone. A bold line on a flat field is a legitimate frame zero. |
| The spoken line | `pick_voice` then `generate_voiceover` | Caption-only. The verbal layer becomes the on-screen line. |
| The movement | A punch-in: push the frame in over the beat | A hard cut at 0.5s does the same job with no keyframes at all. |
| A sound on the beat | `generate_sfx` | A music bed with a transient on the first frame. |

## Checks before you finish

1. `capture_frames` at frame 0. Cover the text. Is the image alone worth stopping for?
2. `capture_frames` at 0.5s and 1.5s. Something has changed between them.
3. Read the first five words aloud. If they are a greeting, a name, or setup, cut them.
4. Mute it. The hook still lands.
5. This project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).
