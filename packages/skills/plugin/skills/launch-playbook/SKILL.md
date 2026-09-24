---
name: launch-playbook
description: "The creative layer above your project's own launch build pipeline: five story shapes for a launch (problem-first, demo-first, manifesto, metric-first, category-creation) with the selection rule, 30 / 60 / 90 second beat sheets for each, the muted-playback and first-five-seconds rules, where social proof goes, and cut variants for Product Hunt, X, YouTube and LinkedIn. Load it when the ask is a product, feature or company launch video. It owns the story, not the pipeline: hand off to your project's own build pipeline for capture, asset staging and the build steps."
---

# Launch playbook

A launch video has one job: make the thing look inevitable in under ninety seconds. This is the creative direction for that. Your project's own build pipeline, whatever it is for this engine, still owns capture, asset staging and the render; read this first to decide what the video says, then hand off to it.

## When to use

Load this for a product, feature-set or company launch, a funding announcement's bigger sibling, or a "make our homepage into a video" ask where the intent is promotional rather than a plain site tour.

Not this skill: a single feature drop (`announce-feature`), a number going up (`announce-milestone`), a logo on its own (`brand-sting`), a store preview (`app-store-preview`), or a long-form tour (`demo-walkthrough`).

## The five shapes

Pick one. Do not blend two; a launch video that tries to be a manifesto and a demo reel loses both.

| Shape | Opens on | Wins when | Exemplar |
| --- | --- | --- | --- |
| **Problem-first** | The failure state, no product in sight | The problem is universal and the audience feels it immediately | `gojiberry-launch-video`: the cold DM nobody answers |
| **Demo-first** | The product already working | The product is the pitch; watching it is more convincing than being told about it | `notion-launch-video`, `codex-launch-video` |
| **Manifesto** | A claim about how things should be | The category is crowded and the differentiation is a point of view, not a feature | `dont-blink-gpt-6-astra`: kinetic type, no UI at all until late |
| **Metric-first** | A number that should surprise the viewer | You have a genuinely startling number and it is true | `github-star-announcement`, `lovable-funding-announcement` |
| **Category-creation** | A reframe of what kind of product this even is | Nobody has a name for the thing yet, so the video has to give them one | `google-generative-ai`: a ring of tiles becomes a headline before any product shot |

Selection rule: if the product's demo is visually strong on its own, demo-first. If the problem is more relatable than the product is impressive, problem-first. If there is a real number worth leading with, metric-first beats both. Manifesto and category-creation are higher-risk, higher-ceiling: use them only when the brief explicitly wants a point of view over a walkthrough.

## The first five seconds

Every shape shares this. Lead with the most impressive moment the material has, not a wind-up.

**Never open with:** a logo animation, "Hi, I'm ___ and today I want to show you...", a black screen with text, a mission statement, a feature list.

**Always open with:** the product already doing something, a transformation already mid-way (split screen, before state already visible), a number already moving, or the sharpest line of the manifesto, said or shown immediately.

Design for mute. Product Hunt and most feed placements autoplay muted; if the first five seconds do not communicate value with the sound off, the video has already lost most of its viewers.

## Beat sheets

Narration runs at roughly 2.5 words a second (see `ugc-scripting` for the full math), so these word counts are load-bearing, not decorative.

**30 seconds** (roughly 72 words). Tight version, for a feed placement.

| Beat | Time | Job |
| --- | --- | --- |
| Cold open | 0 to 5s | The shape's opening move, already in motion |
| Turn | 5 to 10s | The product enters, or the claim lands |
| Proof | 10 to 22s | One or two concrete moments, demonstrated not described |
| Close | 22 to 30s | The wordmark, held, with a single line |

**60 seconds** (roughly 140 words). The default.

| Beat | Time | Job |
| --- | --- | --- |
| Cold open | 0 to 5s | Same rule, longer runway does not excuse a slow start |
| Problem or claim | 5 to 15s | Whichever the shape needs |
| Demonstration | 15 to 42s | Two to four concrete moments, each with its own beat |
| Social proof | 42 to 50s | See below, only if it earns its place |
| Close | 50 to 60s | Wordmark, held |

**90 seconds** (roughly 210 words). Only when the material genuinely needs the room: several distinct workflows, or a two-part story (before this launch, after it).

| Beat | Time | Job |
| --- | --- | --- |
| Cold open | 0 to 5s | |
| Setup | 5 to 20s | |
| Demonstration, part one | 20 to 45s | |
| Turn or escalation | 45 to 55s | The moment the video earns the extra thirty seconds |
| Demonstration, part two | 55 to 78s | |
| Close | 78 to 90s | |

Stretching past 90s without a structural reason is a sign the video should route to `demo-walkthrough` instead.

## Social proof

Only include it if it is real and it is strong. A weak proof point (a vague "loved by teams everywhere") costs more attention than it earns. When it is real:

- **Numbers before names.** A user count, a growth rate, a rating, placed as their own beat, not a caption crawling under something else.
- **Logos in a row, briefly.** Two to three seconds, never held long enough to be read individually.
- **Never before the demonstration.** Proof supports a claim the viewer has already seen; it does not open the video.
- **Never invented.** If the user has not given you the number, do not write a placeholder into the final cut. Ask, or leave a bracketed note and say so.

## Destination cuts

One story, several exports. Build the 60-second version first; the rest are recuts, not new scripts.

| Destination | Aspect | What changes |
| --- | --- | --- |
| Product Hunt | 16:9, under 60s | Muted-first is non-negotiable; no talking-head opening |
| X / LinkedIn feed | 1:1 or 4:5 | Recrop, not rebuild; captions become load-bearing since autoplay is muted by default |
| YouTube | 16:9, up to 90s | Can run the longest cut; the only destination where a slower open survives |
| Shorts / TikTok / Reels | 9:16 | Recrop to vertical, safe zones from `ugc-ad-foundations` apply, and the pacing usually wants tightening even at the same runtime |

Recropping is a composition-level concern: keep the subject inside the region every aspect shares, or maintain separate scenes per aspect when the framing genuinely diverges. Read your project's own authoring guidance for the mechanics.

## Handoff to your build pipeline

Once the shape, beat sheet and destination are decided, they become the input to your project's own build pipeline, whatever it is for this engine: capture, design, planning, frames, render, however those steps are actually named here. This skill supplies the *angle* and *message*; do not re-run its capture or build steps here.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The product's real brand, copy and screenshots | `WebSearch`, `WebFetch`, `save_asset` | Ask the user directly rather than inventing a palette or a claim |
| Narration | `pick_voice` then `generate_voiceover` | A silent cut carried by kinetic type and captions, which the manifesto shape tolerates well |
| Product shots with no real capture | `screen-capture` for a rebuilt UI, `generate_image` for anything else | State plainly that it is a mockup if it is one |
| The demonstration's motion: punch-ins, camera moves, transitions | Read your project's own authoring guidance for the exact motion API | |

## Checks before you finish

1. `capture_frames` at 0s. Not a logo, not a title card, not a person about to speak.
2. Mute it. The claim survives on captions and visuals alone.
3. Word count against the beat sheet, within 10 percent.
4. Any proof point traces to something the user actually gave you.
5. Your project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).
