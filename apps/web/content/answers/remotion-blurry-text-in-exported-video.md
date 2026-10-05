---
title: "Why is the text in my Remotion video blurry, and how do I render it crisp?"
description: "Soft text in an exported Remotion video is usually a pixel-density problem, not a compression one. Use output scaling, then CRF, then check JPEG quality, colour space and the codec. With the CRF defaults for every codec."
tool: remotion
kind: error
date: "2026-10-05"
updated: "2026-10-05"
tags: ["quality", "crf", "scaling", "encoding"]
related:
  - remotion-render-is-slow
  - why-does-my-render-look-different-from-the-preview
  - remotion-delayrender-was-called-but-not-cleared
sources:
  - label: "Remotion: Quality guide"
    url: "https://www.remotion.dev/docs/quality"
  - label: "Remotion: Encoding guide"
    url: "https://www.remotion.dev/docs/encoding"
genmotion:
  heading: "Check sharpness on the real output"
  body: |-
    In GenMotion you preview the composition frame by frame and export from that same project, so you judge text on the real output instead of reasoning about CRF. GenMotion does not render Remotion projects: it builds Three.js and HyperFrames videos. [Remotion alternatives, compared honestly](/blog/remotion-alternatives).
faqs:
  - q: "Why is text soft when my video is already 1920 by 1080?"
    a: "Many computers have a high-density display. A 1920 by 1080 video shown at 1920 by 1080 CSS pixels on a 2x display has each video pixel stretched over four device pixels, so text looks softer than the same text rendered at that density. To get the same sharpness you would need a 4K video."
  - q: "What is the CRF default for each codec?"
    a: "H.264: 18. H.265: 23. VP8: 9. VP9: 28. AV1: 30. A lower number is better quality and a larger file. The scales differ, so 23 looks very good on H.264 and terrible on WebM."
  - q: "Why can I not set a CRF?"
    a: "If you enable hardware acceleration you cannot set a crf. Use the --video-bitrate option instead. The two options are mutually exclusive."
---

If the text in your exported video looks soft, the reflex is to lower the compression. That is usually the wrong first move. The Remotion quality guide lists the real causes in a deliberate order.

## 1. Pixel density, the surprising one

Take a 1920 by 1080 video with text in it, and embed it on a web page at `width="1920" height="1080"`. On a high-density display such as a MacBook, the device has 2x pixel density but the video has 1920 by 1080 pixels, so each video pixel is twice as large as a device pixel. The text is less sharp than it would be on a low-density display. To match that sharpness you would need to render a 4K video.

**Fix:** use Remotion's output scaling to render at a higher pixel density without changing your composition:

```bash
npx remotion render --scale=2
```

The composition stays 1920 by 1080, and the output is 3840 by 2160, rendered at twice the density. This is the single biggest improvement for text-heavy video.

## 2. CRF, the main compression dial

The Constant Rate Factor controls quality. **Lower is better quality and a larger file.** Every codec has its own range and its own default, so the same number means different things:

| Codec | Best quality | Best compression | Default |
| --- | --- | --- | --- |
| H.264 | 1 | 51 | 18 |
| H.265 | 0 | 51 | 23 |
| VP8 | 4 | 63 | 9 |
| VP9 | 0 | 63 | 28 |
| AV1 | 0 | 63 | 30 |

So `23` looks very good on H.264 and terrible on WebM. Set it with `--crf` on the CLI or `Config.setCrf()` in the config file.

```bash
npx remotion render --crf=14
```

**Hardware acceleration:** if you enable it, you cannot set a CRF. Use `--video-bitrate` instead. The two are mutually exclusive.

## 3. JPEG quality

By default Remotion screenshots each frame as a JPEG at quality 80 on a scale of 0 to 100. Raise it with `--jpeg-quality`, or switch to PNG with `--image-format=png`, which is slower. PNG is also the format you need for a transparent video.

## 4. Colour accuracy

Export in `bt709` for more accurate colours. The docs say this becomes the default in Remotion 5.0.

## 5. GIFs

GIFs only support a 256 colour palette, which is a large quality loss in itself. Make sure you are on at least v4.0.138 for the best colour accuracy, and choose a different format if the palette is not acceptable.

## 6. x264 preset

For H.264, `--x264-preset` controls the tradeoff between quality, speed and compression.

## Recipe for crisp text

```bash
npx remotion render --scale=2 --crf=16 --jpeg-quality=95
```

These are starting values, not official recommendations. This renders at 2x density with a better CRF and JPEG quality. Expect a slower render and a larger file, since higher resolutions make renders slower (see [why Remotion renders are slow](/answers/remotion-render-is-slow)). Tune it down to the point where the text still looks right in the place your viewers will watch.

## Check it worked

View the result on the same kind of screen your audience uses, at the size they will see it. A render that looks sharp on a standard monitor can look soft on a Retina display, which is the case this guide is about.
