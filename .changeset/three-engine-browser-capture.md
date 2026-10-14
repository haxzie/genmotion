---
"@genmotion/three-engine": minor
---

`mountThreeRenderHost` gains two options for hosts whose frames are composited
by the caller rather than screenshotted from outside the page.

- `pixelRatio` overrides the display's own for the drawing buffer. The default
  supersamples at the device pixel ratio because the desktop export lets ffmpeg
  scale back down; a caller that blits each frame into its own canvas has
  nothing downstream to spend that on and is paying for four times the shading.
- `readback: "drawing-buffer"` skips the compositor barrier. The default waits
  two animation frames so an outside capture sees the frame, but
  `requestAnimationFrame` stops firing the moment the window is occluded, so an
  in-browser export that waits on it does not run slowly, it stops dead.

Capture mode also no longer re-draws every frame unconditionally. The second
draw exists in case an asset settled during the readiness wait; it now happens
only when something was actually in flight, which on a scene whose textures are
all canvases is never, and it was half the GPU cost of the capture.
