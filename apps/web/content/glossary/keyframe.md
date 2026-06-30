---
term: "Keyframe"
description: "A defined point that sets a property's value at a specific time, between which the software interpolates."
faqs:
  - q: "What is a keyframe?"
    a: "A keyframe marks a specific value for a property — position, opacity, scale — at a specific point in time. The software fills in the frames between two keyframes through interpolation."
  - q: "Do I have to place keyframes by hand in GenMotion?"
    a: "No. You typically describe the motion you want and the agent expresses it in code, though the underlying idea — values changing over time between defined points — is the same."
---

A **keyframe** marks a specific value for a property — position, opacity, scale — at a specific point in time. The software fills in the frames between two keyframes through [interpolation](/glossary/interpolation), producing smooth change.

Traditional motion tools require placing keyframes by hand, which is precise but slow. In GenMotion, you typically describe the motion you want and the agent expresses it in code, but the underlying idea is the same: values change over time between defined points.

See also: [Interpolation](/glossary/interpolation), [Easing](/glossary/easing).
