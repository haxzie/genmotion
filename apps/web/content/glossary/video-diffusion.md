---
term: "Video Diffusion"
description: "A diffusion model extended to generate motion across a sequence of frames rather than a single image."
faqs:
  - q: "What is video diffusion?"
    a: "Video diffusion extends the image-generating diffusion process across a sequence of frames, denoising a whole short clip at once (or frame by frame with extra machinery) so it holds together as motion rather than a slideshow of unrelated images."
  - q: "Is video diffusion the same as text-to-video?"
    a: "Video diffusion is the technique; text-to-video is the application. Most modern text-to-video and image-to-video tools are built on some form of video diffusion."
---

**Video diffusion** extends the same denoising process behind image [diffusion models](/glossary/diffusion-model) across a sequence of frames, so the output holds together as motion rather than a slideshow of unrelated stills. It's the technique underneath most current [text-to-video](/glossary/text-to-video) and [image-to-video](/glossary/image-to-video) tools.

The extra dimension — time — is exactly what makes [temporal consistency](/glossary/temporal-consistency) hard: the model has to keep a subject coherent not just within one frame, but across dozens of them in a row.

See also: [Temporal Consistency](/glossary/temporal-consistency), [Diffusion Model](/glossary/diffusion-model).
