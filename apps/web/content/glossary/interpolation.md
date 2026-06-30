---
term: "Interpolation"
description: "Calculating intermediate values between two known points to create smooth transitions."
faqs:
  - q: "What is interpolation in animation?"
    a: "Interpolation is the process of computing the values between two defined points — for example smoothly moving opacity from 0 to 1 across thirty frames."
  - q: "How is interpolation different from easing?"
    a: "Interpolation decides the intermediate values; easing shapes the rate at which it moves through them. Together they make motion feel natural rather than mechanical."
---

**Interpolation** is the process of computing the values *between* two defined points. In motion design, it's how a property smoothly transitions from one [keyframe](/glossary/keyframe) to the next — for instance, moving opacity from 0 to 1 across thirty frames.

In GenMotion, `interpolate()` maps an input range (such as frames 0–30) to an output range (such as opacity 0–1). Combined with [easing](/glossary/easing), interpolation is the workhorse behind almost every animation.

See also: [Easing](/glossary/easing), [Spring](/glossary/spring).
