---
term: "Deterministic Rendering"
description: "Rendering in which the same composition always produces exactly the same video, because every frame is a pure function of its frame number."
faqs:
  - q: "What does deterministic rendering mean?"
    a: "It means the same input always gives the same output. A deterministic renderer works out what frame 90 looks like from the number 90 alone, never from the wall clock, an unseeded random number, or something fetched over the network while rendering."
  - q: "Why does it matter for video made with code?"
    a: "Because a video is thousands of independent frames. If any of them depends on time, randomness or network state, two renders of the same project differ, and what you previewed is not what ships. Determinism is what makes automated pipelines, CI tests and AI-driven editing trustworthy."
  - q: "Are parallel renders bit-identical?"
    a: "Not necessarily. Each worker runs its own browser process, and rasterisation can differ by a pixel level across workers at chunk boundaries even when your composition is deterministic. For exact bits, render with a single worker and compare lossless frames rather than the encoded file."
---

**Deterministic rendering** means the same composition always produces the same video. The renderer does not play your animation and film it. It asks for one frame at a time, and the answer to "what does frame 90 look like?" depends on one thing: the number 90.

In a frame-driven tool, the time of a frame is computed with integer math, such as `floor(frame) / fps`, and every animation is moved to exactly that time before the frame is captured. Real time is never consulted.

## What breaks it

- **The wall clock.** `Date.now()`, timers and `requestAnimationFrame` differ on every run.
- **Unseeded randomness.** A bare `Math.random()` gives a different frame each time. A seeded generator is fine.
- **The network, mid-render.** An asset that arrives late, or differently, changes the frame.
- **State carried between frames.** A render worker may seek straight to a later frame without having visited the earlier ones, so anything that depends on order can differ from a live preview.
- **Your machine.** Fonts and browser versions differ between computers, so a local render can shift by a pixel. A pinned environment such as Docker removes that variable.

## In practice

GenMotion previews and renders with one deterministic runtime, so the MP4 matches the editor. HyperFrames and Remotion each enforce the same principle in their own way. For the specifics, see [the HyperFrames determinism checklist](/answers/hyperframes-determinism-rules), [why a render can differ from its preview](/answers/why-does-my-render-look-different-from-the-preview), and [what to do when it does](/answers/hyperframes-render-looks-different-from-preview).

See also: [Render](/glossary/render), [Frame](/glossary/frame), [Frame Rate](/glossary/frame-rate).
