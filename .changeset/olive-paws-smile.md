---
"@genmotion/cli": minor
---

Add the `three-diagram` skill: 44 diagram and chart types for Three.js scenes.

Three copy-in kits (`diagram.ts`, `chart.ts`, `shapes.ts`) cover nodes, zones,
lanes, lifelines and orthogonal connectors that draw themselves on; scales, axes
and marks; and circles, ribbons, trapezoids and a real axonometric projection.
One reference per type carries its layout grammar, budget, reveal timings and
anti-patterns, so only the one type a request needs is ever loaded.

`audit()` checks the six connector rules and the complexity budget against the
finished scene graph and reports through the error channel, so a diagram that
breaks them fails `genmotion check` rather than shipping.

The design system and layout grammar are adapted from the MIT-licensed Diagram
Design skill by Cathryn Lavery; see the skill's `NOTICE.md` for attribution and
for what changed on the way to a scene graph.
