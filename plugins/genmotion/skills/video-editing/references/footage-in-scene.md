# Footage in a scene: the tested build

Read this before the first scene that shows the user's footage. Everything here was rendered with `genmotion render` and checked frame by frame against a source with a burned-in frame counter.

## What was measured

| Setup (10 s, 1920×1080, 30 fps, 4 tabs, SwiftShader) | Frames exact | Render time |
|---|---|---|
| H.264 `.mp4` in a Three scene | 0 of 300 (black plate; render still reports ok) | 68 s |
| VP9, 240-frame GOP, `currentTime` set per frame, nothing awaited | 0 of 300 (1–2 frames late, frame 0 black) | 302 s |
| VP9, 240-frame GOP, seek registered with `ctx.manager` | 299 of 300 | 241 s |
| VP9, all-intra (`-g 1`), seek registered | 300 of 300 | 160 s |
| **VP9, `-g 15`, seek registered** | **300 of 300** | **121 s** |
| A 7 s two-segment edit conformed this way, with its WAV on the timeline | 210 of 210, audio onsets on the matching frames | 97 s |
| Re-test (640×360, frame-counter clip, VP9 `-g 15`): this helper | 90 of 90 | — |
| Same clip: `three-assets`' `footage()` (2D-canvas copy into a `CanvasTexture`) | 90 of 90, pixel-identical to the row above | — |
| Same clip: this helper with the `needsUpdate` line on `seeked` removed | 71 of 90 (stale frames, not black) | — |

Conclusions:

1. **Conform to VP9 WebM.** The CLI renders with Playwright's open-source Chromium (headless shell), which answers `canPlayType('video/mp4; codecs="avc1…"')` with `""` (no H.264, no AAC) and `"probably"` for VP9, VP8 and AV1. The desktop app exports through the same Three.js render host inside Electron, whose Chromium build normally includes H.264 (not measured here), so an `.mp4` can render on the desktop and come out black from the CLI. A project must render the same everywhere, so every engine gets VP9. The seek registration below matters on both: the desktop uses the same frame barrier.
2. **Keyframe every 15 frames** (0.5 s). Exact and fastest; long GOPs are slower and can land one frame off.
3. **Register every seek with the loading manager** (helper below). Seek to the middle of the frame, `(frame + 0.5) / fps`, never its leading edge: a seek on the boundary picks either neighbour.
4. **Add a 0.5 s tail handle** to the conformed file. Without it the scene's last frame showed the second-to-last source frame.
5. **Budget the render**: roughly 10–15 s per second of 1080p footage on 4 idle cores with the default WebGL; on a shared, loaded machine it was 2–3× that (a 41 s 9:16 edit took 28–35 min). `--gl gpu` is faster where a GPU exists. Run long renders in the background and poll the log.
6. **A `VideoTexture` does not capture black.** That claim circulated in an older version of `three-assets`; re-tested, both a `VideoTexture` and a 2D-canvas copy render frame-exact. What matters is the three rules above (VP9, registered seeks, mid-frame seek times) plus marking the texture `needsUpdate` on `seeked`: a paused, seeked video does not drive the texture's own frame callback reliably, and without it about one frame in five showed the previous picture. `three-assets`' `footage()` is an equivalent helper; use either, not both in one project.

## The footage helper (Three.js)

Put it in `components/footage.ts`. It passes scene validation (no global DOM access: the element comes from the canvas's own document), never hangs on an undecodable file, and keeps the picture exact.

```ts
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";

/**
 * A video file as a texture whose every frame is awaited by the export.
 * The capture barrier waits only on ctx.manager, so the load and every seek
 * are registered as in-flight items and released on loadeddata / seeked.
 */
export function createFootage(ctx: ThreeSceneContext, url: string) {
  const video = ctx.canvas.ownerDocument.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;

  const loadKey = `footage-load:${url}`;
  const seekKey = `footage-seek:${url}`;
  let loading = true;
  let failed = false;
  let seeking = false;
  let wanted = -1;

  ctx.manager.itemStart(loadKey);
  video.addEventListener("loadeddata", () => {
    loading = false;
    // Seek before releasing the load item, so the barrier waiting on the load
    // is still waiting when it ends: the seek belongs to this frame.
    if (wanted >= 0) seek(wanted);
    ctx.manager.itemEnd(loadKey);
  }, { once: true });

  // An undecodable file must not hang the export. The plate stays black,
  // which the frame checks catch.
  video.addEventListener("error", () => {
    failed = true;
    if (loading) {
      loading = false;
      ctx.manager.itemError(loadKey);
      ctx.manager.itemEnd(loadKey);
    }
    if (seeking) {
      seeking = false;
      ctx.manager.itemEnd(seekKey);
    }
  });

  video.addEventListener("seeked", () => {
    texture.needsUpdate = true;
    if (seeking) {
      seeking = false;
      ctx.manager.itemEnd(seekKey);
    }
  });

  video.src = url;

  /** Show the source picture at `seconds`. Pass the middle of a frame. */
  function seek(seconds: number) {
    wanted = seconds;
    if (loading || failed) return;
    if (!video.seeking && Math.abs(video.currentTime - seconds) < 1e-4) return;
    if (!seeking) {
      seeking = true;
      ctx.manager.itemStart(seekKey);
    }
    video.currentTime = seconds;
  }

  return { video, texture, seek };
}
```

Why each part exists:

- `ownerDocument`: scene validation rejects any direct `document`/`window` access, so `document.createElement("video")` fails `validate`.
- Load registered before `src` is set, seek issued before the load is released: otherwise the first frame of every render chunk shows source frame 0.
- One outstanding seek item at a time: in the editor's live preview frames arrive faster than seeks finish, and an unbalanced manager would block the next paused frame forever.
- `crossOrigin = "anonymous"` matches what `TextureLoader` does, so the texture can be uploaded wherever images can.
- Never call `play()`. The frame callback is the only clock.

## A footage scene (16:9 or 9:16, with reframe and jump zoom)

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { createFootage } from "../components/footage";
import { createCaptions } from "../components/captions";
import { WORDS_SECTION_2 } from "../components/words";
import editUrl from "../assets/edit.webm";

const SOURCE_IN = 41.5;          // seconds into edit.webm where this scene starts
const SRC_W = 1920, SRC_H = 1080; // the conformed file's size
const SUBJECT_X = 1310;          // subject's x-centre in source pixels, from the contact sheet
const JUMP_FRAMES = [96, 212];   // cut points inside edit.webm where the size alternates

export default function build(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, width, height, fps } = ctx;
  const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, -10, 10);
  ctx.setCamera(camera);
  scene.background = new THREE.Color("#000000");

  // Cover-fit: scale the source to fill the canvas, then slide to the subject.
  const k = Math.max(width / SRC_W, height / SRC_H);
  const plateW = SRC_W * k, plateH = SRC_H * k;
  const footage = createFootage(ctx, editUrl);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(plateW, plateH),
    new THREE.MeshBasicMaterial({ map: footage.texture }),
  );
  plate.name = "footage";
  const maxShift = (plateW - width) / 2;
  plate.position.x = THREE.MathUtils.clamp((SRC_W / 2 - SUBJECT_X) * k, -maxShift, maxShift);
  scene.add(plate);

  // 9:16: one line centred at (480, 1160) px, inside the readable column x 120–840.
  // 16:9: centred, about 140 px above the bottom.
  const vertical = height > width;
  const captions = createCaptions(WORDS_SECTION_2, vertical
    ? { x: 480 - width / 2, y: height / 2 - 1160, size: 88, maxWidth: 720 }
    : { y: -height / 2 + 140, size: 64, maxWidth: width - 2 * 96 });
  captions.root.position.z = 1;
  scene.add(captions.root);

  return ({ frame }) => {
    footage.seek(SOURCE_IN + (frame + 0.5) / fps);
    // Jump zoom: 1.0 / 1.2 alternating on the cut frames, no ease.
    const segment = JUMP_FRAMES.filter((f) => frame >= f).length;
    plate.scale.setScalar(segment % 2 === 1 ? 1.2 : 1);
    captions.update(frame);
  };
}
```

- **One scene per section** (chapter, clip, act), each with its own `SOURCE_IN` into the one `edit.webm`. A scene is at most 18,000 frames. Scene boundaries are where `three-transitions` handoffs go; inside a scene, footage cuts are already in the file.
- **Reframe:** `plate.position.x` (and `.y`) slide the crop; ease it with `interpolate` over 8–12 frames for a drift, hard-set it on a speaker change. Keep the plate covering the canvas: clamp to `maxShift`.
- **Zoom moves scale the plate, not the camera.** Tested: zooming the orthographic camera (`camera.zoom`) also scales and shifts anything parented to the camera, captions included, because zoom is part of the projection. Scaling the plate leaves the caption layer untouched. The moves and their numbers are `ugc-craft`'s:
  - **Jump zoom:** `plate.scale` steps 1.0 → 1.2 on a cut frame, back to 1.0 on the next (as above).
  - **Punch-in:** `interpolate(frame, [f, f + 8], [1, 1.12], Easing.easeIn)`, hold ≥15 f, release over 12 f `easeInOut` or cut out. ≤4 per 30 s.
  - **Slow push** (long-form, a serious line): `interpolate(frame, [a, a + 150], [1, 1.08], Easing.easeInOut)`.
  - Scale about a pivot, not the centre: shift `plate.position` by `(centre − pivot) × (scale − 1)`. In 16:9 pivot on the eyes, so they stay on the upper-third line. In 9:16 with captions, pivot at the bottom of the caption band (x 540, y ≈ 1150 top-down), so the zoom pushes the face up and away from the text; pivoting on the eyes pushes the mouth into the captions.
  - **Total enlargement** (the cover-fit `k` × any zoom, against the conformed file's source pixels) stays ≤2.0×; from a 720p source, jump zoom to 1.1–1.12 and punch in only on segments at 1.0 (main skill, Step 7).
- **Shake** on an impact (Gen Z, trailer): deterministic, a sum of sines decaying over 4–8 frames, e.g. `x = 18 * Math.sin(t * 91) * Math.exp(-(frame - f) / 3)`, applied to `plate.position`. No randomness.
- **B-roll:** a second `createFootage` on its own plate (z 0.5) whose `visible` toggles on its frames, or a still on a `TextureLoader(ctx.manager)` texture with a slow push. Conform b-roll the same way (VP9, `-g 15`).
- **Speed ramps:** do them in the conform (stepped `setpts` segments, see `ffmpeg-recipes.md` §8), not by remapping time in the scene: a scene time-remap seeks backwards and forwards across GOPs and gets slow.
- **Name** the plate and every caption mesh, so the user's clicks in the editor resolve.

## Other engines

- **HyperFrames:** `<video id="edit" src="assets/edit.webm" muted playsinline data-start="0" data-duration="12.4" data-media-start="41.5">` inside the scene's sub-composition, timing on the video or on its wrapper, never both; never call `play()` or seek it yourself, and never set `crossorigin` on it. The dialogue is a separate `<audio>` element. Its renderer extracts frames with ffmpeg, but preview runs in the browser, so VP9 is still the safe conform.
- **React:** `import { Video } from "@genmotion/motion"`, then `<Video src={editUrl} startFrom={41.5} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />`. It seeks to the middle of each frame and awaits it in render mode.

## Troubleshooting

| Symptom in a frame capture | Cause | Fix |
|---|---|---|
| Plate black, graphics fine | codec the browser cannot decode (H.264/HEVC/ProRes) | conform to VP9 WebM |
| Footage one or two frames behind the audio | seek not registered with `ctx.manager` | use the helper |
| First frame of a render chunk shows source frame 0 | seek issued after the load was released | seek inside `loadeddata`, before `itemEnd` |
| Last frame repeats the previous one | no tail handle | `tpad=stop_mode=clone:stop_duration=0.5` in the conform |
| `validate` error naming `document.` | global DOM access | `ctx.canvas.ownerDocument.createElement("video")` |
| Render crawls | long GOP, 4K source, or many plates | `-g 15`, conform at ≤1920 on the long edge, one footage plate visible at a time |
| Soft picture after a punch-in | total enlargement of source pixels past 1.3× (smeared past 2×) | keep the total ≤2.0×, sharpen mildly in the conform (`unsharp=5:5:0.6`) above 1.3×, or conform from 4K at 2× and scale the plate down; low-res sources: `ffmpeg-recipes.md` §6 layouts |
