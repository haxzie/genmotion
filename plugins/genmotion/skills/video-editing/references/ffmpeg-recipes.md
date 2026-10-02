# ffmpeg recipe book for editing

Every command here ran on ffmpeg 6.1.1. Those marked **(render-tested)** were also pushed through a GenMotion render and checked frame by frame. Paths assume the project root; sources live in `assets/source/`, working files in `edit/`.

## Gotchas first

- **Stream copy (`-c copy`) cuts snap to the previous keyframe** (phones: 1–10 s apart). Use it only for rough pre-trims with margin, never for an edit point. Final cuts re-encode.
- **VFR phone footage** (`r_frame_rate` ≠ `avg_frame_rate`) drifts against audio once cut. Conform to CFR first.
- **`select='between(t,a,b)'` is inclusive at both ends**: one extra frame per segment. Use `trim`/`atrim`, or `gte(t,a)*lt(t,b)`.
- **`loudnorm` outputs 192 kHz** unless you add `aresample=48000` (or `-ar 48000`).
- **`zoompan` is built for stills**: on video use `d=1`, set `fps`, and pre-upscale 2× or the motion stutters. Static punch-ins are better done per segment with `scale`+`crop`, or in the scene.
- **Concat demuxer** needs identical codec, size, fps, timebase and audio layout, and adds ~20 ms of AAC priming per join. Use the concat *filter* for finals.
- **The CLI's Chromium decodes no H.264/AAC.** Anything a scene shows must be VP9 WebM (§5).
- **`anullsrc` is digital silence.** Under gaps use real room tone looped with `-stream_loop -1`.
- **Font missing in libass** falls back silently; ship the TTF and pass `fontsdir`.
- **Long filter graphs** overflow the command line: write them to a file and pass `-filter_complex_script edit/cut.filter`.

## 1. Probe

```sh
ffprobe -v error -show_format -show_streams -of json assets/source/cam-a.mp4
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,avg_frame_rate,codec_name,pix_fmt,color_transfer:stream_side_data=rotation -of json assets/source/cam-a.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 assets/source/cam-a.mp4
```

- VFR → CFR: `ffmpeg -i in.mov -vf fps=30 -c:v libx264 -crf 18 -c:a aac -ar 48000 edit/cam-a-cfr.mp4`.
- Rotation side data: ffmpeg auto-rotates on decode; compute crops on the rotated size.
- HDR iPhone footage (`color_transfer=arib-std-b67` or `smpte2084`) needs tone-mapping to Rec.709 before grading (`zscale` + `tonemap`, needs a build with libzimg); otherwise it looks washed out.

## 2. Look at the footage

```sh
# 540p proxy with a short GOP: fast to scrub, transcribe and scene-detect
ffmpeg -i assets/source/cam-a.mp4 -vf "scale=-2:540" -c:v libx264 -preset ultrafast -crf 28 -g 15 -c:a aac -b:a 96k edit/cam-a-proxy.mp4
# contact sheets: one tile per 10 s, 30 tiles a sheet, timecode burned in
ffmpeg -i edit/cam-a-proxy.mp4 -vf "fps=1/10,scale=480:-2,drawtext=text='%{pts\:hms}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6,tile=6x5" -fps_mode vfr edit/sheet_%03d.jpg
# one tile per shot change
ffmpeg -i edit/cam-a-proxy.mp4 -vf "select='gt(scene,0.3)',scale=320:-2,tile=5x4" -fps_mode vfr edit/shots_%02d.jpg
# shot boundaries as times
ffmpeg -i edit/cam-a-proxy.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep -o "pts_time:[0-9.]*"
# one frame
ffmpeg -ss 12.5 -i assets/source/cam-a.mp4 -frames:v 1 -update 1 edit/frame.png
```

Scene thresholds: `scene` 0.3–0.4 for hard cuts, lower for dissolves; `scdet=threshold=10` (8–15) is the alternative. Also useful: `blackdetect=d=0.1:pix_th=0.1`, `freezedetect=n=-60dB:d=2`, `cropdetect` (letterboxing).

Compute cut lists on the proxy in **seconds**, then apply the same seconds to the originals.

## 3. Audio for transcription

```sh
ffmpeg -i assets/source/cam-a.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le edit/audio16k.wav
```

If a local Whisper exists (the `transcribe` capability names the options):

```sh
whisper edit/audio16k.wav --model medium --language en --word_timestamps True --output_format json --output_dir edit/
whisper-cli -m ggml-medium.en.bin -f edit/audio16k.wav -oj -ojf        # whisper.cpp, full JSON with token times
```

- To make Whisper keep fillers, pass an initial prompt written with them: `--initial_prompt "Umm, let me think like, hmm... Okay, here's what I'm, like, thinking."`
- Diarisation (who is speaking) needs whisperX/pyannote or per-speaker tracks; on per-speaker tracks, the loudest track per 100 ms window is the speaker.
- Word times can be 100–300 ms off; pad cuts and snap to the nearest low-energy point.

## 4. Silence map (no transcript, or to tighten pauses)

```sh
ffmpeg -hide_banner -nostats -i edit/audio16k.wav -af silencedetect=noise=-35dB:d=0.45 -f null - 2>&1 | grep -oE "silence_(start|end): [0-9.]+"
```

- Threshold −30 to −40 dB for a clean mic, −25 dB in a noisy room; measure the floor first with `astats` or `ebur128`. Duration `d`: 0.3 s (Shorts) to 0.8 s (podcast).
- Keep-segments from the list: speech runs from each `silence_end − pad` to the next `silence_start + pad` (pad 0.08–0.15 s); drop pieces under 0.2 s; compress rather than delete long pauses in long-form (leave 0.25–0.4 s).
- Audio-only podcasts can use `silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-35dB`; it cannot keep video in sync.

## 5. Conform the edit (render-tested)

One pass from the cut list to the two files the project uses. Segments `[0,3)` and `[5,9)` of a 30 fps source:

```sh
ffmpeg -y -i assets/source/cam-a.mp4 -filter_complex "\
[0:v]trim=start=0:end=3,setpts=PTS-STARTPTS[v0];\
[0:a]atrim=start=0:end=3,asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=2.99:d=0.01[a0];\
[0:v]trim=start=5:end=9,setpts=PTS-STARTPTS[v1];\
[0:a]atrim=start=5:end=9,asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=3.99:d=0.01[a1];\
[v0][a0][v1][a1]concat=n=2:v=1:a=1[vc][ac];\
[vc]fps=30,scale=1920:1080:flags=lanczos,setsar=1,tpad=stop_mode=clone:stop_duration=0.5,format=yuv420p[v]" \
 -map "[v]" -an -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -row-mt 1 -crf 30 -b:v 0 -g 15 -keyint_min 15 assets/edit.webm \
 -map "[ac]" -vn -c:a pcm_s16le -ar 48000 -ac 2 edit/edit-audio-raw.wav
```

- `fps=` is the project fps; `scale=` is the project size if framing is final, or the source size (≤1920 on the long edge) if the scene reframes or punches in.
- `-g 15` keyframes every half second: measured exact and fastest (`footage-in-scene.md`). `-crf 30` with `-deadline realtime -cpu-used 8` is visually clean for 1080p talk and encodes at ~2× real time on 4 cores; use `-deadline good -cpu-used 4 -crf 28` for a hero trailer.
- `tpad` adds the 0.5 s tail handle the last scene frame needs.
- Each `afade` pair: `st` = segment length − 0.01.
- Multiple sources: add inputs and use `[1:v]`, `[1:a]`; every segment must reach `concat` at the same size, fps and sample rate, so put `fps`, `scale`, `setsar` and `aresample=48000` on each segment when sources differ.
- Many segments: write the graph to `edit/cut.filter` and use `-filter_complex_script edit/cut.filter`.
- Check: `ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 assets/edit.webm` equals the edit's frames + 15 (the handle), and the WAV's duration equals the edit's duration.

B-roll and inserts are conformed the same way, each to its own `.webm`.

## 6. Reframe

```sh
# 9:16 crop centred on the subject's x-centre CX (source px), clamped to the frame
ffmpeg -i in.mp4 -vf "crop=w=ih*9/16:h=ih:x='min(max(CX-ih*9/32,0),iw-ih*9/16)':y=0,scale=1080:1920,setsar=1" -c:a copy v916.mp4
# split screen: two speakers from one 1920x1080 wide shot, each half 1080x960 (a 9:8 crop around XA and XB)
ffmpeg -i wide.mp4 -filter_complex "[0:v]split[a][b];[a]crop=ih*9/8:ih:(XA-ih*9/16):0,scale=1080:960[top];[b]crop=ih*9/8:ih:(XB-ih*9/16):0,scale=1080:960[bot];[top][bot]vstack,setsar=1[v]" -map "[v]" -map 0:a split.mp4
# blurred-background letterbox (last resort)
ffmpeg -i in.mp4 -filter_complex "[0:v]split=2[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=40,eq=brightness=-0.08[bgb];[fg]scale=1080:-2[fgs];[bgb][fgs]overlay=(W-w)/2:(H-h)/2,setsar=1[v]" -map "[v]" -map 0:a -c:a copy blur.mp4
```

Find CX from a contact sheet: locked-off podcast cameras need one value per camera. A moving crop by expression (`x='if(lt(t,4.2),300,1180)'`) works, but an eased reframe is simpler in the scene (`footage-in-scene.md`).

## 7. Dialogue cleanup and loudness

Order matters: high-pass → denoise → subtractive EQ → compressor → de-esser → loudness.

```sh
CHAIN="highpass=f=80,afftdn=nf=-25,equalizer=f=300:t=q:w=1:g=-3,acompressor=threshold=-21dB:ratio=3:attack=10:release=200:makeup=2,deesser=i=0.4"
# pass 1: measure the chain's output (same chain as pass 2)
ffmpeg -hide_banner -nostats -i edit/edit-audio-raw.wav -af "$CHAIN,loudnorm=I=-14:TP=-1:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p' > edit/ln.json
# pass 2: feed input_i, input_tp, input_lra, input_thresh, target_offset from ln.json
ffmpeg -i edit/edit-audio-raw.wav -af "$CHAIN,loudnorm=I=-14:TP=-1:LRA=11:measured_I=-29.26:measured_TP=-24.46:measured_LRA=2.90:measured_thresh=-39.29:offset=0.10:linear=true,aresample=48000" -c:a pcm_s16le assets/edit-audio.wav
```

Tested: a −29 LUFS source came out at −14.1 LUFS. Targets: `I=-16:TP=-1` for podcast feeds, `I=-14:TP=-1` for YouTube and social.

- High-pass 80 Hz for deep voices, 100 Hz for higher ones. `afftdn=nf=-25` is gentle; go no further than −30 before voices turn watery. `arnndn` (RNNoise model file) is the stronger option for voice.
- Very uneven speakers: `speechnorm` or `dynaudnorm` before the chain.
- `normalization_type: "dynamic"` in pass 2's output means the peak target could not be met linearly; acceptable for speech, or limit first (`alimiter=limit=0.89`).
- Ducking, music edits and the final mix belong to `sound-design`.

## 8. Speed, punch-in, stabilise, colour

```sh
# 2x with pitch-kept audio (atempo takes 0.5–100 per instance; chain for more)
ffmpeg -i in.mp4 -filter_complex "[0:v]setpts=PTS/2[v];[0:a]atempo=2.0[a]" -map "[v]" -map "[a]" fast.mp4
# stepped ramp for a boring stretch: cut it into 3–5 pieces at 1x, 2x, 4x, 2x, 1x and concat (§5)
# hard punch-in to 115% between 2 s and 4 s (no zoompan jitter)
ffmpeg -i in.mp4 -vf "scale=w='if(between(t,2,4),iw*1.15,iw)':h='if(between(t,2,4),ih*1.15,ih)':eval=frame,crop=1920:1080" out.mp4
# slow push 100->120% (pre-upscale, d=1, fps set)
ffmpeg -i in.mp4 -vf "scale=3840:-2,zoompan=z='min(1+0.0015*on,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30" out.mp4
# stabilise, two pass (smoothing ~ fps frames each side)
ffmpeg -i in.mp4 -vf vidstabdetect=shakiness=5:accuracy=15:result=edit/transforms.trf -f null -
ffmpeg -i in.mp4 -vf "vidstabtransform=input=edit/transforms.trf:smoothing=30:zoom=0:optzoom=1,unsharp=5:5:0.8:3:3:0.4" -c:a copy stab.mp4
# colour: correct, then match, then look (keep saturation <= 1.2, skin natural)
ffmpeg -i in.mp4 -vf "eq=contrast=1.05:saturation=1.1:gamma=0.98,curves=preset=medium_contrast,colortemperature=temperature=5800" -c:a copy graded.mp4
# chroma key a green-screen creator over a background
ffmpeg -i bg.mp4 -i gs.mp4 -filter_complex "[1:v]chromakey=0x00FF00:0.12:0.08,despill=type=green[k];[0:v][k]overlay=(W-w)/2:H-h" key.mp4
```

- Slow motion below 0.5× needs high-fps capture; `minterpolate` artifacts on complex motion.
- Don't stabilise deliberate handheld energy in TikTok-native edits.
- Log footage: apply the technical LUT (`lut3d=file=log-to-709.cube`) before any creative grade. Check with `waveform` / `vectorscope` frames.
- Chroma key similarity 0.08–0.2; add `despill` and a slight erode against fringes (the chroma-key graph uses standard filters but was not run here).

## 9. Sync

```sh
# delay an external recorder by 320 ms against the camera
ffmpeg -i cam.mp4 -itsoffset 0.320 -i recorder.wav -map 0:v -map 1:a -c:v copy -c:a aac synced.mp4
ffmpeg -i in.mp4 -af "adelay=320|320" out.mp4
```

- Find the offset from a clap (`silencedetect` or the first peak) or by cross-correlating 8 kHz mono extracts of both tracks.
- Separate recorders drift ~1 frame per 10–20 min: check sync at the start and the end; correct with a tiny `atempo` or `aresample=async=1`.

## 10. Long-form hybrid: body by ffmpeg, inserts by the project (tested)

The project renders the designed inserts (title, chapter cards, end card) as short renders at the same size and fps (`genmotion render edit/insert-title.mp4 --frames 0-59`); ffmpeg cuts the body (§5 graph with H.264 output instead of VP9) and joins everything:

```sh
ffmpeg -y -i edit/insert-title.mp4 -i edit/body.mp4 -i edit/insert-end.mp4 -f lavfi -t 2 -i anullsrc=r=48000:cl=stereo -filter_complex "\
[0:v]fps=30,scale=1920:1080,setsar=1,format=yuv420p[v0];[1:v]fps=30,scale=1920:1080,setsar=1,format=yuv420p[v1];[2:v]fps=30,scale=1920:1080,setsar=1,format=yuv420p[v2];\
[3:a]asplit=2[s0][s2];[1:a]aresample=48000,aformat=channel_layouts=stereo[a1];\
[v0][s0][v1][a1][v2][s2]concat=n=3:v=1:a=1[v][a]" \
 -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -movflags +faststart out.mp4
```

Tested: 2 s + 10 s + 2 s joined to 14.0 s. An insert rendered without audio needs a silent stream of its length (`anullsrc -t`); one rendered with its own sting keeps it (`[0:a]`). Lower thirds on the body: `drawbox` + `drawtext` with `enable='between(t,a,b)'`, or ASS (see `captions.md`). Then loudness-normalise the joined file (§7 pass 1/2 on `out.mp4` with `-c:v copy`).

## 11. Measure the export

```sh
# duration and streams
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact exports/edit.mp4
# frames at a cut (t = cut time) and either side, as a strip to look at
ffmpeg -ss 12.400 -i exports/edit.mp4 -frames:v 3 -vf "scale=480:-2,tile=3x1" -update 1 edit/cut-12.4.png
# footage sync: export vs edit.webm over a band no graphic covers (here the top quarter)
ffmpeg -hide_banner -nostats -i exports/edit.mp4 -i assets/edit.webm -filter_complex "[0:v]setpts=N/30/TB,crop=iw:ih/4:0:0[a];[1:v]setpts=N/30/TB,scale=1920:1080,crop=iw:ih/4:0:0[b];[a][b]psnr=stats_file=edit/psnr.log:shortest=1" -f null -
awk '{split($1,n,":"); split($6,p,":"); if (p[2]+0 < 25) print n[2], p[2]}' edit/psnr.log
# unintended gaps
ffmpeg -hide_banner -nostats -i exports/edit.mp4 -af silencedetect=noise=-45dB:d=1 -f null - 2>&1 | grep silence_
# loudness: integrated and true peak
ffmpeg -hide_banner -nostats -i exports/edit.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):"
```

- The `setpts=N/30/TB` on both inputs matters: without it the WebM and MP4 timestamps round differently and every third frame pairs with its neighbour, a false alarm. Use the project fps.
- Reading `psnr.log`: a clean edit sits around 35–50 dB; runs of low frames, or a dip on every Nth frame, mean the footage is late; one isolated dip is encoder noise. Only valid where the scene shows `edit.webm` full-frame and unscaled.
- First frame not black: `ffmpeg -i exports/edit.mp4 -vf "blackdetect=d=0.03:pix_th=0.1" -f null - 2>&1 | grep black_start`.

## 12. Deliver

```sh
# platform master: H.264 High, yuv420p, AAC 48 kHz, faststart
ffmpeg -i exports/edit.mp4 -c:v libx264 -preset slow -crf 18 -profile:v high -pix_fmt yuv420p -r 30 -g 60 -c:a aac -b:a 192k -ar 48000 -movflags +faststart deliver/edit.mp4
# chapters into the file (FFMETADATA: [CHAPTER] TIMEBASE=1/1000 START=0 END=95000 title=Cold open)
ffmpeg -i deliver/edit.mp4 -i edit/chapters.txt -map_metadata 1 -map_chapters 1 -c copy deliver/edit-ch.mp4
```

YouTube chapters go in the description: first at `00:00`, at least 3, ascending, each ≥10 s.
