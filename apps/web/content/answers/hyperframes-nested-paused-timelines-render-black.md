---
title: "Why does a HyperFrames render go black when I nest paused GSAP timelines?"
description: "Combining paused scene timelines with parent.add(child) makes the parent report a duration of 0 and leaves the children frozen at time zero. It is GSAP behaviour, not a regression, and lint and check do not catch it."
tool: hyperframes
kind: error
date: "2026-10-05"
updated: "2026-10-05"
tags: ["gsap", "timelines", "black-frames"]
related:
  - hyperframes-render-is-black
  - hyperframes-animation-is-static
  - hyperframes-check-passed-but-the-video-is-wrong
sources:
  - label: "hyperframes#3419: nested paused GSAP timelines report duration 0"
    url: "https://github.com/heygen-com/hyperframes/issues/3419"
  - label: "HyperFrames: Animate with GSAP, nested compositions"
    url: "https://hyperframes.heygen.com/guides/gsap-animation"
genmotion:
  heading: "Scenes as sub-compositions, by default"
  body: |-
    A GenMotion HyperFrames project is an `index.html` timeline plus one sub-composition per scene, which is the supported way to nest scenes described in this answer. The agent builds every scene that way, so nobody hand-combines paused timelines with `.add()` and ends up with a parent of duration zero.
faqs:
  - q: "Is this a GSAP bug?"
    a: "No. A maintainer tested every GSAP version from 3.11.5 to 3.15.0 and the behaviour is identical in all of them. A paused timeline's playhead does not advance, and GSAP honours that when the timeline is nested inside a parent."
  - q: "Why do lint, check and validate all pass?"
    a: "The composition is structurally valid and the timeline is registered. The problem only shows up as a zero duration and frozen children when the renderer seeks, which is after the static checks have run."
  - q: "Does the same thing happen with sub-compositions?"
    a: "No. For the supported path, where a parent mounts a child with data-composition-src, HyperFrames already unpauses the child timelines before nesting them into the root. The failure is specific to timelines you build yourself and combine with .add()."
---

HyperFrames asks every timeline to be paused. That is the contract. So you do the obvious thing: build one paused timeline per scene, and combine them in a parent.

```js
const a = gsap.timeline({ paused: true });
const b = gsap.timeline({ paused: true });
const parent = gsap.timeline({ paused: true });
parent.add(a, 0);
parent.add(b, 3);
window.__timelines.main = parent;
```

The video renders entirely black, and `lint`, `check` and `validate` all pass.

## What is happening

It is worse than "the duration is wrong". The maintainers' investigation found two linked problems.

1. **The parent reports `duration() === 0`.** With paused children it caches a duration of 0 at the moment you call `.add()`. Every seek then resolves to time zero.
2. **The children never advance anyway.** Seeking the parent to 4.5 seconds, midway through the second scene, left both targets at their time-zero values. A paused timeline's playhead does not advance, and GSAP honours that for a nested child. So even a correct duration would still capture frozen frames.

A simple reproduction: with `paused: true` on the children the parent reports `duration() === 0`; with `paused: false` it reports the real duration. It is identical on GSAP 3.11.5, 3.12.5, 3.13.0, 3.14.0, 3.14.2 and 3.15.0, so upgrading or downgrading GSAP will not help.

## Why the framework does not rescue you

HyperFrames does handle this for sub-compositions. When a parent mounts a child scene through `data-composition-src`, the runtime unpauses the child timeline before nesting it. But that walk only visits elements with a `data-composition-id` that have a registered timeline. A timeline you create in a script and combine yourself is never registered under a composition ID, so the runtime cannot see it and never unpauses it.

## Fix

**Preferred: let HyperFrames do the nesting.** Make each scene its own composition with its own registered timeline, and mount it from the parent:

```html
<div
  data-composition-id="intro"
  data-composition-src="compositions/intro.html"
  data-start="2"
  data-duration="4"
></div>
```

The docs say not to add the child timeline to the parent's GSAP timeline manually. HyperFrames maps the parent playhead into the nested scene.

**Alternative: one timeline.** If the scenes are small, build a single paused timeline and place each scene's tweens at explicit offsets. There is nothing to nest.

**If you must nest by hand,** the maintainer measured what works. The order matters:

| Approach | Result |
| --- | --- |
| Add paused children (what you did) | duration 0, nothing renders |
| Unpause the children **before** `.add()` | duration 6, renders correctly |
| Unpause after `.add()`, then call `invalidate()` | duration 6, renders correctly |
| Unpause after `.add()`, then read `totalDuration()` | duration 6, renders correctly |
| Unpause after `.add()` and nothing else | **duration 0, still broken** |

The last row is the trap. Unpausing alone is not enough, because the parent caches its duration at `.add()` time and a recompute has to be forced.

## Check it worked

```bash
npx hyperframes snapshot --at 0,4.5,8
```

Pick a time inside your second scene, not only the start. Frame zero looks fine in every variant of this bug.
