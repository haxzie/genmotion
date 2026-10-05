---
title: "Why is my first HyperFrames video a still image?"
description: "A composition script that throws leaves the timeline unbuilt, and older HyperFrames versions waited 45 seconds, wrote the MP4 anyway and exited 0. Here is why that happens and how current versions fail instead."
tool: hyperframes
kind: error
errors:
  - "sub_timeline_readiness_timeout"
date: "2026-10-05"
updated: "2026-10-05"
tags: ["timelines", "render", "silent-failure"]
related:
  - hyperframes-check-passed-but-the-video-is-wrong
  - hyperframes-animation-is-static
  - hyperframes-render-takes-45-seconds-longer
  - hyperframes-render-is-black
sources:
  - label: "hyperframes#3352: the decision-tree example renders 2 unique frames"
    url: "https://github.com/heygen-com/hyperframes/issues/3352"
  - label: "HyperFrames weekly updates: renders now fail loudly (week of August 24, 2026)"
    url: "https://hyperframes.heygen.com/weekly-updates"
  - label: "HyperFrames troubleshooting guide"
    url: "https://hyperframes.heygen.com/guides/troubleshooting"
genmotion:
  heading: "Press play before you export"
  body: |-
    A composition whose script threw is obvious the moment you press play in GenMotion's preview: nothing moves. The studio compiles the HyperFrames project on every change, the agent validates what it writes, and you scrub the real frames in the editor before any export, so a still image never has to be a surprise at the end.
faqs:
  - q: "How can I tell my video only has a couple of unique frames?"
    a: "Sample it. Extract one frame per second with ffmpeg and count distinct hashes. A ten second video that should be animated but has two unique frames across ten samples never moved. The reporter used ffmpeg -i out.mp4 -vf fps=1 to extract frames and then compared checksums."
  - q: "Why did the render take a minute before finishing?"
    a: "When a composition script throws, the timeline never registers. The renderer polls for it, waits out a 45 second readiness timeout, logs sub_timeline_readiness_timeout, and then proceeds. That wait is the fingerprint of an unbuilt timeline."
  - q: "Is this fixed?"
    a: "Partly, by design. In the week of August 24, 2026, HyperFrames changed so that a sub-composition script failure fails the render, and so that a video extraction failure fails the render by default. A composition script that throws no longer has to produce a quiet still image on a current version. Upgrade, and read the render log."
---

Someone follows the quickstart, starts from a shipped example, runs `check` and `render`, and gets a ten second MP4 that is a still image. This was reported against the shipped `decision-tree` example in version 0.8.2, and it is worth understanding even though that issue was closed on August 28, 2026, because the same failure shape can come from any composition you write.

## What happened

The example's script read `tl.labels["hold5"]`. At render time `tl.labels` was undefined, so the script threw before the timeline was ever built. Two things then failed to fail:

1. **`check` exited 0 and printed "Check passed".** Linting and the static checks looked at the HTML and found it valid.
2. **`render` logged the error, waited, wrote the MP4 and exited 0.** The wait was 45 seconds: the producer polls for the composition's timeline, and when it never appears, it gives up after the readiness timeout and logs `sub_timeline_readiness_timeout`.

The result was a ten second video containing two unique frames. In the reporter's words: a green check, a green render, and a still image. Anyone starting from the example hit it on the first render.

## Why it matters beyond that example

An uncaught exception in a composition script is the most common way to end up here. Anything that runs at timeline-construction time and can throw will do it: reading a property off something that does not exist at render time, a typo in a selector helper, a library that did not load.

## The fingerprint

- the render takes noticeably longer than it should, with a pause near 45 seconds;
- the log contains a JavaScript error followed by `sub_timeline_readiness_timeout`;
- the video is mostly or entirely static.

## Fix

1. **Upgrade first.** In the week of August 24, 2026, HyperFrames made a sub-composition script failure fail the render, and made a video extraction failure fail by default. On a current version, the error should stop the render and tell you.
2. **Read the render log from the top**, not just the final line. The first JavaScript error is the cause; everything after it is fallout.
3. **Do not read from the timeline object at build time** in ways that depend on render-time state. `tl.labels` was the one in the example. Compute positions as plain numbers in your own script instead.
4. **Make construction synchronous.** No `async`, `await` or `fetch()` while the GSAP timeline is being built.

## Check it worked

```bash
mkdir -p /tmp/frames
ffmpeg -v error -i renders/out.mp4 -vf fps=1 /tmp/frames/f%03d.png
md5 -q /tmp/frames/*.png | sort -u | wc -l
```

On Linux use `md5sum` instead of `md5 -q`. For a ten second animated video you expect close to ten distinct hashes. Two means it never moved.

You can also run `npx hyperframes snapshot --at 0,5,9` before rendering and compare the three images by eye.
