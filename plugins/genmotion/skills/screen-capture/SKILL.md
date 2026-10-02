---
name: screen-capture
description: "Getting real app footage into a video safely: what to ask the user to record, probing a file, the seek-safe master (VP9 WebM at the project fps with a keyframe every 15 frames, because the renderer seeks every frame and the CLI cannot decode H.264), verified ffmpeg recipes for frame-accurate trims, 9:16 and 4:5 crops that output 1080x1920 and 1080x1350, speeding up a dead stretch, blurring private data and pulling stills, then full-bleed versus a device frame built in the scene, and rebuilding a UI when there is no recording. Load it whenever a video shows software working."
---

# Screen capture

For software, the interface is the footage. This is how a recording gets into a video, survives the crop to vertical, and renders exactly the same frame every time.

All commands were run on ffmpeg 6.1 against a synthetic recording. They assume a 30 fps project: replace `30` with the project's fps. Every output goes into `assets/`.

## When to use

- A video has to show real software working: `ugc-screen-demo`, `demo-walkthrough`, `announce-feature`, `app-store-preview`, a launch film's product shot.
- The user has a recording to bring in, or asks how to record a good one.
- Any user video clip (a presenter take, a phone clip) that a scene will play: the seek-safe master below applies to all of them.

Cutting a long recording or camera footage into a story (a tutorial, a talking head) is `video-editing`; this skill prepares the clips.

## What to ask the user to record

Most of the quality is decided before anything is edited. Ask for:

- **One continuous take of one task**, not a tour. Do it twice; keep the cleaner one.
- **A slow, deliberate cursor**: pause before each click, move decisively after. A fast, jittery cursor is unreadable at phone size (and may be replaced by a synthetic one).
- **Notifications off, a clean demo account**: a banner mid-take costs the take; a real name, email or customer in the UI is a privacy problem in an ad.
- **Zoomed in**: browser at 125–150%, or the window sized to about 1280×800, on a HiDPI (Retina) display so the file is 2× (a 2560×1600 window). Interface text comfortable on a desktop is illegible at 1080 wide on a phone.
- **A window, not the full screen**: a full desktop is mostly chrome once cropped to vertical.
- **60 fps if the UI animates**: a 30 fps capture of a 60 fps transition stutters.

Bring it in with `save-asset` (copies into `assets/`; never reference a recording by a remote URL).

## 1. Probe what you have

```
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,avg_frame_rate,codec_name,pix_fmt:format=duration -of default=noprint_wrappers=1 assets/raw.mov
```

- `r_frame_rate` ≠ `avg_frame_rate` means variable frame rate (most phone and many desktop recorders). It must be conformed or audio and picture drift.
- Count the keyframes against the packets (works for MP4, MOV and WebM):

```
ffprobe -v error -select_streams v:0 -show_entries packet=flags -of csv=p=0 assets/raw.mov | grep -c K
```

Recorders often write one keyframe every 2–10 s: fine for a player, wrong for a renderer that seeks every frame. Step 2 fixes it.

## 2. The seek-safe master (always do this)

Every clip a scene plays is encoded once, at the end of its filter chain, to the house master format:

- **VP9 in WebM.** The CLI renders in headless Chromium, which cannot decode H.264 or AAC: an `.mp4` renders as a black plate while the render still reports success (`video-editing` measured this). VP9 decodes on every engine and surface.
- **Constant frame rate at the project fps** (`fps=30`), so frame N of the scene is frame N of the clip.
- **A keyframe every 15 frames** (`-g 15 -keyint_min 15`). The renderer seeks every frame; from a distant keyframe a seek is slow and can resolve late, which shows the previous image (a freeze or stutter in the export). `video-editing` measured a 15-frame GOP exact on every frame; all-intra (`-g 1`) is also exact but about 2.4× larger.
- **A 0.5 s tail handle** (`tpad`), so the scene's last frame never asks for a frame past the end.
- **No audio** (`-an`): recording audio carries room noise and clicks that fight the VO; sound is authored on the timeline (`sfx`, `sound-design`).

The template (trim with `-ss`/`-t` **before** `-i`; `FILTERS` is whatever chain you need from step 3–5, or nothing):

```
ffmpeg -ss 14.0 -t 6 -i assets/raw.mov -vf "fps=30,FILTERS,format=yuv420p,tpad=stop_mode=clone:stop_duration=0.5" -c:v libvpx-vp9 -b:v 0 -crf 24 -g 15 -keyint_min 15 -row-mt 1 -deadline good -cpu-used 4 -an assets/demo.webm
```

- A trim with a re-encode is frame-accurate. Never cut a final edit with `-c copy`: stream copy can only start on a keyframe, so the cut snaps to the previous one (a frozen or wrong first frame).
- `-crf 24` keeps UI text edges clean; 28–30 is enough for camera footage.
- Chain every operation into **one** encode where you can. If you must make an intermediate, make it lossless-ish and delete it after (`-c:v libx264 -crf 10 -g 1`, never placed in a scene).
- With no crop, add `scale=trunc(iw/2)*2:trunc(ih/2)*2` to the chain so the dimensions are even.

Verify with `ffprobe`: `codec_name=vp9`; `r_frame_rate` and `avg_frame_rate` both the project fps; and one keyframe per 15 packets:

```
ffprobe -v error -select_streams v:0 -show_entries packet=flags -of csv=p=0 assets/demo.webm | grep -c K
```

## 3. Crop to the canvas

**9:16 (1080×1920)**: a 9:16 column the full height of the source, centred on the region that matters (`CX` = its x-centre in source pixels), clamped to the frame, then scaled. As `FILTERS`:

```
crop=w=trunc(ih*9/16/2)*2:h=ih:x='min(max(CX-ih*9/32,0),iw-ih*9/16)':y=0,scale=1080:1920:flags=lanczos,setsar=1
```

A 1920×1080 source gives a 606×1080 column, scaled 1.78× up: soft. A 2560×1600 HiDPI source gives 900×1600, scaled 1.2×: fine. That is why the recording should be 2×.

**4:5 (1080×1350)**: `crop=w=trunc(ih*4/5/2)*2:h=ih:x='min(max(CX-ih*2/5,0),iw-ih*4/5)':y=0,scale=1080:1350:flags=lanczos,setsar=1`

**Keep it wide** and let the scene frame it (a device frame, or a camera that pans and pushes across a wide plane): `scale=1080:-2`. Never letterbox a 16:9 recording into 9:16 with bars.

Crop in `ffmpeg` rather than on the canvas when you can, so focus pushes start from a clean 1.0.

## 4. Speed up a dead stretch

A file import or a load is dead air. The whole clip at 2.5× (as `FILTERS`): `setpts=0.4*PTS,fps=30`.

Only 2.0–5.0 s at 4×, the rest at 1×, as one encode:

```
ffmpeg -t 8 -i assets/raw.mov -filter_complex "[0:v]fps=30,split=3[s0][s1][s2];[s0]trim=0:2,setpts=PTS-STARTPTS[a];[s1]trim=2:5,setpts=(PTS-STARTPTS)/4[b];[s2]trim=5,setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0,fps=30,format=yuv420p,tpad=stop_mode=clone:stop_duration=0.5[v]" -map "[v]" -c:v libvpx-vp9 -b:v 0 -crf 24 -g 15 -keyint_min 15 -row-mt 1 -deadline good -cpu-used 4 -an assets/demo-ramp.webm
```

If the time compression changes what a viewer would believe (a process looks faster than it is), show it: a visible cut or a "4×" badge.

## 5. Blur private data

Name, email, avatar, customer data, tokens, internal URLs: scrub them before anything else. A box over a region (w:h:x:y in source pixels), as one encode:

```
ffmpeg -t 6 -i assets/raw.mov -filter_complex "[0:v]fps=30,split[base][tmp];[tmp]crop=600:120:1200:40,boxblur=20:2[blur];[base][blur]overlay=1200:40,format=yuv420p,tpad=stop_mode=clone:stop_duration=0.5[v]" -map "[v]" -c:v libvpx-vp9 -b:v 0 -crf 24 -g 15 -keyint_min 15 -row-mt 1 -deadline good -cpu-used 4 -an assets/demo-scrubbed.webm
```

The blur radius stays under half the box's smaller side. If the private text moves, re-crop instead, or rebuild that panel in the scene.

## 6. Pull a still

For a poster, a plate to animate, or a frame to rebuild from: `ffmpeg -ss 3 -i assets/raw.mov -frames:v 1 assets/demo-still.png`.

A contact sheet to choose the moment: `ffmpeg -i assets/raw.mov -vf "fps=1,scale=320:-2,tile=6x2" -frames:v 1 assets/demo-sheet.png` (delete it after; it is not part of the video).

## In the scene

The clip plays silently, seeked by the renderer every frame; its sound, if any, is separate audio on the timeline.

- **Full-bleed** (default for ads): the crop fills the frame, captions over it. Use it whenever the UI is legible at that crop.
- **Device frame**: when a whole phone screen is the subject, or the brief wants "a product shot". Build the frame in the scene around the clip, never as an image with a hole in it: on Three.js a rounded-rect plane for the screen (the video texture), a slightly larger rounded-rect plane behind it for the bezel (#0B0B0D, 2–3% of the screen width), a soft blurred dark plane for the shadow (24 px, 25%), and a notch or browser bar as its own small plane. On HyperFrames or React, the same as elements around the `<video>`.
- **Three.js**: the clip is a video texture on a plane sized from its real pixels, seeked every frame and never played (`three-assets`). Register each seek with the scene's loading manager (`ctx.manager`) and release it on the video's `seeked` event: the export's frame barrier waits only on that manager, and a seek it does not know about lands a frame or two late (`video-editing` has the tested helper). Turn on mipmaps for a clip shown smaller than its pixels so text does not shimmer. Focus pushes and pans are camera moves (`three-camera`).
- **Focus pushes, cursor, reading times**: `ugc-craft` (the focus push) and `ugc-screen-demo` (cursor choreography, UI reading times).

## When there is no recording

Rebuild the UI in the scene. Often better than a capture, always better than a blurry one: resolution is yours, so nothing is illegible; timing is yours, so the click lands on the beat; there is no private data; and it is seek-safe by construction.

- Rebuild only what is on screen, magnified 2–2.5× so body text lands at ≥34 px at 1080 wide.
- On Three.js each panel is a plane with a canvas texture drawn at 2× (fonts loaded before drawing; `three-type` for text planes); state changes redraw or swap a texture on a given frame. On HyperFrames or React, real layout.
- Fonts, colours and the logo come from the real product: find them with `web-research`, fetch files with `save-asset`, keep them in one `components/look.ts` (Three.js) or shared tokens. Never guess a brand colour; ask.
- Placeholder avatars and thumbnails: `generate-image`; never a real person's photo.

**Say so if it is not the real product.** A faithful rebuild is fine. A rebuilt UI showing a feature that does not exist is a false claim (`ugc-ad-foundations` → Claims).

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The recording | `save-asset` on the user's file | Rebuild the UI in the scene |
| Probe, trim, re-encode, crop, speed, scrub | `ffmpeg` (with `ffprobe`) | None for an `.mp4` (it renders black in the CLI); ask the user for a WebM export, or rebuild the UI |
| Placeholder content | `generate-image` | Flat shapes and initials |
| Brand fonts, colours, logo | `web-research`, `save-asset` | Ask the user |
| Looking at the result | `capture-frames` | None |

## Checks before you finish

1. Every clip a scene plays is VP9 WebM, reads the project fps as both `r_frame_rate` and `avg_frame_rate`, has a keyframe every 15 frames, and is 0.5 s longer than the span the scene uses.
2. Cropped clips are exactly 1080×1920 (9:16) or 1080×1350 (4:5) with `sample_aspect_ratio=1:1`.
3. `capture-frames` on 5 consecutive frames across one fast UI movement in the render: each frame differs (no freeze), none repeats the previous image.
4. `capture-frames` on the busiest UI frame: the smallest text that matters is ≥34 px at 1080 wide.
5. No real name, email, avatar, customer or token is visible anywhere in any clip.
6. No recording audio was left on a clip (`-an`), every file used is under `assets/`, and no intermediate file is placed in a scene.
7. `validate` passes.
