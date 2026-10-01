---
name: freeform-video
description: "The fallback when no other skill owns the request: a custom video of any kind, such as an intro for a talk, a birthday clip, an abstract loop, a music visual, an event countdown or an internal update. Covers turning a vague request into a short plan (purpose, length, aspect, one-line message, three to six beats), picking a visual idea, and the craft rules every video shares. Load it when search finds no clear format match."
---

# Freeform video

Most requests fit a format skill. When none does, this is the default: a short, planned video built from first principles rather than improvised scene by scene.

## When to use

- Search ranked nothing clearly above the rest, or the top matches are all about something else.
- The request is unusual: a countdown, an abstract visual, a personal clip, a title sequence, a music visual.
- The user wants to direct every beat themselves.

If a format skill fits even roughly (an announcement, a launch, an ad, an explainer, a logo sting), use it instead. Its structure is worth more than a blank page.

## Step 1: a plan in five lines

Write these down before building anything. Ask the user only for what you cannot infer.

1. **Purpose.** Who watches it, where, and what they should feel or do afterwards.
2. **Length.** 5–15 seconds for social and loops, 15–60 for most things.
3. **Aspect.** 16:9 for screens and YouTube, 9:16 for phones and stories, 1:1 for feeds.
4. **Message.** One sentence the video says.
5. **Beats.** 3–6 beats, one line each, with rough seconds.

## Step 2: one visual idea

Pick a single visual idea and repeat it: a shape, a colour field, a camera move, a type treatment. Variety comes from how the idea develops beat to beat, not from new ideas in every scene. If it can't be described in a sentence ("a single line draws the city skyline, then the line becomes the name"), it isn't one idea yet.

## Step 3: build

- One scene per beat, or fewer: a beat can live inside a scene.
- Every element enters, holds long enough to read, and leaves. Exits are faster than entrances.
- Scenes hand off to each other through a shared element. Never fade to black between them.
- On Three.js, load `three-look` before the first scene, then `three-camera`, `three-type` and `three-transitions` as the plan needs them.

## Step 4: sound

Video without sound feels unfinished. If the user has music, place it in the project's audio timeline and cut the beats to it. If not, a few `sfx` hits on the key moments are better than silence.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Remote files | `save-asset` | Ask the user to put files in `assets/` |
| Sound | `sfx`, or a user-provided track | Leave it silent and tell the user |
| Seeing it | `capture-frames` | None |

## Checks before you finish

1. The five-line plan is written down, and the finished video matches it in length and aspect.
2. `capture-frames` on one frame per beat: each says its line of the plan.
3. Every cut is a handoff, not a fade.
4. `validate` passes.
