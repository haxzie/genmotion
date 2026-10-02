---
name: video-editing
description: "Editing footage the user supplies into a finished video: a podcast episode or clips from it, a talking-head video for YouTube, Shorts, TikTok, Reels or LinkedIn, a trailer or teaser cut from existing shots, a founder-and-product launch cut, or a fast Gen Z social edit. ffmpeg does the editorial (probe, transcript, paper edit, cut list, reframe, audio cleanup, conform), the project layers captions, titles, b-roll, zooms and the end card on top, and every cut, caption and loudness figure is measured before delivery."
---

# Video editing: the user's own footage

The user brings footage; you bring the editor's judgement. The work splits in two on purpose: **ffmpeg does the editorial** (what is kept, in what order, at what size, sounding how) and produces one conformed picture file plus one clean dialogue file; **the project does the motion layer** (captions, titles, lower thirds, b-roll, punch-ins, transitions, end card) on top of it. Then you render and measure. Every number below is at 30 fps unless it says otherwise.

## When to use

- The user supplies camera footage or a recorded conversation and wants it edited: "edit my podcast into clips", "cut a trailer from this footage", "turn my talking head video into a TikTok", "remove the ums", "add captions to my clip", "make Shorts from my long video".
- Formats owned here, each with a reference file: podcast episode and clips, talking head (YouTube long-form, Shorts/Reels/TikTok, LinkedIn, course/tutorial, green-screen reaction), trailer or teaser, launch cut from founder and product footage, Gen Z / TikTok-native edit.

Not this skill:

- **Only a screen recording** and the video is an ad, a store preview or a product tour: `ugc-screen-demo`, `app-store-preview` or `demo-walkthrough` own it. Tie-breaker: if a person on camera (or a podcast/voice track the user recorded) carries the video, it is yours, and you load `screen-capture` for the screen parts; if the screen carries it and narration is generated, it is theirs.
- **No footage at all** (a launch film from screenshots, an explainer from a brief): the router's other owners. Generated presenters belong to `ai-presenter`.
- A UGC ad *concept* to be shot or generated: the `ugc-*` owners. If the creator's footage already exists and needs cutting, it is yours; borrow hooks from `ugc-hooks` and run `ad-qa` at the end.

Read `direction` first (it decides proposition, audience, energy curve and sound on/off). This skill states only what editing changes.

## Ask first (only what the request and the files don't answer)

1. Where it will be posted (YouTube, TikTok/Reels/Shorts, LinkedIn, a podcast feed): this fixes aspect, length, captions and loudness.
2. Target length, or how many clips.
3. Style: clean and professional, or fast and TikTok-native.

If the user says "just do it", default from the table in Step 2 and say what you chose.

## The pipeline, and why it is shaped this way

```
footage ─► ffmpeg: probe ► proxy ► transcript/silence map ► paper edit ► cut list
                 ► reframe ► audio cleanup ► conform ─► assets/edit.webm + assets/edit-audio.wav
project:  scenes show edit.webm frame-accurately + captions, titles, b-roll, zooms, end card
timeline: edit-audio.wav (lane 0) + music bed (lane 1) + sfx (lanes 2–3) via `place-audio`
render ─► measure (frames at cuts, caption timing, loudness, duration) ─► deliver
```

Facts this rests on, measured on this product's renderer (read `references/footage-in-scene.md` before writing the first footage scene):

- **Conform every picture file to VP9 WebM** (`libvpx-vp9`, keyframe every 15 frames, project fps). The CLI renders with Playwright's open-source Chromium, which cannot decode H.264 or AAC: a phone's `.mp4` in a scene renders as a black plate while the render still reports success. The desktop app exports in Electron, whose Chromium normally does decode H.264, so the same file can look fine there and black from the CLI; VP9 renders the same on both.
- **Dense keyframes keep seeks exact and fast.** Measured on a 10 s 1080p clip: `-g 15` gave 300 of 300 frames exact; a 240-frame GOP gave 299 of 300 and was twice as slow; all-intra (`-g 1`) was exact but slower and about 2× the file size.
- **On Three.js, register every seek with `ctx.manager`.** The export's frame barrier waits only on the loading manager. A `<video>` seeked by setting `currentTime` alone exported 0 of 300 frames correctly (every frame 1–2 source frames late, frame 0 black). With the seek registered and released on `seeked`, 300 of 300 matched. The reference has the tested helper.
- **Give edit.webm a 0.5 s tail handle** (`tpad`), or the last frame of the scene shows the second-to-last source frame.
- **Footage is costly to render**: about 10–15 s of render per second of 1080p footage with 4 tabs on the default SwiftShader WebGL. A 45 s Short is roughly 10 minutes; a 20-minute episode is hours. For long-form, use the hybrid path in Step 10.
- Video in a scene is always muted. **Sound only exists on the timeline**: the edit's audio is a WAV on lane 0.

## Step 1: intake (probe everything, log it)

Copy every file into `assets/source/` with `save-asset` (never edit originals). For each file run the probe in `references/ffmpeg-recipes.md` §1 and log it in `VIDEO.md`:

```markdown
## Footage log
| File | Dur | Size | fps (r/avg) | Codec | Audio | Notes |
| cam-a.mp4 | 41:12 | 3840×2160 | 29.97/29.97 | hevc | 48k stereo | host, locked off, face x≈1310 |
| phone.mov | 0:58 | 1080×1920 | 30/28.4 VFR | h264 | 44.1k mono | rotate 90, conform CFR first |
```

- VFR (`r_frame_rate` ≠ `avg_frame_rate`) is converted to CFR at the project fps before anything else, or audio drifts.
- Make a 540p proxy with `-g 15` and a contact sheet (one tile per 10 s) and **look at it with your own eyes** before cutting. Never edit footage you have not seen.
- Separate audio recorders: find the offset (clap or cross-correlation, recipes §9) and write it in the log.

## Step 2: choose the format

Pick one row, then read its reference file. Numbers are defaults; the reference file explains when to break them.

| Format | Reference | Length | Visual change every | Gaps kept | Captions | Loudness |
|---|---|---|---|---|---|---|
| Podcast, full episode | `references/podcast.md` | as recorded, tightened | camera hold 4–10 s, wide every 30–90 s | pauses >0.7 s → 0.25–0.4 s | SRT sidecar | −16 LUFS, −1 dBTP |
| Podcast clips (9:16) | `references/podcast.md` | 30–60 s (≤90) | 2–4 s | ≤150 ms | burned, word-timed | −14 LUFS |
| YouTube talking head | `references/talking-head.md` | 8–15 min | jump cut 3–8 s, b-roll every 10–30 s | cut pauses >0.3–0.5 s | SRT sidecar | −14 LUFS |
| Shorts / Reels / TikTok | `references/talking-head.md` | 20–45 s (≤60) | 1–3 s | ≤100 ms | burned, 1–3 words | −14 LUFS |
| LinkedIn | `references/talking-head.md` | 30–90 s | 4–8 s | ≤200 ms | burned sentence case + SRT | −14 LUFS |
| Course / tutorial | `references/talking-head.md` | 3–10 min per lesson | follow the action, 5–20 s | never cut a step | SRT | −16 to −14 LUFS |
| Trailer / teaser | `references/trailer.md` | teaser 30–90 s, trailer 1:30–2:30 | ASL 3–5 s → under 1 s | designed silence | title cards | −14 LUFS |
| Launch cut | `references/launch-cut.md` | 60–120 s (crowdfunding 1:30–3:00) | 1–3 s on music, hero 3–6 s | ≤150 ms | burned on social cutdowns | −14 LUFS |
| Gen Z / TikTok-native | `references/genz.md` | 15–45 s | 0.7–2 s, interrupt every 2–4 s | ≤50–100 ms | burned, caps, 1–3 words | −14 LUFS |

Write the chosen row into `VIDEO.md` front matter (`skill: video-editing`, `format:`, `aspect:`, `length:`).

## Step 3: transcript or silence map

- With `transcribe`: extract 16 kHz mono (recipes §3), get **word-level** timestamps, and save them as `edit/words.json` (`[{ "w": "Nobody", "s": 12.41, "e": 12.66 }]`). Whisper drops "um/uh" unless prompted; the reference shows the prompt. Word times can be off by 100–300 ms, so pad cuts and snap to low-energy points.
- Without it: `silencedetect` gives a speech map (recipes §4). You can tighten pauses but not edit by meaning; ask the user for the lines that matter, and offer captions later.
- Find shots: scene detection and a contact sheet per shot change (recipes §2).

## Step 4: paper edit (decide the story in text first)

Read the whole transcript before choosing anything. Then write the selects into `VIDEO.md`:

```markdown
## Paper edit
| # | Src | In | Out | First … last words | Role | Note |
| 1 | cam-a | 00:12:04.20 | 00:12:19.80 | "Nobody tells you…" … "…that's the trap." | hook | cold open, pulled forward |
| 2 | cam-a | 00:03:10.00 | 00:03:41.50 | "So I'd raised…" … "…out of cash." | setup | [BROLL: bank statement] |
```

- **Shape before trim.** Hook → setup → turns → payoff → out. Reordering is allowed (pulling the punchline forward as a 2–4 s cold open is the classic move). Cut tangents and retakes; keep the last complete take, usually the best.
- **Murch's order decides every close call:** emotion > story > rhythm > eye-trace > screen direction > spatial continuity. Never cut a laugh, a reaction or the pause before a punchline to save time.
- **Ethics, non-negotiable:** never splice words or half-sentences into a statement the speaker did not make, never move a "yes" onto a different question, and never compress a qualified claim into an unqualified one. Tightening is fine; changing meaning is not. If a cut would change meaning, keep the longer version or show the cut (a visible jump or b-roll with the original words).

## Step 5: rough cut (cut list → conform)

Turn the paper edit into a cut list in **seconds**, snapped:

- in = first word start − 0.08 s; out = last word end + 0.12 s; merge runs whose gap is under 0.25 s.
- Round every boundary to the frame: `round(t × fps) / fps`.
- 10 ms audio fades at every boundary (no clicks); room tone under gaps, never digital silence.

Then conform in **one** ffmpeg pass (recipes §5): `trim`/`atrim` + `concat`, `fps` to the project rate, scale, a 0.5 s tail handle, VP9 with `-g 15` to `assets/edit.webm`, and the dialogue to `assets/edit-audio.wav` (48 kHz). Keep the cut list in `edit/cutlist.json` with each segment's source in/out and its new start, so captions and b-roll can be re-timed: `new_t = segment_start + (src_t − in)`.

Confirm `edit.webm` (minus the 0.5 s handle) and `edit-audio.wav` have the same duration to the frame. If they don't, the cut graph is wrong; fix it now, not after the render.

## Step 6: tighten

- Pauses and fillers per the Step 2 row. Remove about 60–80% of isolated um/uh, not all of them: removing every one sounds robotic and causes pitch jumps.
- Two consecutive segments of the same camera need a size change of at least 20% or b-roll over the join; otherwise the cut reads as a mistake. Use `ugc-craft`'s **jump zoom**: scale steps 1.0 → 1.2 on the cut frame and back to 1.0 on the next, never two zoomed segments in a row. Scaling stays ≤1.3 on 1080p sources (softness), up to 2.0 on 4K.
- Cut on action where you can (a head turn, a gesture); cut on a blink rather than mid-word.
- J- and L-cuts on dialogue transitions and every b-roll in/out: audio leads or trails the picture by 6–24 frames.

## Step 7: reframe

- Fixed framing (one crop per camera, the common podcast case): crop in ffmpeg during the conform (recipes §6), eyes on the upper-third line (y ≈ 1/3 of height), lead room in the direction of gaze.
- Moving framing (speaker switches, eased reframes, zoom moves): conform at the source aspect and move the footage plate in the scene, where easing is a one-liner.
- Two people in one wide shot for 9:16: stacked split screen (two 1080×960 halves) for exchanges; active-speaker crop for monologues; blurred letterbox only as a last resort.

## Step 8: the motion layer

Graphics serve the footage; they never cover a face or the active speaker's mouth.

| Element | Spec | Timing |
|---|---|---|
| Captions | social spec per `ugc-craft`; placements, word timing and the Three.js build in `references/captions.md` | each word from its start frame |
| Hook title (social) | 5–9 words, just below the top band (y 270–450 of 1920) | first 3–5 s, or persistent |
| Lower third | name + role, first appearance only | in 12–16 f, hold 4–6 s, out 6–9 f |
| Chapter / topic card | 3–7 words | 1–2 s |
| Keyword pop | 2–5 words | 1.5–3 s |
| B-roll insert | literal to the words, from the user, `stock-and-broll`, or `screen-capture` | 2–5 s, every 10–30 s long-form, 1–3 s social |
| Zoom moves | `ugc-craft`'s named moves: jump zoom 1.0 ↔ 1.2 on cuts; punch-in 1.0 → 1.12 over 8 f inCubic on a stressed word (≤4 per 30 s); long-form only: a slow push 1.0 → 1.08 over 3–6 s for a serious line | jump zoom per Step 6 |
| End card | CTA with URL or handle | social ≤2 s (or loop); YouTube 10–20 s end-screen area |

Entrances, exits, easing and overshoot come from `motion-language` (text 12 f per word, exits ~0.6× the entrance, holds ≥18 f before an exit). Default to hard cuts between footage segments; dissolves mean time passing; flashier transitions belong only to Gen Z and trailer styles.

**Building it, per engine:**

- **Three.js (default):** one scene per section (each ≤18,000 frames), each showing `edit.webm` from its own `SOURCE_IN` through the tested footage helper in `references/footage-in-scene.md`: an orthographic camera, a full-frame plate, captions as canvas-texture word meshes (`references/captions.md`), titles per `three-type`, scene handoffs per `three-transitions`. Load fonts per `three-type`; a missing font falls back silently.
- **HyperFrames:** `<video src="assets/edit.webm" muted playsinline data-start data-duration data-media-start>` in each sub-composition (timing on the video or its wrapper, never both; never `play()` or seek it yourself), the dialogue as a separate `<audio>`; captions and graphics are HTML over it, animated on the scene's paused timeline.
- **React (older projects):** `<Video src={clip} startFrom={seconds} />` from `@genmotion/motion`, which awaits its own seeks; captions with `<TextAnimation>` or per-word spans driven by the word list.

## Step 9: sound

Hand the mix to `sound-design`; it owns levels, ducking, music sourcing and loudness. Editing-specific rules:

- Clean the dialogue before it goes on the timeline, in this order: high-pass 80–100 Hz → gentle denoise → cut 200–400 Hz by 2–4 dB → compress 3:1 (3–6 dB of gain reduction) → de-ess → normalise to the delivery target (recipes §7). Over-denoising sounds underwater; stop early.
- Place `edit-audio.wav` on lane 0 at volume 1 from frame 0 with `place-audio`. A clip may be at most 18,000 frames (10 min at 30 fps): split longer dialogue into consecutive entries, each with `startFrom` (seconds) where the last one ended.
- Music under talk sits 18–25 dB below the voice (volume ≈ 0.06–0.13 after both are normalised); podcast and LinkedIn often take none. Drop it out under the single most important line.
- Trailers and Gen Z edits are cut **to** the music: pick the track first, then the cuts (`sound-design` beat grid).

## Step 10: render

- Validate every scene (`validate`), then `capture-frames` at the first frame, one frame after each cut, and the busiest caption moment.
- Short-form: render the whole thing.
- Long-form (over ~5 minutes of footage): the hybrid path. ffmpeg finishes the body from the cut list (punch-ins, crops, simple lower thirds with `drawtext`); the project renders only the designed inserts (cold-open title, chapter cards, end card) at the same size and fps; ffmpeg concatenates them with the body (recipes §10), and captions ship as an SRT sidecar, which is what YouTube and podcast platforms want anyway. Or render everything in the project if the user accepts the render time; tell them the estimate.

## Step 11: measure

All with `ffmpeg`/`ffprobe` (recipes §11):

1. **Duration** equals total frames ÷ fps, and the first frame is not black, a blink or mid-word.
2. **Frames at cuts:** extract the frame at every cut and one frame either side; look at them. For an exact check, compare the export to `edit.webm` with `psnr` over a band no graphic covers: runs of low values or a dip every Nth frame mean the footage is late; one isolated dip is encoder noise.
3. **Caption timing:** at three random words, the frame at the word's start shows that word highlighted, and nothing sits in the platform's UI zones.
4. **Unintended gaps:** `silencedetect` on the export finds no silence over 1 s you did not design.
5. **Loudness:** `ebur128` integrated within 1 LU of the target, true peak ≤ −1 dBTP. If not, fix it per `sound-design` and render again.

## Step 12: deliver

- The MP4 (H.264 High, yuv420p, AAC 48 kHz, faststart) at the platform's size.
- Sidecars where the format wants them: SRT captions; YouTube chapters (first at 00:00, at least 3, each ≥10 s, 3–7 word titles); podcast chapter metadata.
- For social clips: say which frame makes the best cover, and that trending audio, if wanted, is added in the app.
- Record in `VIDEO.md`: the cut list file, every music/SFX licence, and what you assumed.

## Good and bad

- **Good:** the clip opens on "Nobody tells you that raising money is the easy part" at frame 0, caption already up. **Bad:** it opens on "So, yeah, I think, um, the thing is…" and reaches the hook at 6 s.
- **Good:** two jump-cut segments alternate 1.0 and 1.2 scale, so the join reads as intentional. **Bad:** two 100% segments of the same angle, and the head twitches at the cut.
- **Good:** "We're not profitable yet, but we will be by Q3" stays whole. **Bad:** "We're … profitable" made by deleting the middle. That is fabrication, not editing.
- **Good:** footage conformed to VP9 with `-g 15`, seeks registered, frame-at-cut check passes. **Bad:** the phone's H.264 `.mp4` placed directly in a Three scene: it renders black and the render still says ok.
- **Good:** a 1–3 word caption centred at y 1160 of 1920, inside x 120–840. **Bad:** an eight-word line at y 1750, under TikTok's caption and username UI, running under the action column.

## Requirements

| Need | Capability or skill | Fallback when missing |
|---|---|---|
| Cutting, conforming, measuring | `ffmpeg` | None for footage edits: ask the user to install it (`genmotion doctor` shows the bundled one) |
| Word timestamps | `transcribe` | Silence map with `silencedetect`; ask the user for key lines; offer captions later |
| Footage, b-roll, music into assets | `save-asset` | Ask the user to drop files into `assets/source/` |
| Timeline audio | `place-audio` | None: audio not on the timeline is silent in the export |
| Seeing frames | `capture-frames` | Render a short `--frames` range and extract stills with `ffmpeg` |
| Scene checks | `validate` | Render a few frames and look |
| Music | `music` | The user's own track, or no music (talk carries it) |
| Sound effects | `sfx` | User-supplied files, or none |
| Direction, motion, mix | `direction`, `motion-language`, `sound-design` | None: read them |
| B-roll and stock | `stock-and-broll` | The user's own cutaways, or punch-ins instead |
| Three.js build | `three-type`, `three-assets`, `three-transitions` | None on a Three project |

## Checks before you finish

- [ ] Every source file is probed and logged in `VIDEO.md`; VFR sources were conformed to CFR.
- [ ] The paper edit is in `VIDEO.md`, and no cut changes what a speaker said or meant.
- [ ] `edit.webm` is VP9 with keyframes every 15 frames, at the project fps, with a 0.5 s tail handle; `edit-audio.wav` matches its length to the frame.
- [ ] Frame 0 of the export already shows the hook (social) or the cold open (long-form); it is not black.
- [ ] The frame at every cut and one frame after it show the intended source frame (looked at, or `psnr` band check clean).
- [ ] No two adjacent segments of one angle at the same size without b-roll over the join.
- [ ] Captions: at three sampled words the highlighted word matches the audio frame; lines fit the safe zone for the platform; reading rate within `references/captions.md`.
- [ ] No graphic covers a face; lower thirds only on first appearance.
- [ ] `silencedetect` finds no unintended gap over 1 s; there are no clicks at cuts (10 ms fades).
- [ ] Integrated loudness within 1 LU of the format's target, true peak ≤ −1 dBTP.
- [ ] Music and SFX licences, the cut list path and your assumptions are recorded in `VIDEO.md`.
