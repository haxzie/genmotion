---
title: "What does 'Composition HTML is empty or could not be parsed' mean in HyperFrames?"
description: "A data-composition-src that points at an empty, partial or missing file was the most common HyperFrames render failure in the project's own telemetry. Here is what the error means, what older versions did, and the fix."
tool: hyperframes
kind: error
errors:
  - 'Composition HTML is empty or could not be parsed: compositions/scene-title.html'
  - "Cannot destructure property 'firstElementChild' of 'documentElement' as it is null."
  - "missing_or_empty_sub_composition"
date: "2026-10-05"
updated: "2026-10-05"
tags: ["sub-compositions", "render", "agents"]
related:
  - hyperframes-render-is-black
  - hyperframes-check-passed-but-the-video-is-wrong
  - hyperframes-first-render-is-a-still-image
sources:
  - label: "hyperframes#1831: pre-flight validation for empty or malformed sub-compositions"
    url: "https://github.com/heygen-com/hyperframes/pull/1831"
  - label: "hyperframes#1364: actionable error for empty sub-composition HTML"
    url: "https://github.com/heygen-com/hyperframes/pull/1364"
  - label: "hyperframes#1678: skip empty sub-composition files"
    url: "https://github.com/heygen-com/hyperframes/pull/1678"
genmotion:
  heading: "Scenes you can see as they are built"
  body: |-
    In GenMotion every scene is its own file under `scenes/` and appears as a chip on the timeline as soon as it exists, so a scene that is empty or half written is visible straight away, not 90 seconds into a render. The agent also validates the composition after it edits, and the studio compiles the project on every change.
faqs:
  - q: "Why is this such a common error?"
    a: "In the pull request that fixed it, the maintainers describe it as the number one render failure in production telemetry: roughly 65 to 69 thousand occurrences affecting 27 to 28 thousand users over 30 days, about 80 percent of it from AI-agent authoring flows. An agent writes a scene file, gets interrupted, and leaves it empty, while index.html already references it."
  - q: "What happened on older versions?"
    a: "Rendering a project with an empty scene file appeared to succeed after roughly 93 seconds, because two 45 second timeline waits had to time out, and the scene was silently missing from the video. validate reported no console errors for the same project, so it falsely passed."
  - q: "What does the current version do?"
    a: "render runs a pre-flight over every data-composition-src reference, including nested ones, and aborts naming every offending file before any compile work starts. The check is not gated behind a strict flag. In the maintainers' test it failed in about 0.4 seconds instead of succeeding after 93. lint reports the same problem as missing_or_empty_sub_composition, and validate runs the check before launching a browser."
---

`index.html` mounts a scene with `data-composition-src="compositions/scene-title.html"`, and that file is empty, contains no markup, or does not exist. HyperFrames cannot inline it.

## Why it keeps happening

Almost always, an agent wrote the host reference first and the scene file second, and the second step never finished: a scene worker errored or was interrupted mid-write. The dominant filename in the failing renders was `scene-title.html`. The reference looked fine to `index.html`, so nothing complained until render.

## The two error strings

They are the same problem at different levels of politeness.

- **`Composition HTML is empty or could not be parsed: <path>`** is the original message, from a guard added in June 2026. It names the file. The render pre-flight now lists every offending file at once.
- **`Cannot destructure property 'firstElementChild' of 'documentElement' as it is null.`** is the cryptic one. The HTML parser the CLI installs returns a document whose `documentElement` is null for empty or non-HTML input, and the inliner dereferenced it. It started appearing after a render pipeline change in 0.6.73, and was at one point described as the most common render failure in recent reports. It now surfaces as a typed, named error instead of a raw crash.

## What older versions did, which matters if you are not on the latest

There was a stretch where empty scene files were deliberately skipped, so authoring could continue on partial projects. The cost was that a final render could silently drop a scene: it "succeeded", took about 93 seconds, and the scene was just not in the video. `validate` agreed that everything was fine.

If you have a video that is mysteriously missing a scene, this is the first thing to check, and the fix below applies to old and new versions alike.

## Fix

1. Find the empty file. On a current version the error names it. On an older one, look at every `data-composition-src` in `index.html` and open each target.
2. Regenerate or rewrite the scene file, then confirm it contains real markup, not just whitespace.
3. If an agent produced the scene, re-run that scene's step rather than patching around it.

```bash
npx hyperframes lint
```

`lint` reports `missing_or_empty_sub_composition` with the file path.

## Check it worked

```bash
npx hyperframes render --quality draft --output review.mp4
```

A healthy project starts rendering promptly. If the render sits for 45 to 90 seconds with no progress before finishing, something else is waiting on a timeline. See [why every render takes 45 seconds longer than it should](/answers/hyperframes-render-takes-45-seconds-longer).

## If you are building the tooling

Preview and Studio still tolerate a partial scene file (skip and continue), because mid-authoring iteration has to keep working. Only render refuses. If you assemble projects programmatically, validate scene content at the point you write it rather than at render.
