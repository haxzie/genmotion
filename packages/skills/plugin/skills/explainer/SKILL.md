---
name: explainer
description: "The explainer video: a concept, a process, a comparison or a piece of data made visual in 30 seconds to 3 minutes, narrated or text-led. Covers the one-question test, six shapes (how it works, why it matters, this vs that, by the numbers, listicle, story), a thesis and idea spine, one idea per scene with a named clarity device, reveal on the VO cue, the whiteboard scene grammar and board erase, VO word budgets and VO six frames after each cut, beat sheets for 30, 60, 90 and 180 seconds, and data-viz rules. Load it to explain, teach, break down or visualise something rather than sell it."
---

# Explainer

An explainer answers one question the viewer actually has. Everything in it either moves the viewer toward that answer or gets cut. The craft is mostly restraint: one idea per scene, each piece of the diagram arriving when the voice names it, the same objects recurring until the answer is obvious. Frames at 30 fps. Read `direction` first; moves come from `motion-language`, the mix from `sound-design`.

## When to use

- "Explain how our sync engine works", "how vaccines work", "types of databases in 60 seconds", "visualise this data", "break down this process step by step", "why X matters".
- A technical concept for developers, a process for customers, a report's findings for a general audience.

Another owner fits better when:

| The ask is really | Owner |
| --- | --- |
| Selling or launching a product | `launch-playbook` |
| A walkthrough of the product's own UI, one workflow | `demo-walkthrough` |
| One number to celebrate | `announce-milestone` |
| A shipped feature | `announce-feature` |
| A talking-head recording to cut and caption | `video-editing` |

## Ask first

1. **What question should the viewer be able to answer afterwards?** Their words, one line. Offer your best guess.
2. **Narrated, or on-screen text only?** It changes the length (text-led runs about 1.5× longer per idea) and the whole build order.
3. **Who is it for, and what do they already know?** A developer can see code and an architecture; a buyer needs the outcome first.

## Step 1: the question, the answer, the spine

- Write the **question** in one line, then the **answer** in one sentence (the thesis). The video is the long version of that sentence; the last scene restates it.
- Write the **spine**: 3–6 ideas, each one sentence, in the order the viewer needs them, not the order the source material uses. If the source is a doc or a URL, extract its ideas and reorder them; never follow its paragraphs.
- **Facts**: from the user's material or `web-research`, with the source noted in `VIDEO.md` for every number. Say so when you only have what the user gave.

## Step 2: pick the shape

| Shape | Structure | Example | Peak |
| --- | --- | --- | --- |
| **How it works** | Setup → mechanism in 3–5 steps → result | How a request travels through a CDN | The step where it clicks |
| **Why it matters** | Problem → cost of ignoring it → the idea → what changes | Why your team needs observability | The cost made visible |
| **This vs that** | Two options → the 2–3 axes that matter → verdict per situation | SQL vs document databases | The verdict |
| **By the numbers** | A surprising number → what drives it → what it means | How much water a data centre uses | The hero number |
| **Listicle** | N items, the same template each, a reason to watch to the end | Six types of databases | The last or best item |
| **Story** | A person or a packet with a goal → obstacles → resolution, teaching along the way | The life of an email | The resolution |

Pick one. Mixing shapes is how a 60-second explainer becomes three minutes.

## Direction defaults

- **Style family**: F (whiteboard explainer) for concepts with VO; B (soft-light SaaS) when the subject is a product's own flow; J for a by-the-numbers piece; G (textured tactile) for a technical audience that wants attitude; C when the concept is physical (hardware, money, objects).
- **Energy curve**: a low plateau in steps: question/problem (4) → solution idea (7) → steps (5–6, steady) → **payoff (8) at 75–90%** → answer restated (5). No hype peaks; the payoff is the moment it clicks.
- **Pacing**: Calm (a new idea every 45–70f; diagram parts 4–12f apart within it); scenes 200–300f (about 7–10 s). A change inside the frame every 1–2 s, driven by the VO.
- **Transitions**: F uses the **board erase** as signature and workhorse; B uses the persisting element (the recurring object carries across every cut) with exit-then-cut between chapters. One direction of travel for the process (left to right).
- **Sound**: VO-led. VO at 1.0, a bed of 90–110 BPM, sparse, no lead melody, at 0.14–0.22 (−17 to −13 dB); light UI or pen sounds at most one per 2–3 s; the music's button under the final answer.
- **Memorable moment**: the payoff device: the recurring packet finally arrives, the two options separate on the axis that matters, the diagram completes and the takeaway underlines itself.

## Step 3: one idea per scene

Every scene has: a **headline** of 2–6 words that states the idea, one **visual device** that makes it visible, and one **takeaway** line or mark. Name the clarity device in the beat table:

| Device | Use it when |
| --- | --- |
| Analogy (we show X as Y) | The mechanism is invisible: encryption as a locked box, latency as a road |
| Progressive disclosure | A diagram with 4+ parts: build it part by part, on the VO |
| Before / after | The point is a change: same framing, two states |
| Worked example | A rule is abstract: run one real input through it |
| Zoom (part ↔ whole) | Where something sits in a system: push into the part, pull back to the whole |
| Rule of three | A list: three items, the third the twist |
| Side by side | A comparison: both options move on the same beat on the same axis |

**Recurring objects** make it one story: the packet in scene 2 is the packet encrypted in scene 3 and delivered in scene 5. Keep its shape, colour and size constant (one module both scenes import).

`references/devices.md` has visual metaphors for common technical concepts and the data-viz rules. Read it when a scene has a chart, a number or an abstract system.

## Step 4: words

- **Narrated**: write the VO first, generate it, then time the picture to it. 2.3 words/s by default (2.5 ceiling, 2.0 for a calm premium read). Budgets after the lead-in and a VO-free tail: 30 s ≤64 words, 60 s ≤134, 90 s ≤200, 180 s ≤400.
- **VO placement**: VO starts **6f after every cut** (the house explainer does exactly this, 8 of 8 cuts) so the eye lands before the ear; a line that bridges a cut may start up to 45f early.
- **Reveal on the cue**: each part of the diagram appears on the frame its noun is spoken (±3f), not all in the first quarter of the scene. Get word times with `transcribe` on the generated VO; without it, estimate at 13 frames per word from the line's start.
- Write VO as cues ("First the request — then the cache — then the answer"). Write numbers as spoken; show the exact figure.
- **Text-led**: the on-screen line carries the argument: ≤12 words at once, held `max(30, 9 × words + 15)` frames from legible, one idea per line. Every number is shown and held ≥30f after it lands.
- Silence is allowed: a 15–30f pause in the VO while a diagram completes lets it be read.

## The whiteboard scene grammar (family F)

Measured from the house explainer, scene-local frames, scenes 200–240f:

| Frames | Element | Motion |
| --- | --- | --- |
| 0–2 | Tag and number ("03") | Draw on 10–12f |
| 6 | Title (2–6 words, 96–112 px) | Text draws along its strokes over clamp(width / 45, 8, 18) frames, outCubic; rises 6 px |
| 16 | Subtitle (48 px, grey) | Same draw |
| 24–60 | Diagram strokes | 8–20f each, 4–12f apart, on the VO's nouns; dots overshoot 35% while drawing |
| 76–124 | Takeaway and examples | Examples 5f apart; a red underline draws 12f after its phrase |
| end − 18 → end − 8 | **Board erase** | Every element reverses its stroke over 10f inOutCubic |
| last 8f | Blank paper | Then cut onto identical paper; VO +6f |

Hold: text floats ±1.2 px; camera drift x ±4 px, y ±2.5 px with a +1.2% mid-scene zoom, built from `sin(2πp)` so it **returns to rest at both ends** and every cut lands on identical paper. Single left column at a 140 px margin; palette paper #fff, ink #1e1e1e, grey #495057, one red #e03131 for emphasis only.

## Beat sheets

Payoff at 75–90%. Each step scene is one idea from the spine.

| Length | Beats (frames) | Scenes | VO |
| --- | --- | --- | --- |
| **30 s** (900f) | Question 0–120 · step 1 120–310 · step 2 310–500 · step 3 500–690 · **payoff 690–810** · answer 810–900 | 5–6 | ≤64 |
| **60 s** (1800f) | Question/problem 0–210 · idea 210–420 · steps 420–1350 (3–4 scenes of 230–300f) · **payoff 1350–1590** · answer + end card 1590–1800 | 6–8 | ≤134 |
| **90 s** (2700f) | Question 0–240 · idea 240–480 · steps 480–2040 (5–6 scenes) · **payoff 2040–2400** · answer 2400–2700 | 8–10 | ≤200 |
| **180 s** (5400f) | Question 0–300 · 3 chapters of 3–4 scenes each (a 45–75f chapter card between them) · **payoff ~4500** · answer 5100–5400 | 12–16 | ≤400 |

Listicle: every item gets the same template and the same frame budget (±10%), numbered in the corner; a 9:16 listicle item is 90–150f. The end restates the answer from Step 1 and holds it ≥60f; never a summary slide of bullets.

## Building it

- **Three.js (default)**: an orthographic camera for diagrams so sizes are exact (`three-camera` for pushes into a part and drift that returns to rest); text as canvas-texture planes that reveal left to right with a mask (`three-type`); strokes as lines or ribbon meshes whose draw range grows along the path; the board erase is the same draw range reversed; recurring objects as one shared mesh factory (`three-assets`); the look from `three-look`; scene handoffs from `three-transitions`.
- **HyperFrames**: one sub-composition per scene; SVG strokes drawn by dash offset on the timeline; VO as `<audio>` elements starting 0.2 s after each slot.
- **React**: `@genmotion/motion` `<TextAnimation>` for headlines, SVG `strokeDashoffset` driven by `interpolate` for strokes.

## Good and bad

- Bad: scene 1 shows the whole architecture diagram with six labelled boxes while the VO introduces the first one. Good: the client box draws as "your app" is said, the arrow draws on "sends a request", the cache appears on "cache".
- Bad: six scenes, six different visual styles. Good: one packet, one palette, one left column, the board erasing between ideas.
- Bad: a pie chart with a legend and seven slices. Good: one bar that grows next to one other bar, both labelled directly.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Facts | `web-research` | Use only what the user gave you, and say so |
| Narration | `pick-voice`, then `voiceover` | Text-led: on-screen lines carry the argument |
| Word timings for reveals | `transcribe` | Estimate 13 frames per word from the line's start |
| Bed and button | `music` | VO with room tone 0.03–0.05 |
| Pen, click sounds | `sfx` | None; VO carries it |
| Seeing it | `capture-frames` | None |
| Loudness | `ffmpeg` | None |
| Direction, moves, mix | `direction`, `motion-language`, `sound-design` | — |

## Checks before you finish

1. `VIDEO.md` holds the question, the one-sentence answer and the spine; the last scene states the answer and holds it ≥60f.
2. Every scene's headline is 2–6 words; no scene is a bulleted list; every scene's device is named in the beat table.
3. `capture-frames` mid-way through every scene, muted: the device reads without the narration.
4. Reveal on cue: for three diagram parts, the frame the part appears is within ±3f of its spoken noun (word times from `transcribe`).
5. VO starts 6f (3–8f) after every cut; VO words ≤ the budget; no line runs past its scene unless it deliberately bridges.
6. Family F: capture the last frame of a scene and the first of the next: both are blank paper, pixel-identical (drift at rest).
7. Every number on screen holds ≥30f after it lands and has a source line in `VIDEO.md`.
8. The bed sits at ≤0.22 under VO; `ebur128` gives −14 LUFS ±1 and true peak ≤ −1 dBTP.
9. The `direction` self-critique passes (the swap test: another company's explainer could not use these frames); `validate` passes.
