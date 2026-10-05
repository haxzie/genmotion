---
title: "How do I port a Remotion composition to HyperFrames, and what will not translate?"
description: "HyperFrames ships a skill that rewrites a Remotion composition as HTML and grades its own output. It translates roughly 80 percent mechanically, and refuses state-driven animation and React UI kits rather than guessing. How to run it and what to expect."
tool: remotion
kind: how-to
date: "2026-10-05"
updated: "2026-10-05"
tags: ["migration", "remotion-to-hyperframes", "react", "html"]
related:
  - is-remotion-worth-it-for-saas-feature-videos
  - remotion-do-i-need-a-company-license
  - hyperframes-determinism-rules
  - hyperframes-install-failed-npx-skills-add
sources:
  - label: "HyperFrames: Porting from Remotion"
    url: "https://hyperframes.heygen.com/prompting/remotion-migration"
  - label: "HyperFrames: HyperFrames or Remotion?"
    url: "https://hyperframes.heygen.com/guides/hyperframes-vs-remotion"
genmotion:
  heading: "Or skip the port and describe the video"
  body: |-
    GenMotion does not read Remotion projects. If the video is one you can describe, you can skip the port entirely: tell the studio what it should show, and it builds the scenes as a HyperFrames project, previews them frame by frame and exports on your own machine. [How the HyperFrames engine works in GenMotion](/blog/hyperframes-engine-in-genmotion).
faqs:
  - q: "Is the port reversible?"
    a: "No. The direction is one-way. There is no export from HyperFrames back to Remotion or to any other framework."
  - q: "What if my composition uses useState?"
    a: "The skill will stop and explain rather than approximate. HyperFrames seeks to an arbitrary frame and expects identical pixels every time, and a state machine that reacts to its own history cannot guarantee that. It recommends a runtime-interop pattern instead of producing a translation that looks right but is not frame-accurate."
  - q: "How do I know the port is faithful?"
    a: "Ask for validation. Each translation is graded against the original by SSIM, structural similarity on rendered frames, not by eye. Ask the agent to render both versions and report the SSIM difference. A port that looks right in preview can still measure meaningfully below the baseline."
---

There is a real migration path. HyperFrames ships a `remotion-to-hyperframes` skill that reads a Remotion composition's source and rewrites it as a HyperFrames HTML composition, with the same frames, timing and output, running on GSAP instead of React's frame-callback model. It is one-way, and it is honest about what it will not do.

## Is it worth it?

Decide that first. HyperFrames' own comparison page is candid that Remotion is older, more established and simpler to hold in your head, and says to migrate because your source material or team fits better on the other side, not because one framework looks newer. If your composition is mostly web material, HTML and CSS and a GSAP or Lottie animation, it ports close to as-is. If it is a tangle of React state and a UI kit, it will not. See [whether Remotion is worth it](/answers/is-remotion-worth-it-for-saas-feature-videos).

## How to run it

Install the skill, then ask your agent:

```bash
npx skills add heygen-com/hyperframes --skill remotion-to-hyperframes
```

```text
/remotion-to-hyperframes Port the composition at src/HeroReveal.tsx
(Remotion project root: .) to HyperFrames. Keep the same duration, fps,
and dimensions. Write TRANSLATION_NOTES.md for anything that doesn't
translate cleanly. After translating, render both the Remotion original
and the HyperFrames version and report the SSIM diff.
```

Name the exact file, because a Remotion project can register several `<Composition>`s and the agent needs to know which one you mean. If the install itself fails, see [the install answer](/answers/hyperframes-install-failed-npx-skills-add).

The workflow only fires on an explicit request to port, convert, migrate or translate real Remotion source. "Make something like my Remotion video" is a fresh build, not a migration.

## What translates

Roughly 80 percent of a typical composition translates mechanically. The skill maps `useCurrentFrame` and `interpolate` onto timeline tweens, `Sequence` onto clips, and converts frames to seconds.

## What will not, and why refusing is correct

The skill lints the source before translating anything. It **refuses** rather than approximates when it finds something HyperFrames' seek-driven model cannot represent deterministically:

- **State-driven animation.** `useState`, `useReducer`, or `useEffect` and `useLayoutEffect` with real dependencies. HyperFrames expects the same pixels every time for a given frame, and a state machine that reacts to its own history cannot promise that. You get an interop recommendation instead of a plausible but wrong translation.
- **Third-party React UI kits.** MUI, Chakra, Mantine, antd, shadcn, Radix, NextUI. There is no HTML, CSS and GSAP equivalent to translate them into.
- **`@remotion/lambda` deploy config.** Not a blocker. It is dropped, because it is deployment configuration rather than animation, and the rest of the composition still translates.
- **Async metadata** is also flagged rather than silently mistranslated.

If your source hits a blocker, expect the agent to stop and explain. That is the correct behaviour, not a failure. Do not tell it to "just convert it and not worry about the state stuff": the result looks right and is not frame-accurate.

## The one habit that matters: validate

Ask for the SSIM diff every time you port something non-trivial. A visual-only check misses timing and easing drift that only shows up in a frame by frame comparison. Also ask for `TRANSLATION_NOTES.md`, so approximated fonts, dropped volume ramps and substituted presentations are written down instead of absorbed.

## After the port

A ported composition is an ordinary HyperFrames project, so the rules apply. Read [the determinism checklist](/answers/hyperframes-determinism-rules), because HyperFrames asks you to follow rules (a paused timeline, no wall clock, no unseeded randomness) and breaks quietly if you do not, which Remotion's model does not. Also note the licence difference: HyperFrames is Apache 2.0, with no seat count and no per-render fee, while [Remotion's licence](/answers/remotion-do-i-need-a-company-license) depends on headcount and render volume.

## Check it worked

Render the ported composition and the original, extract a frame at the same three times from each (first, middle, last), and compare them. Then read `TRANSLATION_NOTES.md` end to end before you delete anything.
