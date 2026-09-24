---
name: screen-capture
description: "Getting real app footage into a composition: what a usable capture looks like, the ffmpeg recipes for trimming, cropping, reframing to vertical, speeding up and extracting frames, how to build a device frame in HTML, and how to rebuild a UI from scratch when there is no recording at all. Load it alongside ugc-screen-demo, announce-feature or demo-walkthrough whenever the video has to show software actually working."
---

# Screen capture

For software, the interface is the footage. This is how it gets into the composition and survives the crop to vertical.

## When to use

Load this whenever an ad or announcement has to show a real product working: `ugc-screen-demo`, `announce-feature`, `demo-walkthrough`, `app-store-preview`, and any launch cut that includes a product shot.

## What a usable capture looks like

Most of the work is telling the user what to record, before anything is edited. Ask for this specifically:

- **One continuous take of one task.** Not a tour. The cut comes later.
- **A slow, deliberate cursor.** The cursor is the actor. It should hesitate before a click and move decisively after. A fast, jittery cursor is unreadable at phone size.
- **Notifications off, clean profile.** A banner sliding in mid-take costs the whole take, and a real name or email in the UI is a privacy problem in an ad.
- **Zoomed in.** Browser at 125 to 150 percent, or the app window sized down. Interface text that is comfortable on a desktop is illegible at 1080 wide on a phone.
- **60fps if the UI animates.** A 30fps capture of a 60fps transition stutters in a way people notice without knowing why.
- **A window, not a full screen.** A full desktop capture is 90 percent chrome once it is cropped to vertical.

Bring it in with `save_asset`, which copies it into `assets/`. Never reference a recording by a remote URL.

## ffmpeg recipes

`ffmpeg` is on the shell PATH (this app's own build). Write every output into `assets/`.

**Trim to the part that matters.** Seek before the input for a fast, keyframe-accurate cut:

```
ffmpeg -ss 00:00:14 -i assets/raw.mp4 -t 6 -c copy assets/demo-trim.mp4
```

Drop `-c copy` and let it re-encode when the cut has to land exactly on a frame rather than a keyframe.

**Crop a desktop recording to vertical.** Take a 1080-wide column out of the middle of a 1920-wide capture, then scale to the canvas:

```
ffmpeg -i assets/demo-trim.mp4 -vf "crop=1080:1080:420:0,scale=1080:1080" -an assets/demo-square.mp4
```

The third and fourth crop arguments are x and y. Move x to follow the part of the UI that matters rather than defaulting to the centre.

**Scale a wide capture into a vertical frame with headroom above and below:**

```
ffmpeg -i assets/demo-trim.mp4 -vf "scale=1080:-2" -an assets/demo-wide.mp4
```

Then place it in the composition against a coloured field, with the headline above it.

**Speed up a slow stretch.** A file-import or a load is dead air; take it out rather than cutting around it:

```
ffmpeg -i assets/demo-trim.mp4 -vf "setpts=0.4*PTS" -an assets/demo-fast.mp4
```

Strip the audio with `-an` on anything that becomes b-roll. Screen recordings carry room tone that fights the narration, and the sound design is authored separately with `generate_sfx`.

**Pull a still, for a poster frame or a plate to animate:**

```
ffmpeg -ss 00:00:03 -i assets/demo-trim.mp4 -frames:v 1 assets/demo-still.png
```

**Check what you actually have** before writing any of the above:

```
ffprobe -v error -show_entries stream=width,height,r_frame_rate,duration -of default=noprint_wrappers=1 assets/raw.mp4
```

## In the composition

The video plays silently, with the framework owning its playback; its sound, if any, comes from a separate audio track. Read your project's own composition contract before placing the clip.

Two patterns carry almost every screen demo:

**Full-bleed.** The capture fills the frame, cropped to the region that matters, with captions over it. Highest impact, no chrome to waste pixels on. Use it when the UI is legible at that crop.

**Device frame.** The capture sits inside a phone or browser shell built in HTML: a rounded rect, a 1 to 2px border, a soft shadow, and a title bar with a URL or a notch. Use it when the thing being shown is a whole screen rather than one region, or when the brief wants it to read as a product shot. Build the frame as markup around the clip, never as an image with a hole in it.

Punch in on the moment of value: animate the clip's wrapper, not the timed clip itself. A 10 to 15 percent push over a second, landing exactly as the thing being demonstrated resolves.

## When there is no recording

Rebuild the UI in HTML. This is often better than a real capture, and it is always better than a blurry one:

- You control the resolution, so nothing is illegible.
- You control the timing, so the click lands on the beat.
- There is no private data to scrub.
- It is seek-safe by construction, where a video clip is not.

Rebuild only what is on screen. Placeholder content goes through `generate_image` for avatars and thumbnails. Fonts and colours come from the real product: research them with `WebSearch` and `WebFetch`, pull the logo with `save_asset`, and put the tokens in CSS custom properties at the top of the composition.

**Say so if it is not the real product.** A rebuilt UI that is a faithful reproduction is fine. A rebuilt UI showing a feature that does not exist is a false claim.

## The prequel route

If the user has the Prequel app installed, it records the screen and hands back an auto-edited file directly. Ask before assuming: it is the shortest path from "I need a demo" to a usable clip, and it produces a cleaner take than most people record by hand.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The recording | `save_asset` on the user's own file | Rebuild the UI in HTML. Usually better anyway. |
| Trim, crop, reframe, speed | `ffmpeg`, on the shell PATH | CSS crop on the clip's wrapper, and cut around the dead air instead of speeding it up. |
| Placeholder content in a rebuilt UI | `generate_image` | Flat shapes and initials. Never a real person's photo. |
| Brand colours, fonts and logo | `WebSearch`, `WebFetch`, `save_asset` | Ask the user. Never guess a brand colour. |
| Punch-ins | Your project's own motion or keyframe authoring guidance | Hard cuts between two crops of the same capture. |

## Checks before you finish

1. `capture_frames` on the busiest UI frame. Read the smallest text on screen at arm's length. If you cannot, crop tighter or rebuild it.
2. Check for a real name, email, avatar or company in the capture. Scrub or re-crop.
3. Every click has a sound and a visible state change. A silent click reads as a mockup.
4. `capture_frames` at the start and end of any punch-in. Nothing important leaves the frame.
5. The clip plays silently under the framework's own playback control, and its file is under `assets/`.
6. This project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).
