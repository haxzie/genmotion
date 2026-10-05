---
title: "Why does my HyperFrames video clip render black or freeze?"
description: "A video clip that plays in preview but renders black usually needs its own data-start and data-duration, not just a timed wrapper. Also covers clips shorter than their slot and videos that freeze while their box animates."
tool: hyperframes
kind: error
date: "2026-10-05"
updated: "2026-10-05"
tags: ["black-frames", "video", "media"]
related:
  - hyperframes-render-is-black
  - hyperframes-check-passed-but-the-video-is-wrong
  - hyperframes-render-looks-different-from-preview
sources:
  - label: "hyperframes#3377: closed by the maintainer as a composition error"
    url: "https://github.com/heygen-com/hyperframes/issues/3377"
  - label: "hyperframes#1043: non-looping video shorter than data-duration"
    url: "https://github.com/heygen-com/hyperframes/issues/1043"
  - label: "HyperFrames troubleshooting: media problems"
    url: "https://hyperframes.heygen.com/guides/troubleshooting"
  - label: "HyperFrames rules and anti-patterns"
    url: "https://hyperframes.heygen.com/prompting/rules-and-anti-patterns"
genmotion:
  heading: "Describe the clip, skip the timing attributes"
  body: |-
    In GenMotion you say where a clip goes and for how long, and the agent writes the HyperFrames timing for it, working from the HyperFrames skills it ships with. Before it reports back it can capture frames from inside the clip's window and look at them, so a clip that would render black is caught while you can still change it. Footage and audio live in the project's assets folder, in a project you own.
faqs:
  - q: "Does a video need class=clip?"
    a: "Not for visibility. HyperFrames manages video visibility through the media runtime, and the docs say timed DOM and image elements take class=clip. A video should carry its own data-start and data-duration so the runtime knows when it plays."
  - q: "My video is longer than the composition. Will it extend the video?"
    a: "No. An explicit root data-duration is the output window. A long source video does not stretch a shorter authored duration."
  - q: "Why is my video silent?"
    a: "A video with sound keeps it on the video element with data-has-audio=true and no muted attribute. Silent footage and b-roll should carry muted. Use a separate audio element for music, voiceover, or replacement audio. The linter reports a timed video that declares neither muted nor data-has-audio as video_missing_muted."
---

Three different things produce a black video clip, and they look identical from the outside.

## Cause 1: the video has no timing of its own

This is the one that catches people, including the maintainers. In a report titled "video clip renders black when placed later in the timeline than its source duration", a 4 second source rendered black once the clip was placed later in the timeline than the source's own length. The maintainer who filed it later closed it with this note: the composition was wrong, not the renderer.

The wrapper had the timing. The `<video>` did not.

```html
<!-- Black once data-start passes the source length -->
<div class="clip" data-start="6.0" data-duration="2">
  <video src="public/c.mp4"></video>
</div>

<!-- Renders correctly -->
<div class="clip" data-start="6.0" data-duration="2">
  <video src="public/c.mp4" data-start="6.0" data-duration="2"></video>
</div>
```

Same source, same composition, same `data-start`. Measured by averaging each frame to a single pixel: the first version was `000000` at 6.2, 7.0 and 7.8 seconds; the second showed content at all three. Without its own timing, the element's schedule starts at composition zero, so by 6 seconds it is past the end of a 4 second source.

**Fix:** put `data-start` and `data-duration` on the `<video>` itself.

## Cause 2: the source is shorter than its slot

If the file is shorter than `data-duration` and the video has no `loop` attribute, older versions held the last frame in Studio preview (the browser's native behaviour) but rendered black for the remainder. That was reported against 0.6.38. A later report that a bare `<video>` disappears after the file ends while preview keeps the last frame was closed in August 2026.

**Fix:** make `data-duration` match the real length of the file, add `loop` if you want it to repeat, or trim the slot. Check the source length with `ffprobe` before you pick the duration.

## Cause 3: the video froze, or only the box moved

Do not animate `width`, `height`, `top` or `left` directly on a `<video>` element. The picture freezes while the box animates. Put the video inside a wrapper and animate the wrapper:

```html
<div id="video-wrapper">
  <video src="./assets/video.mp4" style="width:100%;height:100%"></video>
</div>
```

```js
tl.to("#video-wrapper", { width: 500, height: 280, x: 1200 }, 2);
```

Never call `play()`, `pause()` or set `currentTime` from a composition script either. HyperFrames owns media playback, and doing it yourself makes media play out of sync.

## If the video is black in preview but renders

That is a codec problem rather than a timing one. The browser may not decode a source that FFmpeg can. HyperFrames normally builds a compatible preview proxy. If the frame stays black, check that automatic proxying is not disabled, run `npx hyperframes doctor`, and run `npx hyperframes lint --verbose` to list the affected files.

## Check it worked

```bash
npx hyperframes snapshot --at 0,6.5,7.5
```

Sample a time inside the clip's own window, not just at the start. Frame zero will look fine in every version of this bug.
