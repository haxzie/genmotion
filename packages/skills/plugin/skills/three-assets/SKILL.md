---
name: three-assets
description: "Bringing real material into Three.js scenes: logos (SVG drawn into a texture, or extruded from path data), product screenshots and photos on planes and device frames, screen recordings as video textures seeked per frame, and the audio that goes on the timeline instead of in a scene. Covers loading everything through the frame barrier so no frame ships untextured. Load it when a scene uses a logo, screenshot, photo, recording or any file from assets/."
---

# Assets in Three.js scenes

Scenes may import only `three` and `@genmotion/three-engine`, so there are no addon loaders (no GLTFLoader, no SVGLoader). Everything here uses the core loaders, wired to `ctx.manager` so the renderer waits for them.

## When to use

- A scene shows a logo, a screenshot, a photo or a screen recording.
- A format skill says to `save-asset` something and then put it on screen.
- Frames render with blank white or black rectangles where an image should be.

## Getting files in

1. Remote files are never hot-linked from scene code. `save-asset` the file into `assets/` first.
2. Import it from the scene: `import logoUrl from "../assets/logo.svg";`. The bundler turns that into a URL the renderer can load.
3. Load it through a loader constructed with `ctx.manager`. A loader without it is invisible to the frame barrier.

## Images and screenshots

```ts
const map = new THREE.TextureLoader(ctx.manager).load(shotUrl);
map.colorSpace = THREE.SRGBColorSpace;
map.anisotropy = 8;
const shot = new THREE.Mesh(
  new THREE.PlaneGeometry(1.6, 1.6 * (H / W)),
  new THREE.MeshBasicMaterial({ map }),
);
shot.name = "dashboard-screenshot";
```

- Set the plane's aspect from the image's real pixel size (`W`, `H`), known when you saved it. A stretched screenshot is the most common asset bug.
- Use `MeshBasicMaterial` for screenshots and UI. Lighting a screenshot makes it look wrong.
- A device frame is a rounded box (an `ExtrudeGeometry` of a rounded `Shape`, built once) with the screenshot plane just in front of its face.

## Logos

- **SVG mark, flat:** load it as an image (`new THREE.ImageLoader(ctx.manager).load(svgUrl, ...)`), draw it into a large `OffscreenCanvas` (at least 1024 pixels on the long edge), and use that as a `CanvasTexture`. This keeps the real artwork exactly.
- **SVG mark, extruded:** copy the path's coordinates into `THREE.Shape` calls (`moveTo`, `lineTo`, `bezierCurveTo`) and use `ExtrudeGeometry`, as the starter scene does with the GenMotion mark. Only for simple marks, and only from the real file's path data. Never redraw a logo from memory.
- Never generate a brand's logo with `generate-image`.

## Screen recordings

A recording is a `VideoTexture` over a `<video>` element you seek yourself:

```ts
const el = document.createElement("video");
el.src = clipUrl;
el.muted = true;
el.preload = "auto";
const tex = new THREE.VideoTexture(el);
tex.colorSpace = THREE.SRGBColorSpace;
// in the frame callback:
el.currentTime = startAt + time;
```

Never call `play()`. The frame callback sets `currentTime` for every frame, which keeps the export exact. Trim long recordings to the moment that matters first, with `ffmpeg`, and save the trimmed file into `assets/`.

## Audio

Audio never lives in a scene. Music, voiceover and sound effects are files in `assets/` placed on the timeline with `place-audio`, which writes them into `project.json`'s `audio` array with a lane, `startFrame`, `durationInFrames`, `volume` and fades. The render mixes only what the manifest lists, and the dev studio plays the same mix under the picture. Keep music around 0.15 to 0.35 volume under narration, and fade it in and out (half a second at least) rather than letting it start and stop dead.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Remote files | `save-asset` | Ask the user to drop the file into `assets/` |
| Trimming recordings | `ffmpeg` | Use the recording whole and seek into it with an offset |
| Music, narration, effects | `place-audio` | None: audio outside the manifest is silent in the export |
| Seeing it loaded | `capture-frames` | None |

## Checks before you finish

1. `capture-frames` on the first frame each asset appears: no blank planes, nothing stretched.
2. Every loader in every scene takes `ctx.manager`.
3. No `http` URL appears in any scene or component file.
4. `validate` passes.
