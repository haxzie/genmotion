---
term: "ControlNet"
description: "A technique for conditioning a diffusion model's output on structure — like pose, depth, or edges — instead of a prompt alone."
faqs:
  - q: "What is ControlNet?"
    a: "ControlNet is a technique that conditions a diffusion model's generation on an extra structural input — a pose skeleton, a depth map, an edge outline — so the output follows that structure precisely instead of relying on the prompt alone."
  - q: "Why does ControlNet matter for AI video?"
    a: "Prompts alone give loose control over composition and framing. Feeding a model a structural reference lets creators pin down exactly where a subject is and how it's posed, frame after frame."
---

**ControlNet** conditions a [diffusion model's](/glossary/diffusion-model) output on an extra structural input — a pose skeleton, a depth map, an edge outline — so generation follows that structure precisely rather than relying on the prompt alone to describe composition.

It's the difference between asking for "a person waving" and handing the model an exact skeleton of a waving pose to follow. That extra control is especially valuable for video, where consistent framing across frames matters more than in a single image.

See also: [LoRA](/glossary/lora), [Temporal Consistency](/glossary/temporal-consistency).
