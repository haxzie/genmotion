---
term: "Seed"
description: "The number that initializes a generative model's randomness, making an otherwise random output reproducible."
faqs:
  - q: "What does a seed do in AI generation?"
    a: "Generative models rely on randomness to produce variety. A seed fixes that randomness to a specific starting point, so the same prompt and seed reproduce the same output."
  - q: "Why would I want to reuse a seed?"
    a: "Reusing a seed lets you isolate the effect of a single change — like tweaking one word in a prompt — because everything else about the generation stays identical."
---

A **seed** is the number that initializes a generative model's random number generator. Because diffusion and other generative processes rely on randomness, the same [prompt](/glossary/prompt) can produce a different result every time — unless you fix the seed, in which case the same prompt and seed combination reproduces the same output.

Seeds are useful for isolating change: lock the seed and vary only the prompt, and you can see exactly what a single word or setting did. It's the generative-AI equivalent of a controlled experiment.

See also: [Prompt](/glossary/prompt), [Diffusion Model](/glossary/diffusion-model).
