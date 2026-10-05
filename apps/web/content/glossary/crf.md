---
term: "CRF (Constant Rate Factor)"
description: "The main quality setting for H.264, H.265, VP9 and AV1 video: a lower number means higher quality and a larger file, and every codec uses its own scale."
faqs:
  - q: "What is a good CRF value?"
    a: "It depends on the codec, because each has its own range and default. For H.264 the range is 1 to 51 and Remotion's default is 18. For H.265 it is 0 to 51 with a default of 23. A value that looks very good on H.264 can look terrible on VP9, so never copy a number across codecs."
  - q: "Does a lower CRF always look better?"
    a: "It keeps more detail and makes a larger file. But soft text in an exported video is often a pixel-density problem rather than a compression one: a 1920 by 1080 video shown on a 2x display looks softer than the same text rendered at that density, and no CRF fixes that. Render at a higher scale first."
  - q: "Can I set a CRF with hardware acceleration?"
    a: "In Remotion, no. If hardware acceleration is on, use a video bitrate instead. CRF and bitrate are mutually exclusive."
---

**CRF** is the Constant Rate Factor, the main knob for controlling quality when you encode video. The encoder spends as many bits as each moment needs to hold the quality you asked for. **A lower number is higher quality and a larger file.** A higher number is a smaller file and more visible compression.

Because each codec has its own scale, the same number means different things. As an example, Remotion documents these ranges and defaults:

| Codec | Best quality | Best compression | Default |
| --- | --- | --- | --- |
| H.264 | 1 | 51 | 18 |
| H.265 | 0 | 51 | 23 |
| VP8 | 4 | 63 | 9 |
| VP9 | 0 | 63 | 28 |
| AV1 | 0 | 63 | 30 |

Choose it after you have settled output resolution and pixel density, not before. For the full story on crisp text, see [why text in a Remotion export looks blurry](/answers/remotion-blurry-text-in-exported-video).

See also: [Render](/glossary/render), [Frame Rate](/glossary/frame-rate), [Aspect Ratio](/glossary/aspect-ratio).
