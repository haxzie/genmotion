---
name: explainer
description: "The explainer video: a concept, a process, a comparison or a piece of data made visual in 30 seconds to 3 minutes, with or without narration. Covers the one-question test, the four explainer shapes (how it works, why it matters, this vs that, by the numbers), one idea per scene, visual metaphors over bullet points, and pacing narration against motion. Load it for any request to explain, teach, break down or visualise something, rather than to sell or announce it."
---

# Explainer

An explainer answers one question the viewer actually has. Everything in it either moves the viewer toward that answer or gets cut.

## When to use

Load this when the request is to explain, teach, walk through, break down or visualise: "explain how our sync engine works", "a video about how vaccines work", "visualise this data", "types of databases in 60 seconds".

Not this skill for selling a product (`launch-playbook`), shipping a feature (`announce-feature`) or a walkthrough of a product's own UI (`demo-walkthrough`).

## Step 1: the one-question test

Write the question the viewer has, in their words, in one line: "How does end-to-end encryption actually work?" If you cannot, ask the user. Then write the answer in one sentence. The video is the long version of that sentence. Anything that does not serve it is out.

## Step 2: pick the shape

| Shape | Structure | Example |
| --- | --- | --- |
| **How it works** | Setup, mechanism in 3–5 steps, result | How a request travels through a CDN |
| **Why it matters** | The problem, the cost of ignoring it, the idea, what changes | Why your team needs observability |
| **This vs that** | Two options, the axes that matter, the verdict per situation | SQL vs document databases |
| **By the numbers** | A surprising number, what drives it, what it means | How much water a data centre uses |

Pick one. Mixing shapes is how a 60-second explainer becomes three minutes.

## Step 3: one idea per scene

- 3–8 scenes. Each scene carries exactly one idea, stated in its on-screen headline (2–6 words).
- Each scene's visual is a **metaphor or a diagram that moves**, not a list. A pipeline is objects travelling along a path; a comparison is two things side by side changing on the same beat; growth is something that literally grows.
- Reuse visual elements across scenes. The packet that travels through scene 2 is the same packet that gets encrypted in scene 3. Recurring objects are what make an explainer feel like one story.

## Step 4: words

- With narration: write the script first, about 2.5 words per second, then time scenes to it. Visuals land a beat *after* the words that name them, never before.
- Without narration: the on-screen text carries the argument. One line per beat, held long enough to read twice (about 0.3 seconds per word, minimum 1.5 seconds).
- Numbers are shown, not just said: count them up and hold them.

## Step 5: pacing

| Length | Scenes | Seconds per scene |
| --- | --- | --- |
| 30s | 4–5 | 6–8 |
| 60s | 6–8 | 7–10 |
| 2–3 min | chapters of 3–5 scenes each | 8–15 |

End on the answer from step 1, restated, held for two seconds. No summary slide of bullet points.

## Building it on each engine

The creative plan is the same on every engine; the mechanics are your project's own authoring rules. On Three.js, load `three-type` for headlines and counters, `three-transitions` for carrying a recurring object across cuts, and `three-camera` for moving through a diagram.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Facts | `web-research` on the topic | Use only what the user gave you, and say so |
| Narration | `pick-voice`, then `voiceover` | On-screen text carries the argument instead |
| Seeing it | `capture-frames` | None |

## Checks before you finish

1. The one-question and one-sentence answer are written down, and the last scene states the answer.
2. Every scene's headline is 2–6 words, and no scene is a bulleted list.
3. `capture-frames` mid-way through every scene: the metaphor reads without the narration.
4. Every number on screen is held for at least a second.
5. `validate` passes.
