---
term: "Latent Space"
description: "The compressed, abstract representation a generative model works in before decoding its output into pixels."
faqs:
  - q: "What is latent space in AI image generation?"
    a: "Latent space is a compressed mathematical representation of an image that a model manipulates internally. A separate decoder step turns that representation into the final pixels you see."
  - q: "Why do models generate in latent space instead of pixels directly?"
    a: "Working in a compressed representation is dramatically cheaper to compute than manipulating full-resolution pixels at every step, which is what made modern diffusion models fast enough to be practical."
---

**Latent space** is the compressed, abstract representation a generative model manipulates internally, rather than working with full-resolution pixels directly. A [diffusion model](/glossary/diffusion-model) typically denoises within this compressed space, and only a final decoding step expands the result into the pixels you actually see.

Generating in latent space is dramatically cheaper than doing the equivalent work at full pixel resolution, which is a big part of why modern image and video models are fast enough to be usable.

See also: [Diffusion Model](/glossary/diffusion-model), [Upscaling](/glossary/upscaling).
