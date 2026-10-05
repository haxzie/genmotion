---
title: "Why did HyperFrames check pass and render exit 0 when my video is wrong?"
description: "HyperFrames can produce a valid-looking MP4 from a composition that is structurally fine and visually wrong. Here is the class of bug, what has been fixed to fail loudly, and what to verify yourself."
tool: hyperframes
kind: explainer
errors:
  - "Check passed"
date: "2026-10-05"
updated: "2026-10-05"
tags: ["silent-failure", "verification", "agents"]
related:
  - hyperframes-first-render-is-a-still-image
  - hyperframes-render-black-wrong-entry-file
  - hyperframes-render-is-black
  - hyperframes-determinism-rules
sources:
  - label: "hyperframes#3352: green check, green render, still image"
    url: "https://github.com/heygen-com/hyperframes/issues/3352"
  - label: "hyperframes#2064: render drops data-variable-values in sub-compositions"
    url: "https://github.com/heygen-com/hyperframes/issues/2064"
  - label: "hyperframes#3927: default BeginFrame capture and a visible capture-mode summary"
    url: "https://github.com/heygen-com/hyperframes/pull/3927"
  - label: "hyperframes#3419: nested paused timelines report duration 0"
    url: "https://github.com/heygen-com/hyperframes/issues/3419"
  - label: "HyperFrames weekly updates"
    url: "https://hyperframes.heygen.com/weekly-updates"
genmotion:
  heading: "Verification that looks at pixels"
  body: |-
    A green check says the HTML is valid, nothing more. In GenMotion the agent has tools to validate a composition and to capture real frames from it, and you get the same frames in a frame-accurate preview you can scrub. So the question that matters, whether it looks right, is answered before the export instead of after it. [How the HyperFrames engine works in GenMotion](/blog/hyperframes-engine-in-genmotion).
faqs:
  - q: "If check passes, is the composition correct?"
    a: "It means the composition is structurally valid and passed the browser gate. It does not mean the video shows what you intended. check cannot see a timeline that never moved, a variable that never arrived, or a scene that renders its defaults."
  - q: "What is the cheapest reliable test?"
    a: "Look at frames from the actual render. Run snapshot at a few times, or extract a frame per second from the MP4 and compare. A person or an agent looking at three images catches almost everything these bugs produce."
  - q: "Why does this class of bug exist?"
    a: "Because HyperFrames renders by seeking to arbitrary frames on workers that start cold, and several different things can go wrong between what the editor shows and what a cold worker produces. The project's own maintainers argue that failing closed is better than shipping a wrong MP4, and have been moving that way."
---

A green `check` and an exit code of 0 are the two most trusted signals in a render pipeline, and for HyperFrames they have each, at times, been wrong while the video was wrong too. This page is a map of that class of bug, so you know what to look at.

## The pattern

A composition can be valid and still not mean what you intended. Validity is a property of the HTML. Correctness is a property of the frames. The tooling checks the first one well and the second one only where someone has added a specific gate.

These are the confirmed cases.

| Case | What you saw | Status |
| --- | --- | --- |
| The shipped `decision-tree` example threw in its script | Green check, green render, a ten second video with 2 unique frames | [Closed August 28, 2026](/answers/hyperframes-first-render-is-a-still-image) |
| Empty scaffold at the top level, real composition in `compositions/` | Black video, green everywhere, even in Studio | [Rejected by default (merged August 21, 2026)](/answers/hyperframes-render-black-wrong-entry-file) |
| Empty or malformed sub-composition file | A render that succeeded after about 93 seconds with a scene missing | [Now aborts before compile](/answers/hyperframes-composition-html-is-empty-or-could-not-be-parsed) |
| Two paused scene timelines combined with `.add()` | Parent duration 0, black video, lint and check pass | [Explained here](/answers/hyperframes-nested-paused-timelines-render-black) |
| `data-variable-values` on a sub-composition | `snapshot` showed your values, `render` showed the JS defaults, exit 0 | Reported against 0.7.42, closed July 8, 2026 |
| Linux render fell back to screenshot capture | A normal-looking success that was much slower than it should be | Capture mode is now printed in the render summary |

## What has been fixed to fail loudly

From the week of August 24, 2026, the project's weekly digest lists these under "renders now fail loudly":

- a video extraction failure fails the render by default;
- a sub-composition script failure fails the render;
- artifacts are checked for duration and frame count before they are committed;
- a cached entry with no frames counts as a miss, not a hit.

There is also a video frame coverage gate that aborts a render when a clip captured only part of the frames it should have, with a message that says check and snapshot may pass while the encoded MP4 renders the clip blank. One of the maintainers argued in the `decision-tree` thread that a green check plus a wrong MP4 is worse than a failed render, which is why those gates fail closed.

In September 2026 a change also made `hyperframes render` print its capture path, GPU mode and per-stage timings, so a render that fell back to screenshot capture no longer looks like a normal success.

## What this means for you

1. **Upgrade before you debug.** Most of the rows above are fixed in current versions. HyperFrames ships several releases a day.
2. **Read the render log, not just the exit code.** Errors that no longer abort a render were, on old versions, only visible there.
3. **Look at frames.** Before you trust a video, sample it:

```bash
npx hyperframes snapshot --at 0,3,8
```

4. **Check the resolved structure**, not only the pixels:

```bash
npx hyperframes compositions
```

That prints the composition and duration HyperFrames actually resolved, which is where the entry-file and root-duration problems show up.

5. **If an agent is building the video, make it look.** An agent that stops at "check passed" has verified the HTML. Ask it to capture frames and describe them, then to compare them against the brief.

## Check it worked

For any video you are about to ship, you want three observations from the real output: the first frame shows content, a middle frame shows a moving state, and the last frame shows the end state. A timeline that looks right during continuous browser playback can still fail when the renderer seeks directly to a frame, so verify using seeks, which is what `snapshot --at` does.
