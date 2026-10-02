---
name: three-assets
description: "Bringing real material into Three.js scenes so no frame ships blank: asset imports and their type declarations, images and screenshots at true aspect, logos rasterised crisp from SVG or extruded from the real path data with a bevel, device frames, user footage transcoded to WebM and seeked from the frame through the loading barrier (never played, copied through a canvas so it captures), font files for type, and why audio goes on the timeline with place-audio instead of in a scene. Load it when a Three.js scene uses a logo, screenshot, photo, recording, font or any file from assets/."
---

# Assets on Three.js: real files, loaded so every frame is complete

A scene may import only `three` and `@genmotion/three-engine`, so there are no addon loaders (no GLTFLoader, no SVGLoader) and no page globals. Everything here uses the core loaders, wired to `ctx.manager`: the host waits for that manager before it captures a frame, then draws again. Anything loaded around it ships as an empty plane in the frames that finish first.

The recipes were built against the real host and debugged by rendering. Two things you would not guess: a `<video>` uploaded straight to WebGL captures **black** in the headless renderer, and the CLI's Chromium cannot decode **H.264 MP4** at all. `references/footage-and-audio.md` has the version that works.

Code: `references/images-and-logos.md` (imports, `picture()`, `logoPlane()`, `extrudedMark()` with an SVG path parser, device frames), `references/footage-and-audio.md` (`footage()`, transcoding, continuity across a cut, fonts, audio).

## When to use

- A scene shows a logo, screenshot, photo, product image or screen recording.
- An owner skill says to `save-asset` something and then put it on screen.
- Frames render with blank, black or stretched planes where an image or video should be.
- Type needs a specific font, or a scene needs sound.

Not for: finding or generating material (`stock-and-broll`, `screen-capture`), editing user footage into a cut (`video-editing`), type layout (`three-type`), sound levels (`sound-design`).

## Getting files in

1. **Never hot-link.** A remote URL in scene code rots or gets blocked by the renderer. `save-asset` the file into `assets/` first. For a real brand mark, find the official file (the brand's press kit or site); never generate or redraw one.
2. **Import it**: `import shotUrl from "../assets/dashboard.png";`. The bundler turns it into a URL (small images become inline data URLs). Add `components/assets.d.ts` once so TypeScript accepts the import (`references/images-and-logos.md` §1).
3. **Load it through `ctx.manager`**: `new THREE.TextureLoader(ctx.manager)`, `new THREE.ImageLoader(ctx.manager)`, or `itemStart`/`itemEnd` around anything else (a font, a video seek).
4. **Name the mesh** after what it shows (`dashboard-screenshot`, `hero-mark`), so the editor can point at it.

## Images and screenshots

- `picture(ctx, url, widthPx, name)`: a plane `widthPx` composition px wide whose height comes from the image's real pixels when it lands, so it is never stretched.
- UI and screenshots are unlit and not tone mapped (`MeshBasicMaterial`, `toneMapped: false`): lit UI looks wrong at once.
- Shown much smaller than its pixels: keep mipmaps and anisotropy 8, or it shimmers as it moves. Shown larger than its pixels: it goes soft; crop and zoom from a bigger source instead.
- A screenshot that fills the frame needs ≥ 1920 px wide (16:9) or ≥ 1080 px (9:16) after crop. Text inside it must clear 28 px where it is shown: zoom into the part that matters rather than shrinking the whole screen.

## Logos

| Need | Build | Notes |
| --- | --- | --- |
| Flat mark, any size | `logoPlane(ctx, svgUrl, widthPx, aspect, name)` | The SVG is rasterised at 2× the shown size: crisp at any size |
| 3D mark | `extrudedMark(d, widthPx, depthPx, material, name)` | From the file's path `d` copied verbatim into `components/brand.ts`; bevel 1.2% of width catches the light |
| Mark with gradient fill | Draw the path into a canvas with `Path2D(d)` and the gradient, or extrude and use a face material per tone | The Samsung Pay template draws its marks with `Path2D` |
| Lockup (mark + wordmark) | Mark plane + a `three-type` label in the brand font, measured gap 0.35 × cap size | Or the official lockup file as one plane |

The path parser handles M L H V C S Q T Z, absolute and relative. Arcs throw an error: flatten them in the SVG first, or use the flat plane. Light extruded marks with `three-look`'s product setup and `brand` tone mapping so the brand colour holds.

## Device frames

A phone or laptop is an extruded rounded rectangle (glossy dark `MeshPhysicalMaterial`, a small bevel) with the screenshot or footage plane just in front of its face; code in `references/images-and-logos.md` §4. Size the screen to the frame's inner area. Pushing through the screen into the UI is a match-push (`three-camera`, `three-transitions`).

## Footage

- **Transcode first** with `ffmpeg`: VP9 WebM, a keyframe every 15 frames, the project's fps, trimmed to the moment that matters, no audio track. The exact command is in `references/footage-and-audio.md` §1.
- **`footage(ctx, url, { from, size })`**: creates the element through `ctx.canvas.ownerDocument`, seeks it from the frame (`clip.seek(time)`, once per frame), registers every seek on `ctx.manager` so the barrier waits for `seeked`, and copies the decoded frame through a 2D canvas so it captures.
- **Never `play()`** and never a `VideoTexture` left running: wall-clock playback cannot match an export.
- **Across a cut**, one source with agreeing offsets gives consecutive frames: scene N `from = X − D_N / fps`, scene N+1 `from = X`.
- Footage cannot sit inside a motion-blurred scene: the blur accumulates before the seek lands.
- Speed is a function of time: `clip.seek(time * 2)` plays 2×, a constant freezes a frame; a ramp is `clip.seek(s(time))`, where `s` is the closed-form integral of the speed curve.
- Vertical footage in a 16:9 film (or the reverse) sits on a plane at its own aspect with the backdrop around it; never stretch it, and never fill the sides with a blurred copy unless the style family calls for it.

## Fonts

The capture machine has almost no fonts installed. `save-asset` the brand's woff2 (or Inter's variable woff2) into `assets/` and load it with `three-type`'s `withFonts()`, which waits for it inside the frame barrier and only then draws any type.

## Audio

Audio never lives in a scene: an `<audio>` element or Web Audio in scene code is silent in the export. Music, voiceover and effects are files in `assets/` placed on the timeline with `place-audio`, which writes them into `project.json`'s `audio` with a start frame, duration, volume and fades; the render mixes exactly that, and the dev studio plays it under the picture. Levels, fades, ducking and loudness are `sound-design`'s (a bed under VO is 0.14–0.28, default 0.18 ≈ −15 dB). Footage with its own sound: extract the audio with `ffmpeg`, place it at the picture's start frame and offset, and keep the picture file silent.

## A complete scene: mark and footage

A flat logo, an app recording on a device and its continuation into the next scene; compiled and captured with a WebM test clip (frame-accurate timecodes on both sides of the cut).

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import logoUrl from "../assets/logo.svg";
import demoUrl from "../assets/demo.webm";
import { fitCamera, PX } from "../components/stage";
import { colorPipeline, LOOK } from "../components/look";
import { footage } from "../components/media";
import { logoPlane } from "../components/logo";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, renderer, height, fps, durationInFrames: D } = ctx;
  colorPipeline(renderer, "flat");
  fitCamera(camera, height);
  scene.background = new THREE.Color(LOOK.bg);
  const logo = logoPlane(ctx, logoUrl, 160, 1, "logo");           // 160 px square mark
  logo.position.set(-760 * PX, 420 * PX, 0);
  // the next scene opens on this clip at 3.0 s, so this one ends on 3.0 s minus one frame
  const clip = footage(ctx, demoUrl, { from: 3.0 - D / fps, size: [1920, 1080] });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 7.2),  // 1280 x 720 px
    new THREE.MeshBasicMaterial({ map: clip.texture, toneMapped: false }));
  screen.name = "demo-recording";
  scene.add(logo, screen);
  return ({ time }) => {
    clip.seek(time);                                              // once per frame, never play()
  };
}
```

## When a frame comes out wrong

| Symptom in a capture | Cause | Fix |
| --- | --- | --- |
| Blank or transparent plane on the first frames | Loader not on `ctx.manager` | `new THREE.TextureLoader(ctx.manager)`; `itemStart`/`itemEnd` around anything custom |
| Footage plane black | `VideoTexture` / direct video upload, or H.264 in the CLI renderer | `footage()` with a WebM file |
| Footage one frame behind | Seek on an exact frame boundary | `footage()`'s quarter-frame offset; source at the project fps |
| Image stretched | Plane aspect guessed | `picture()` takes the aspect from the pixels |
| Logo soft | SVG rasterised small, then scaled | `logoPlane()` at the shown width |
| Logo colour shifted | Lit or tone mapped | Flat: `toneMapped: false`; 3D: `brand` tone mapping (`three-look`) |
| Wrong font in the export | Font named, not shipped | `withFonts()` with the woff2 in `assets/` (`three-type`) |
| Silence in the export | Sound in scene code | `place-audio` |

## Before building with assets

1. List every file the film needs (marks, screenshots, recordings, fonts, music, VO) in VIDEO.md, with where each comes from.
2. `save-asset` every remote file into `assets/`; note pixel sizes, durations and the mark's viewBox.
3. Transcode footage to WebM at the project fps and trim it; extract its audio if it has any.
4. Add `components/assets.d.ts`, `components/media.ts`, `components/logo.ts`, and the brand path data in `components/brand.ts`.
5. Build; capture the first frame each asset appears.

## Anti-patterns

- **A loader without `ctx.manager`** (or `new Image()`): frames that finish first ship blank.
- **A hot-linked URL or a logo CDN** in scene code.
- **A redrawn, traced or generated brand mark.** Use the official file, verbatim.
- **Stretched screenshots** from a guessed aspect.
- **H.264 MP4 footage, `play()`, or a `<video>` uploaded straight to WebGL**: nothing, or black, in the export.
- **Sound in a scene.**
- **4K+ textures everywhere**: every frame is rendered and screenshotted; export time multiplies.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Remote files and fonts | `save-asset` | Ask the user to drop the files into `assets/` |
| Transcoding and trimming footage, extracting its audio | `ffmpeg` | Ask for a WebM export of the clip; never ship MP4 into a scene |
| Music, narration, effects | `place-audio` | None: audio outside the manifest is silent in the export |
| Seeing it loaded | `capture-frames` | None |

## Checks before you finish

1. `capture-frames` on the first frame each asset appears, and on the first frame of each scene: no blank, black or stretched planes; footage shows the right moment (compare a timecode or a recognisable frame).
2. Every loader takes `ctx.manager`; every video is seeked (no `play()`), is WebM, and is seeked once per frame.
3. No `http` URL in any scene or component file; every mark comes from an official file in `assets/`.
4. Logos and screenshots are crisp at their largest on-screen size; text inside screenshots clears 28 px.
5. Every sound is on the timeline in `project.json`, none in scene code.
6. No randomness or wall-clock timing; `validate` passes.
