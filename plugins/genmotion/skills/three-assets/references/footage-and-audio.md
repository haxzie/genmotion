# Footage, fonts and audio

User footage on a plane, seeked from the frame and waited for by the frame barrier; the font files type needs; and why sound never lives in a scene. The footage recipe was built and debugged by rendering: the obvious version (a `VideoTexture`, or a `<video>` uploaded straight to WebGL) captures **black** in the headless renderer, and H.264 MP4 does not decode there at all.

Contents: 1 Prepare the file · 2 `footage()` · 3 Using it · 4 Continuity across a cut · 5 Fonts · 6 Audio

## 1. Prepare the file

The CLI's headless Chromium has no H.264 decoder, so an `.mp4` plays as nothing there. Transcode recordings to VP9 WebM with dense keyframes (fast, exact seeks), trimmed to the moment that matters, with `ffmpeg`:

```
ffmpeg -ss 12.0 -t 6.0 -i input.mov -an -c:v libvpx-vp9 -b:v 4M -g 15 -row-mt 1 -vf "scale=1920:-2,fps=30" assets/demo.webm
```

- `-an`: the picture file carries no sound; the audio, if wanted, is extracted separately and placed on the timeline.
- `-g 15`: a keyframe every 15 frames, so each seek decodes at most 14 frames.
- Match the project fps (`fps=30`) so every composition frame maps to one video frame.
- Note the output's pixel size for `footage({ size })`.

## 2. `footage()`

```ts
/**
 * User footage as a texture that is SEEKED from the frame, never played.
 * Every seek is registered on ctx.manager, so a capture waits for the decoded frame
 * ("seeked") before it reads pixels. The frame is copied through a 2D canvas: uploading
 * a <video> straight to WebGL comes out black in the headless renderer.
 * `size` is the canvas the frame is drawn into (the file's pixel size, or smaller).
 */
export function footage(
  ctx: ThreeSceneContext,
  url: string,
  opts: { from?: number; size?: [number, number] } = {},
) {
  const from = opts.from ?? 0; // seconds into the file where this scene's clip starts
  const [cw, ch] = opts.size ?? [1920, 1080];
  const el = ctx.canvas.ownerDocument.createElement("video");
  el.muted = true; // sound goes on the timeline, never in the scene
  el.playsInline = true;
  el.preload = "auto";
  el.crossOrigin = "anonymous";

  const canvas = new OffscreenCanvas(cw, ch);
  const g = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  const grab = () => {
    g.drawImage(el, 0, 0, cw, ch);
    tex.needsUpdate = true;
  };

  const key = `video:${url}`;
  let busy = true; // the initial load counts as in flight
  let pending: number | null = null;
  const done = () => {
    if (!busy) return;
    busy = false;
    ctx.manager.itemEnd(key);
  };
  const go = (t: number) => {
    if (Math.abs(el.currentTime - t) < 1e-3) return;
    if (!busy) {
      busy = true;
      ctx.manager.itemStart(key);
    }
    el.currentTime = t;
  };
  ctx.manager.itemStart(key);
  el.addEventListener("loadeddata", () => {
    grab();
    const t = pending;
    pending = null;
    if (t !== null && Math.abs(el.currentTime - t) >= 1e-3) el.currentTime = t; // the load's slot passes to this seek
    else done();
  });
  el.addEventListener("seeked", () => {
    grab();
    done();
  });
  el.addEventListener("error", done); // a broken file must not hang the export
  el.src = url;

  return {
    texture: tex,
    el,
    /** Show the frame at `time` seconds into this scene; holds the last frame past the end. */
    seek(time: number) {
      const end = Number.isFinite(el.duration) ? el.duration - 0.02 : Infinity;
      // a quarter frame in: container timestamps are rounded (WebM to 1 ms), and a seek
      // that lands exactly on a frame boundary can show the previous frame
      const t = Math.min(Math.max(0, from + time + 0.25 / ctx.fps), end);
      if (el.readyState < 2) pending = t;
      else go(t);
    },
  };
}
```

Why it is built this way:

- **Seeked, never played**: `play()` runs on the wall clock and the export would not match the preview.
- **Each seek is an item on `ctx.manager`**: `itemStart` when the seek begins, `itemEnd` on `seeked`; the host's barrier waits for it and draws again before the frame is captured.
- **Copied through a 2D canvas** on `loadeddata` and `seeked`: a `<video>` uploaded straight to WebGL captures black in the headless renderer; the canvas copy works everywhere.
- **A quarter-frame offset**: WebM timestamps are rounded to 1 ms, and a seek exactly on a frame boundary can land on the previous frame.
- **Errors end the item**: a broken file must never hang an export.
- `ctx.canvas.ownerDocument` creates the element: scene code may not touch the page's globals directly, and validation rejects it.

## 3. Using it

```ts
import demoUrl from "../assets/demo.webm";
const clip = footage(ctx, demoUrl, { from: 2.0, size: [1920, 1080] });  // starts 2 s into the file
const screen = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 9),                                       // 1600 x 900 px at z = 0
  new THREE.MeshBasicMaterial({ map: clip.texture, toneMapped: false }),
);
screen.name = "demo-recording";
// frame
clip.seek(time);   // once per frame; time is this scene's seconds
```

- Call `seek` once per frame, outside any sub-frame loop: a seek is asynchronous, so footage cannot sit inside a motion-blurred scene (`three-transitions`).
- Speed changes are a function of time: `clip.seek(time * 2)` is 2× (motion stays smooth only if the source has the frames); a freeze is a constant.
- Picture-in-picture, rounded corners and a scrim behind captions are planes around the screen; the footage itself stays untouched.

## 4. Continuity across a cut

A clip that continues across a cut uses one source with offsets that agree: in scene N `from = X − D_N / fps`, in scene N+1 `from = X`, so the last frame of N shows source time `X − 1/fps` and the first of N+1 shows `X`: consecutive frames. Tested with a match-push into the screen and a cut to the full-frame clip.

## 5. Fonts

Type needs its font file in the project; the capture machine has almost none installed. `save-asset` the brand's woff2 (or Inter's variable woff2) into `assets/` and load it with the type kit's `withFonts()` (`three-type`), which registers the load on `ctx.manager` and builds the scene only once the face is there.

## 6. Audio

Audio never lives in a scene: a scene's `<audio>` or Web Audio is silent in the export and drifts in the preview. Music, voiceover and effects are files in `assets/` placed on the timeline with `place-audio` (lane, start frame, duration, volume, fades in `project.json`'s `audio`). Levels, fades, ducking and loudness are `sound-design`'s (a music bed under VO sits at 0.14–0.28, default 0.18 ≈ −15 dB). Footage that has its own sound: extract it (`ffmpeg -i in.mov -vn -c:a aac -b:a 192k assets/demo-audio.m4a`), place it at the same start frame and offset as the picture, and keep the picture file silent.
