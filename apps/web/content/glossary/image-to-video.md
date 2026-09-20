---
term: "Image-to-Video"
description: "Animating a single still image into a short video clip, typically by predicting plausible motion around it."
faqs:
  - q: "What is image-to-video?"
    a: "Image-to-video takes one still image as a starting point and generates a short clip of plausible motion around it — a camera push, cloth moving in the wind, a subject blinking."
  - q: "How is image-to-video different from a Ken Burns effect?"
    a: "A Ken Burns effect only pans and zooms the same flat image — the pixels never change. Image-to-video actually generates new motion and detail frame by frame."
---

**Image-to-video** starts from a single still image and generates a short clip of motion around it — a camera push, hair moving in the wind, water rippling. Unlike a pan-and-zoom treatment, the model invents new pixel detail in every frame rather than moving the same flat image around.

It's a common way to bring a product photo or a generated still to life without needing footage. GenMotion's compositions can still combine a source image with programmatic motion — a real camera move computed through [interpolation](/glossary/interpolation) — when you want deterministic, frame-accurate control instead.

See also: [Text-to-Video](/glossary/text-to-video), [Upscaling](/glossary/upscaling).
