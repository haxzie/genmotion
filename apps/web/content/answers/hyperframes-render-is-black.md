---
title: "Why is my HyperFrames render black?"
description: "A black HyperFrames video almost always has one of seven causes, from rendering the wrong entry file to a video clip with no timing of its own. Here is how to tell which one you have in a few minutes."
tool: hyperframes
kind: error
date: "2026-10-05"
updated: "2026-10-05"
tags: ["black-frames", "render", "debugging"]
related:
  - hyperframes-render-black-wrong-entry-file
  - hyperframes-video-renders-black
  - hyperframes-animation-is-static
  - hyperframes-nested-paused-timelines-render-black
  - hyperframes-composition-html-is-empty-or-could-not-be-parsed
  - hyperframes-element-hidden-in-render-but-visible-in-preview
sources:
  - label: "HyperFrames troubleshooting guide"
    url: "https://hyperframes.heygen.com/guides/troubleshooting"
  - label: "hyperframes#3391: all-black render, closed as an entry-file mismatch"
    url: "https://github.com/heygen-com/hyperframes/issues/3391"
  - label: "hyperframes#3377: video clip black, closed as missing timing on the video element"
    url: "https://github.com/heygen-com/hyperframes/issues/3377"
  - label: "hyperframes#3419: nested paused GSAP timelines"
    url: "https://github.com/heygen-com/hyperframes/issues/3419"
  - label: "hyperframes#911: sub-composition goes black after its timeline ends"
    url: "https://github.com/heygen-com/hyperframes/issues/911"
genmotion:
  heading: "Look at the frame before you export it"
  body: |-
    Most black renders are discovered at the end, after the export. In GenMotion Studio a HyperFrames project previews frame by frame while the agent builds it, and the agent can capture real frames of its own composition and check them against what you asked for. That is the test that catches a video which passed lint and is still black. The MP4 is then rendered on your own machine, from the same project you scrubbed. [How the HyperFrames engine works in GenMotion](/blog/hyperframes-engine-in-genmotion).
faqs:
  - q: "Why does a black render still exit with code 0?"
    a: "Because the file is structurally valid. An empty scaffold, a timeline that never moved and a video clip that was never scheduled are all legal compositions, so nothing fails. HyperFrames has been closing these gaps (a blank default entry is now rejected, and video extraction failures now fail the render), but a composition that is valid and wrong can still render without an error. Look at frames, not exit codes."
  - q: "How do I look at a frame without rendering the whole video?"
    a: "Run npx hyperframes snapshot --at 0,3,8 to capture still frames at those times in seconds. Check the first frame, a moving frame and the last frame. It is much faster than a full render and uses the same capture path."
  - q: "Should I upgrade before debugging?"
    a: "Yes. HyperFrames ships several releases a day and several black-frame bugs listed here were fixed in the project itself. Run npx hyperframes info to see your version, update, and re-test before changing your composition."
---

A black HyperFrames video means the renderer captured frames successfully and there was nothing visible in them. That narrows it a lot. Work down this list in order, because the first three are the most common and the cheapest to rule out.

## 1. You rendered the wrong file

The scaffold creates a top-level `index.html`. If your real composition lives somewhere else, for example `compositions/index.html`, then `check`, `snapshot`, `render` and Studio preview all open the empty scaffold, report success, and give you a black video. One reporter filed it as a GSAP seek bug before the maintainers found two entry files in the project. Current versions reject this case outright, but older ones do not.

Fix: [render the entry file you actually authored](/answers/hyperframes-render-black-wrong-entry-file).

## 2. A `<video>` has no timing of its own

Putting `data-start` and `data-duration` on the wrapping `.clip` div is not enough. The `<video>` element needs them too. Without its own timing, its schedule starts at composition zero, so a clip placed at 6 seconds is already past the end of a 4 second source and renders black.

Fix: [give the video element its own timing](/answers/hyperframes-video-renders-black).

## 3. The animation never ran

If the timeline is not registered under the composition ID, the renderer cannot seek it, and everything that starts hidden stays hidden. Check that the timeline is created with `{ paused: true }` and registered at `window.__timelines["your-id"]`, where the key matches `data-composition-id` exactly.

Fix: [register the timeline correctly](/answers/hyperframes-animation-is-static).

## 4. You nested paused timelines yourself

If you built two scene timelines and combined them with `parent.add(child)`, the parent reports a duration of 0 and the children never advance. Every seek resolves to time zero. This is a GSAP behaviour, not a regression, and it is identical across every GSAP version from 3.11.5 to 3.15.0.

Fix: [let HyperFrames nest the scenes](/answers/hyperframes-nested-paused-timelines-render-black).

## 5. A sub-composition file is empty or the slot outlived its timeline

An empty `compositions/scene.html` used to be skipped silently, dropping the scene from the video. Current versions refuse to render and name the file. Separately, a sub-composition whose timeline is shorter than its slot went black for the rest of the slot in older versions; that was fixed in May 2026.

Fix: [check your sub-composition files](/answers/hyperframes-composition-html-is-empty-or-could-not-be-parsed).

## 6. Elements start hidden and nothing reveals them

A render worker seeks straight to a frame. It restores the authored hidden state, not whatever your preview showed a moment ago. An element that fades in with `fromTo` but never states `opacity: 1` as its destination can stay invisible in the render while looking fine when you scrub.

Fix: [state the visible end state explicitly](/answers/hyperframes-element-hidden-in-render-but-visible-in-preview).

## 7. Something in a specific feature path

Two reports are worth knowing, both closed:

- Transparent WebM compositing showed opaque black in version 0.7.106. The maintainers could not reproduce it on 0.8.41 and closed it; if you still see it on a current release, reopen with the exact command and input file.
- Colour grading on an element that also has a CSS entrance animation rendered solid white (MP4) or black (ProRes) in versions 0.7.109 and 0.8.2. The reporter's bisection pointed at the combination, not at grading alone.

## Check it worked

```bash
npx hyperframes doctor
npx hyperframes lint
npx hyperframes check
npx hyperframes snapshot --at 0,3,8
```

`doctor` checks the machine, `lint` and `check` check the project, and `snapshot` shows you real frames. If the first frame is black but a later one is not, you have an animation or visibility problem. If every frame is black, suspect the entry file or the timeline registration. Run `npx hyperframes compositions` to confirm which composition and duration HyperFrames resolved.
