---
term: "Spring"
description: "A physics-based animation model that produces natural, bouncy motion based on stiffness and damping."
faqs:
  - q: "What is a spring animation?"
    a: "A spring animates a value using a simple physics model — defined by properties like stiffness and damping — rather than a fixed duration, settling toward its target the way a real spring would."
  - q: "When should I use a spring instead of easing?"
    a: "Reach for a spring when motion should feel organic and responsive, like elements popping in or cards settling into place. Easing is better when you need a precise, fixed-duration transition."
---

A **spring** animates a value using a simple physics model rather than a fixed duration. Instead of "move over 30 frames," a spring is defined by properties like **stiffness** and **damping**, and it settles toward its target the way a real spring would — sometimes with a little overshoot and bounce.

Springs are excellent for motion that should feel organic and responsive: elements popping in, cards settling into place, playful UI. GenMotion exposes a `spring()` helper so scenes can use physics-based motion deterministically.

See also: [Easing](/glossary/easing), [Interpolation](/glossary/interpolation).
