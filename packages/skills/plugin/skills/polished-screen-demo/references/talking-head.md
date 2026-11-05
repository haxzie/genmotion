# The talking head

A presenter in the corner, lip-synced to the narration. Optional, and worth it only when the demo is being sold rather than explained: a face raises the production ceiling and the failure floor at the same time.

Order matters. The voice exists first, the face is matched to it, and the clip is placed last.

## 1. The voiceover, once

Record the whole narration as one continuous take with `voiceover`, before any face exists. Lip-sync is a function of the audio, so re-recording the voice means re-syncing the face; getting the script signed off first is what keeps this to one pass.

Keep the file in `assets/` and note its exact duration. The lip-sync clip has to match it frame for frame.

## 2. A presenter still

Either:

- **A real person**, with their permission, from a photo the user supplies through `save-asset`. Always the better result.
- **A generated presenter**, when there is nobody to film. Through the fal connector, a current image model (Flux and similar) gives a clean head-and-shoulders still.

What the still needs, because the lip-sync model is working from it:

- Head and shoulders, face square to camera, eyes to lens.
- Mouth closed or barely open. An open-mouthed still gives a strange first frame.
- Even, flat light. Hard shadows across the mouth confuse the sync.
- A plain background, so the corner inset can be masked or feathered.
- At least 1024px on the short side.

**Never generate a face for a real named person**, and never put a generated face in a testimonial or anything that reads as a customer. A synthetic presenter presenting a product is fine; a synthetic customer praising it is not.

## 3. Lip-sync through fal

The `fal` connector carries MiniMax's lip-sync model. If it is not connected, say so once and offer it with `recommend-integration`, then carry on without the head rather than stalling the whole video.

Hand it the presenter still and the voiceover file, and it returns a clip of the face speaking that audio. Then:

- Bring the result into the project with `save-asset`. Never reference the hosted URL from a scene: the link expires and the finished video gets a hole in it.
- Check the duration against the voiceover before building anything around it. If the clip came back short, the sync is wrong and the rest of the edit will be built on it.
- Watch it once at full size. Lip-sync fails in a specific way: the mouth keeps moving through a pause, or the face holds still through a word. Both are obvious on the first viewing and invisible in a thumbnail.

Generated video costs the user money. Say what you are about to generate and what it costs before the first call, and wait.

## 4. Placing it

- A corner inset, usually bottom-left, 20 to 26% of the frame width, with a soft rounded mask and a shadow. Big enough to read an expression, small enough that the interface is still the subject.
- Keep it on the **opposite** corner to the step captions.
- The inset is a layer above the window, below the cursor. A presenter drawn over the pointer looks like a sticker.
- **Mute the clip's own audio** and keep the original voiceover on the timeline. The lip-sync render re-encodes the audio, and two copies of the same narration a frame apart is a flam that everyone hears and nobody can place.
- It does not have to be present the whole film. Bringing the presenter in for the opening line and the closing one, and dropping them for the middle where the work happens, is usually the better cut.

## When to skip it

- A tutorial. Nobody needs a face to follow a form being filled in.
- A film under about 20 seconds. There is no room for a presenter to arrive and leave.
- No signed-off script. A face is the most expensive thing to re-render when the words change.
