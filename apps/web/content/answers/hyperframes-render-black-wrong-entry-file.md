---
title: "Why does HyperFrames render my empty scaffold instead of my composition?"
description: "If check, snapshot and render all succeed but show a blank black video, you may have two entry files. HyperFrames opens the top-level index.html by default, and that may not be the one you wrote."
tool: hyperframes
kind: error
errors:
  - "blank_root_with_standalone_composition"
date: "2026-10-05"
updated: "2026-10-05"
tags: ["black-frames", "render", "project-structure"]
related:
  - hyperframes-render-is-black
  - hyperframes-check-passed-but-the-video-is-wrong
  - hyperframes-nested-paused-timelines-render-black
sources:
  - label: "hyperframes#3391: the original report"
    url: "https://github.com/heygen-com/hyperframes/issues/3391"
  - label: "hyperframes#3392: reject blank default composition entries"
    url: "https://github.com/heygen-com/hyperframes/pull/3392"
  - label: "HyperFrames weekly updates, week of August 17, 2026"
    url: "https://hyperframes.heygen.com/weekly-updates"
genmotion:
  heading: "A project that knows which file is the video"
  body: |-
    GenMotion scaffolds the HyperFrames project for you: `index.html` is the timeline, with one slot per scene, and each scene is its own file under `scenes/`. The studio previews and exports that same `index.html`, so you are never choosing a file to render and cannot render the wrong one by accident. [How the HyperFrames engine works in GenMotion](/blog/hyperframes-engine-in-genmotion).
faqs:
  - q: "Which file does HyperFrames render by default?"
    a: "The top-level index.html in the project folder. Check, snapshot, render and Studio preview all open it. If your authored composition is in compositions/index.html, the default commands never touch it."
  - q: "How do I render a different file?"
    a: "Pass it explicitly: npx hyperframes render --composition compositions/index.html. The explicit form remains supported. A sub-composition that uses a template wrapper must instead be mounted from index.html with data-composition-src."
  - q: "Does this still happen on current versions?"
    a: "The definitive mismatch is now blocking. A fix merged on August 21, 2026 makes check report the exact entry-file mismatch, and makes snapshot, default render and publish stop before producing or uploading a blank video. If you are on an older version, upgrade."
---

This one looked like a GSAP bug for a long time. A reporter saw black frames in `check`, `snapshot`, `render` and even the Studio preview, on Linux and on Windows and with several different Chrome binaries, with no error anywhere. The maintainers eventually found that the project contained two entry points:

- a top-level `index.html`, the unchanged scaffold from `hyperframes init`: ten seconds, a root called `main`, and no visible clips;
- `compositions/index.html`, the real five second animation the author had written.

Every default command correctly selected the top-level file, then reported success, because an empty scaffold is a perfectly valid composition.

## What it means

Your authored composition is not the project's master. HyperFrames treats the top-level `index.html` as the master and everything under `compositions/` as something that master has to mount.

## How to tell

Run:

```bash
npx hyperframes compositions
```

If the duration or composition ID it reports is not the one you wrote (a 10 second `main` when you authored a 5 second card, for example), you are rendering the scaffold. Two other signs are a blank Studio canvas showing a `main` timeline, and a render exactly as long as the scaffold's default rather than your own.

## Fix

Pick one:

1. **Make your composition the master.** Move it into the top-level `index.html`, or replace the scaffold's root with your own.
2. **Mount it from the master.** Keep it in `compositions/` and add a host element in `index.html`:

```html
<div
  data-composition-id="intro"
  data-composition-src="compositions/intro.html"
  data-start="0"
  data-duration="5"
></div>
```

3. **Target it explicitly** when you only want to render that file:

```bash
npx hyperframes render --composition compositions/index.html --output out.mp4
```

## What changed in the tool

The linter now reports `blank_root_with_standalone_composition` when the default root has no renderable descendants and a timed standalone composition exists under `compositions/`. That finding blocks default render, snapshot and publish regardless of `--strict` or `--yes`, so you no longer get a blank video from this mistake on a current version. Authored masters and template-wrapped sub-compositions are excluded, and an explicit `--composition` render is unaffected.

## Check it worked

```bash
npx hyperframes lint
npx hyperframes snapshot --at 0,2.5,4.5
```

The snapshot should show your content, not a dark stage. If it is still black, go back to [the full list of black render causes](/answers/hyperframes-render-is-black).
