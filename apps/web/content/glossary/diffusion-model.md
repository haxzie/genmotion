---
term: "Diffusion Model"
description: "A generative model that creates images or video by learning to reverse a process of adding random noise."
faqs:
  - q: "What is a diffusion model?"
    a: "A diffusion model is trained by gradually adding random noise to an image until it's pure static, then learning to reverse that process. To generate something new, it starts from noise and denoises it step by step, guided by a prompt."
  - q: "Why do most AI image and video tools use diffusion?"
    a: "Diffusion models produce higher-quality, more coherent results than earlier generative approaches and scale well with more data and compute, which is why they power most current text-to-image and text-to-video tools."
---

A **diffusion model** learns to generate images (or video) by doing the opposite of what its name suggests: it's trained by taking real images and gradually adding random noise to them until nothing recognizable remains, then learning to reverse that process one small step at a time. To create something new, generation starts from pure noise and denoises it repeatedly, guided by a prompt, until a coherent image emerges.

Diffusion is the technique behind most modern text-to-image and [text-to-video](/glossary/text-to-video) tools. It's also why generation happens in multiple "steps" — each step is one denoising pass — and why a fixed [seed](/glossary/seed) makes the process reproducible.

See also: [Latent Space](/glossary/latent-space), [Video Diffusion](/glossary/video-diffusion).
