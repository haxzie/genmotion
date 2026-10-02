# Store preview specs

Read this before setting the project's size and before exporting. Values were checked against Apple's App Preview specifications and guidelines and Google Play's preview video rules in October 2026. Stores change these; re-check with `web-research` (Apple: "App preview specifications" in App Store Connect Help, and the App Previews page on developer.apple.com; Google: "Add preview assets to showcase your app" in Play Console Help) before a submission, and tell the user the date you checked.

## Apple App Store: app previews

### File

| Item | Value |
| --- | --- |
| Length | **15–30 s** |
| Previews | Up to **3 per locale**, per device size class |
| File size | ≤500 MB |
| Frame rate | **≤30 fps** |
| Video | H.264, progressive, up to High Profile Level 4.0, target 10–12 Mbps (.mov, .m4v, .mp4); or ProRes 422 HQ (.mov) |
| Audio | Stereo, 256 kbps AAC (H.264) or PCM / AAC (ProRes), 44.1 or 48 kHz, every track enabled. Include a stereo track even when silent |
| Poster frame | Defaults to the frame at **5 s**; can be changed in App Store Connect. Shown when autoplay is off |
| Playback | Autoplays **muted** in the listing |

### Accepted resolutions (portrait / landscape)

| Device class | Resolution |
| --- | --- |
| iPhone 6.1"–6.9" (all current models, 19.5:9) | **886 × 1920** / 1920 × 886 |
| iPhone 5.5" and 4" (16:9) | 1080 × 1920 / 1920 × 1080 |
| iPhone 4.7" (16:9) | 750 × 1334 / 1334 × 750 |
| iPad 13", 11", 10.5" (4:3) | **1200 × 1600** / 1600 × 1200 |
| iPad 9.7" and 12.9" 2nd gen | 900 × 1200 / 1200 × 900 |
| Mac, Apple TV | 1920 × 1080, landscape only |
| Apple Vision Pro | 3840 × 2160, landscape only |

### Content rules (paraphrased from Apple's guidelines)

- Show the app's own features, functionality and UI, captured from the app. Footage outside the app is not allowed.
- **No hands, fingers or people holding the device**, no over-the-shoulder shots. Touch hotspots (a drawn ring where a tap happens) are allowed.
- Capture the native UI rather than zooming into the view.
- Simple transitions (cuts, dissolves, fades) and text overlays are fine; text must be legible and on screen long enough to read.
- No prices, no seasonal or dated references ("new for spring", a year).
- Disclose in-app purchases or subscriptions if the footage shows them (in the footage or the end frame).
- Only content you have the rights to (music, images, fonts).
- Games: more gameplay than cutscenes.
- Device frames are **not required**; the store presents the video itself.

## Google Play: preview (promo) video

| Item | Value |
| --- | --- |
| Delivery | A **YouTube URL** (a single video, not a playlist or channel) added in Play Console under the store listing |
| YouTube settings | Public or unlisted, **embeddable**, **not age-restricted**, **ads / monetisation off** |
| Orientation | Landscape or portrait |
| Length | No hard maximum; only the **first 30 s** may autoplay, **muted**, depending on device, surface and network. Keep it 15–30 s, or put the whole story in the first 30 s |
| Display | Over the 1024 × 500 feature graphic, with a play button when it does not autoplay |
| Content | Represent the real app; practitioners aim for the app on screen within the first few seconds and the large majority of runtime real in-app footage |

## Export settings

Render at the exact accepted size and 30 fps (set `width`, `height` and `fps` in `project.json`), then make the delivery file:

```
ffmpeg -i export.mp4 -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -r 30 -b:v 11M -maxrate 12M -bufsize 24M -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart preview-iphone.mp4
```

No audio in the export? Add a silent stereo track so the file has one:

```
ffmpeg -i export.mp4 -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 -shortest -c:v copy -c:a aac -b:a 256k preview-iphone.mp4
```

A master made at 1080 × 1920 with all content inside the central 886 px can be cut to the iPhone size with `-vf crop=886:1920` before encoding; a separate iPad layout (4:3) is a re-layout, not a crop.

Verify with `ffprobe -v error -show_entries stream=codec_name,profile,level,width,height,r_frame_rate,channels,sample_rate -show_entries format=duration,size preview-iphone.mp4`.
