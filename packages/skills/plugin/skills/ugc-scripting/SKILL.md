---
name: ugc-scripting
description: "Writing the body and the CTA of a short-form ad: six script frameworks (PAS, AIDA, BAB, FAB, 4P, star-story-solution) with the shape and the audience each one fits, the word-count math that makes a script fit its runtime, CTA construction that reads as a recommendation rather than a pitch, and how to structure the narration as labeled, timed lines. Load it when you are writing the middle of an ad. The opening belongs to ugc-hooks."
---

# UGC scripting

A short-form script is not a shorter long-form script. It is one idea, said once, with the product as the turn.

## When to use

Load this when you are writing the body and close of an ad, when a user's script needs restructuring, or when a script does not fit its runtime. The opening three seconds belong to `ugc-hooks`; the edit rhythm belongs to `ugc-craft`.

## The word-count math

Narration runs at roughly 2.5 words per second, conversational, with the pauses a real person leaves. This is not a guideline, it is arithmetic: a script that overruns has to be cut, and cutting after the storyboard is written wastes a pass.

| Runtime | Total words | Hook | Body | CTA |
| --- | --- | --- | --- | --- |
| 15s | 34 to 38 | 7 | 20 | 8 |
| 30s | 70 to 75 | 7 | 50 | 15 |
| 45s | 105 to 112 | 8 | 80 | 18 |
| 60s | 140 to 150 | 8 | 110 | 22 |

Subtract for anything that plays without narration: a reveal that needs three silent seconds costs eight words. Silence is a legitimate line and it is usually the strongest one in the ad.

Write the word budget at the top of the script before writing a word of it.

## The six frameworks

| Framework | Shape | Fits | Avoid when |
| --- | --- | --- | --- |
| **PAS** Problem, Agitate, Solve | Name the failure, make it sting, turn | The default. Cold and warm traffic, any category | The problem is not one the viewer already feels |
| **AIDA** Attention, Interest, Desire, Action | Hook, expand, want, act | Longer cuts, 45s and up, B2B and launch | Under 30s, where Interest and Desire collapse into one beat |
| **BAB** Before, After, Bridge | Where you are, where you could be, how | Visible transformations, tools, habit products | The after state is abstract or invisible |
| **FAB** Feature, Advantage, Benefit | What it has, what that does, what that means for you | Technical products to a technical audience | Consumer, where the feature is not the reason |
| **4P** Picture, Promise, Prove, Push | Paint it, claim it, back it, ask | When you have real proof: numbers, names, a demo | You have no proof. Without Prove this is just a claim |
| **Star, story, solution** | The person, what happened to them, what fixed it | Founder, testimonial, day-in-the-life | Faceless formats with no character to be the star |

Default to PAS. It is the most reliable starting point for ecommerce and SaaS, it works cold, and it fails gracefully: a weak PAS is still legible, where a weak AIDA is four disconnected fragments.

`references/worked-scripts.md` has a full 30-second script in each framework, for the same imaginary product, so you can see how the same material shifts.

## The body's rules

- **One benefit.** Not three. A short-form ad that lists features is an ad nobody finishes. Pick the one that would make the viewer stop scrolling if they only heard it.
- **Demonstrate, do not describe.** Every claim in the body has a matching thing on screen at that second. If you cannot show it, cut it.
- **The turn is a moment, not a paragraph.** One line, one cut, one sound. Agitation that runs past five seconds becomes complaining.
- **Specifics beat adjectives.** "Eleven minutes" beats "fast". "Four hundred people" beats "lots of people". Never invent either: if the user has not given you a number, write the line without one.
- **Say it the way a person says it.** Contractions, sentence fragments, one filler word at most. Read it aloud. If it sounds written, rewrite it.

## The CTA

The CTA has to sound like a recommendation because everything before it was built to sound like a person. A pitch-shaped close breaks the character the previous twenty-five seconds paid for.

| Reads as a recommendation | Reads as a pitch |
| --- | --- |
| "Link's in my bio if you want it." | "Click the link below to get started today." |
| "It's free to try, which is why I did." | "Sign up now and save twenty percent." |
| "I'd start with the template, personally." | "Visit our website to learn more." |
| "If you make videos at all, just go look." | "Don't miss out on this limited offer." |
| "This is the one I use now." | "Join thousands of satisfied customers." |
| "Go make one and tell me it isn't faster." | "Transform your workflow today." |

Reinforce it three ways at once, in the same two seconds: the spoken line, the on-screen text, and a visual cue (a tap, a cursor moving to a button, a hand pointing). One of the three alone is half a CTA.

The CTA occupies the last three to five seconds and never less than two. A CTA that lands in the final half-second is a CTA that lands after the viewer has gone.

## Structuring the narration

Write narration as a sequence of labeled, timed lines, not a paragraph of prose. Each line carries a label for the beat it belongs to, a time range, a delivery note, and the words themselves. Only the words are what gets fed to the voice; the label, time and delivery note are there so the audio and the picture can be cut against each other later. Keep it wherever this project keeps its plan, or as a scratch outline if it does not have one yet.

The shape looks something like this. Treat it as illustrative, not a required format; adapt the labels and layout to however this project already writes things down.

> **Voice:** warm, conversational, mid-20s, slight rasp
> **Voice direction:** flat through the problem, lift only on the turn
> **Budget:** 30s, 72 words
>
> **Line 1, Hook (0.0 to 2.8)**, tired, like you are telling a friend
> "Three hours. For fifteen seconds of video."
>
> **Line 2, Problem (2.8 to 8.0)**, still flat
> "And it is never the part I want to be doing."
>
> **Line 3, Turn (8.0 to 9.2)**, the only lift in the whole read
> "Then I tried describing it instead."

Keep the script's line numbers aligned to the shot list's frame or scene numbers. The audio and the picture are cut against each other, and a script whose lines do not map to frames cannot be timed.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The narration itself | `pick_voice` once, then `generate_voiceover` | A caption-led silent cut. Write the script anyway: it becomes the caption track. |
| The user's own script | Read it verbatim and ask nothing | If the brief says verbatim, do not restructure it, whatever the framework says |
| Beat timing against picture | `project_overview` | Count it by hand at 2.5 words per second |

## Checks before you finish

1. Count the words. Divide by 2.5. Compare with the runtime. Inside 10 percent or rewrite.
2. Read the whole thing aloud, once, at pace. Anything you stumble on is a line to cut.
3. Every claim in the body has something on screen at that second proving it.
4. The CTA is spoken, written and shown, all three.
5. No number, rating, timeframe or named person the user did not supply.
6. This project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three) after the audio is placed.
