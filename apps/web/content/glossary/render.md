---
term: "Render"
description: "The process of turning a composition into final output frames and encoding them into a video file."
faqs:
  - q: "What does rendering a video mean?"
    a: "Rendering is computing each final frame of a composition and encoding the sequence into a deliverable file such as an MP4. It's distinct from previewing, which plays the composition live for review."
  - q: "Why does GenMotion's render match its preview?"
    a: "Rendering runs the same deterministic runtime as the browser preview and then encodes the frames with ffmpeg, so the resulting MP4 is pixel-identical to what you previewed."
---

**Rendering** is the act of computing each final frame of a composition and encoding the sequence into a deliverable video file such as an MP4. It's distinct from *previewing*, which plays the composition live for review.

In GenMotion, rendering happens on a headless worker that drives the **same** deterministic runtime as the browser preview, then encodes the frames with ffmpeg. Because both surfaces share one runtime, the rendered MP4 is pixel-identical to what you previewed.

See also: [Frame](/glossary/frame), [Aspect Ratio](/glossary/aspect-ratio).
