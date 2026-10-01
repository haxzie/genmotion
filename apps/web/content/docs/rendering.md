---
title: Rendering
seoTitle: "Render to MP4, WebM, GIF, MOV and PNG frames"
description: "Render GenMotion videos to MP4, WebM, GIF, MOV or PNG frames. Frame ranges, 4K output, quality, parallel rendering, GPU mode and audio mixing."
group: Reference
order: 2
keywords: [render Three.js to MP4, headless video rendering, export video from code, ffmpeg video render, 4K video render, deterministic rendering]
updated: 2026-10-01
---

`npx @genmotion/cli render` turns a project into a video file. In the Studio, Export does the same thing with the same engine.

```sh
npx @genmotion/cli render                      # exports/<project>.mp4
npx @genmotion/cli render teaser.webm          # format from the extension
npx @genmotion/cli render --codec gif --frames 0-89
npx @genmotion/cli render --scale 2            # 3840×2160 from a 1080p project
```

## Options

| Flag | What it does |
| --- | --- |
| `--codec <mp4\|webm\|gif\|mov\|png>` | Output format. Default: from the extension, else `mp4`. `png` writes a folder of frames |
| `--frames <range>` | Part of the video: `0-89`, `1s-3s`, `120-` (inclusive) |
| `--scale <n>` | Output size multiplier, e.g. `2` for 4K from 1080p |
| `--quality <0-100>` | Encoder quality. Default 80 |
| `--crf <n>` | Exact x264/VP9 CRF. Overrides `--quality` |
| `--concurrency <n>` | Parallel browser tabs. Default half your cores, at most 8 |
| `--gl <swiftshader\|gpu>` | WebGL backend. Default `swiftshader` |
| `--no-audio` | Skip the audio mix |

## How a render works

::: steps
### Serve

The project is served over a loopback HTTP server. The page is the same one the `dev` studio shows.

### Capture

Headless Chromium seeks each frame. The engine waits for textures, fonts and media to finish loading before the frame is captured, so nothing renders half-loaded.

### Encode

Frames are piped straight into ffmpeg. With `--concurrency`, the frame range is split across tabs and the segments are joined without re-encoding.

### Mix

Audio from `project.json` is mixed in once, with trims, fades and volume applied.
:::

## Speed and consistency

The default WebGL backend, SwiftShader, renders on the CPU. It's slower, but it produces the same pixels on every machine, which is what you want in CI and for review diffs. `--gl gpu` uses your graphics card and is much faster for heavy scenes.

Parallel rendering produces exactly the same frames as rendering in order, because every frame is a function of time alone. Raising `--concurrency` never changes the result.

::: tip
Preview a section before a full render: `npx @genmotion/cli render --frames 4s-6s` or `npx @genmotion/cli still --at 5s`.
:::

## Formats

| Format | Use it for |
| --- | --- |
| MP4 (H.264) | Everywhere: websites, social, decks |
| WebM (VP9) | Web embeds with a smaller file |
| GIF | READMEs, docs, chat |
| MOV | Editing in Final Cut or Premiere |
| PNG frames | Compositing, or your own encoder |
