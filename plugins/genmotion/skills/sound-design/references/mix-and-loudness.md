# Mix and loudness: tables and `ffmpeg` commands

Read this when you set levels, duck a bed, normalise a source, or measure and re-master an export. Every command here was run on ffmpeg 6.1; type them inline in the shell, never save them as script files.

## Why the numbers matter here

The export sums every clip with `amix … normalize=0` and applies **no limiter and no loudness stage**. Two peaks at −6 dBFS that coincide reach about 0 dBFS. So: normalise sources, leave headroom, and measure the output.

## dB ↔ linear `volume`

`gain = 10^(dB/20)`, `dB = 20 × log10(gain)`. The clip ceiling is 2.0 (+6 dB); a source quieter than that needs normalising, not more gain.

| dB | gain | | dB | gain |
|---|---|---|---|---|
| +6 | 1.995 | | −9 | 0.355 |
| +3 | 1.413 | | −10 | 0.316 |
| +2 | 1.259 | | −12 | 0.251 |
| +1 | 1.122 | | −14 | 0.200 |
| 0 | 1.000 | | −15 | 0.178 |
| −1 | 0.891 | | −16 | 0.158 |
| −2 | 0.794 | | −17 | 0.141 |
| −3 | 0.708 | | −18 | 0.126 |
| −4 | 0.631 | | −20 | 0.100 |
| −5 | 0.562 | | −24 | 0.063 |
| −6 | 0.501 | | −30 | 0.032 |
| −8 | 0.398 | | −40 | 0.010 |

## Level ladder: house values and the loudness behind them

| Element | `volume` (house) | Relative to VO | Loudness while it plays (in a −14 LUFS master) |
|---|---|---|---|
| VO | 1.0 | 0 dB | −16 to −14 LUFS short-term |
| Music alone | 1.0 | ≈ 0 to −2 dB | −16 to −14 LUFS |
| Music under SFX only | 0.5–0.6 | — | — |
| Music bed under VO | 0.14–0.28 (default 0.18) | −17 to −11 dB (−15 default; speech-centric content ≥ 20 dB down per WCAG 1.4.7) | −30 to −24 LUFS |
| UI clicks / taps | 0.8–1.0 | short transients, perceived well below VO | −30 to −22 LUFS |
| Impacts | 0.7–0.85 | hits under VO ≈ −6 dB | peaks −10 to −6 dBFS |
| Whooshes | 0.5–0.7 | | |
| Risers / swells / rings | 0.55–0.6 | | |
| Pops / ticks | 0.45–0.55 | | |
| Logo hit | 0.45 intro / 0.9 final lockup | | |
| Room tone / ambience | 0.03–0.1 | −30 to −20 dB | −40 to −30 LUFS |
| A quiet source (house: tile clinks) | up to 2.0 | | prefer normalising |

These hold only if sources are normalised: VO and music to −16 LUFS integrated, SFX to a −3 dBFS peak.

## Normalising sources

```
# VO or music: single-pass loudnorm is fine for prep
ffmpeg -i assets/vo-raw.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000 assets/vo.wav

# SFX: read the peak, then lift it to -3 dBFS
ffmpeg -i assets/hit-raw.mp3 -af volumedetect -f null -
#   max_volume: -7.2 dB  → apply +4.2 dB
ffmpeg -i assets/hit-raw.mp3 -af "volume=4.2dB" assets/hit.wav
```

Loudness is meaningless for a 0.3 s click; peak-normalise SFX.

## Ducking

Typical amounts: 6–12 dB for gentle carving, 12–20 dB for clear narration. Attack 30–80 ms, release 300–1000 ms (longer stops the bed pumping up between words). In frames at 30 fps: 3–6 f down, 10–20 f up.

House default is **no ducking**: a constant bed at 0.14–0.28 under VO. Duck only when the music should rise between lines (pauses ≥ 1.5 s), and per sentence, never per word.

### A. Split the bed on the timeline (any engine)

Cut the bed into clips at VO phrase boundaries, alternating tracks 1 and 3, each with the same `file` and a `startFrom` that continues the music (`startFrom_B = startFrom_A + (startFrame_B − startFrame_A)/fps`). Under a line: 0.18. Between lines: 0.8. Overlap neighbours 4–8 f; the clip going down fades out over 4–8 f, the clip coming up fades in over 10–20 f.

### B. Pre-render a ducked bed with a sidechain

Lay the VO out at its timeline position first (`adelay` in ms), then:

```
ffmpeg -i assets/music.wav -i assets/vo-timeline.wav -filter_complex "[0:a][1:a]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400:makeup=1[duck]" -map "[duck]" assets/bed-ducked.wav
```

`threshold` is linear (0.03 ≈ −30 dBFS); ratio 4–10; attack 5–80 ms; release 250–1000 ms. Place the result at `volume` 1.0 under the VO, or around 0.7 for a softer bed.

To build `vo-timeline.wav` from one VO file that starts at 2.4 s: `ffmpeg -i assets/vo.wav -af "adelay=2400|2400" assets/vo-timeline.wav`.

### C. An exact envelope from the VO's pauses

```
ffmpeg -i assets/vo-timeline.wav -af silencedetect=noise=-40dB:d=0.4 -f null -
```

Speech is the gaps between `silence_end` and the next `silence_start`. For speech regions [0.85, 4.4] and [5.85, 9.4], ducking to 0.251 (−12 dB) with a 150 ms ramp down and 400 ms ramp up:

```
ffmpeg -i assets/music.wav -af "volume='1-0.749*max(min(min((t-0.85)/0.15,1),min((4.4-t)/0.4,1)),max(min(min((t-5.85)/0.15,1),min((9.4-t)/0.4,1)),0))':eval=frame" assets/bed-ducked.wav
```

Measured dip: 11–12 dB.

### D. HyperFrames

Tween the `<audio>` element's volume on the timeline: down over ~0.2 s before a line, back over ~0.4 s after it. The export reads the per-frame gain, so the duck survives.

## Fades (30 fps)

| Situation | Fade |
|---|---|
| Any head or tail not on a transient | ≥ 1–2 f, never 0 mid-waveform (it clicks) |
| SFX one-shot | in 0; out 2–12 f only if trimmed mid-tail |
| Music starting on a downbeat | in 0–1 f |
| Music starting mid-phrase or under VO | in 15–30 f (house median 15) |
| Music ending on a button | none; let the tail ring 1–3 s |
| Music ending without a button | out 30–90 f, ending on a bar line, picture holding |
| Bed under VO, ending | out 30–45 f |
| Ambience / room tone | 15–30 f each end |
| VO | 2–3 f each end |

## Music edits

Join downbeat to downbeat at phrase boundaries with a 30 ms crossfade:

```
ffmpeg -i assets/track.wav -filter_complex "[0:a]atrim=0:8,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=24,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=0.03:c1=tri:c2=tri[out]" -map "[out]" assets/track-edit.wav
```

The output is 8 + (end − 24) − 0.03 s long. Use ½–2 beats of crossfade only when the joined material is pads or reverb tails, placed before the downbeat so the new transient stays intact. On the timeline the same edit is two clips of the file on tracks 1 and 3, overlapping 1 f with 1-frame fades; the pre-rendered file is more precise because a frame is 33 ms.

## Delivery loudness

| Destination | Integrated | True peak |
|---|---|---|
| YouTube (turns loud uploads down, never quiet ones up) | −14 LUFS | ≤ −1 dBTP |
| TikTok, Reels, Shorts (not published; practitioners measure ≈ −14) | −14 LUFS (music-led edits up to −13; never above −10) | ≤ −1 dBTP |
| Spotify video / podcasts | −14 LUFS | ≤ −1 dBTP (−2 if louder) |
| Apple Podcasts | −16 LUFS ± 1 | ≤ −1 dBTP |
| Podcasts general | −16 stereo / −19 mono | −1 dBTP |
| Web or in-app autoplay | −14 to −16 | −1 dBTP |
| EBU R128 broadcast | −23 LUFS ± 0.5 | ≤ −1 dBTP |
| ATSC A/85 (US broadcast) | −24 LKFS ± 2 | ≤ −2 dBTP |
| Netflix | −27 LKFS ± 2, dialogue-gated | ≤ −2 dBTP |

Default: −14 LUFS / −1 dBTP unless the user names another destination. Keep some dynamics: a short promo's loudness range (LRA) is typically 4–8 LU, so hits still land.

## Measuring

```
# Integrated loudness, LRA and true peak: read the Summary block
ffmpeg -hide_banner -nostats -i out.mp4 -map 0:a -af ebur128=peak=true -f null -

# Peak and mean sanity check
ffmpeg -i out.mp4 -af volumedetect -f null -

# Momentary loudness curve, to find the loudest section or a quiet intro
ffmpeg -i out.mp4 -af "ebur128=metadata=1,ametadata=print:key=lavfi.r128.M:file=assets/loudness.txt" -f null -
```

## Re-mastering an export (two-pass, linear)

Pass 1 measures:

```
ffmpeg -i out.mp4 -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null -
```

Copy `input_i`, `input_tp`, `input_lra`, `input_thresh` and `target_offset` from the JSON into pass 2:

```
ffmpeg -i out.mp4 -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=-20.72:measured_TP=-9.82:measured_LRA=0.10:measured_thresh=-30.72:offset=0.00:linear=true:print_format=summary" -ar 48000 -c:v copy -c:a aac -b:a 192k out-14lufs.mp4
```

Always add `-ar 48000`: loudnorm otherwise outputs 192 kHz. If pass 2 reports `normalization_type: dynamic`, the peak target could not be met with plain gain and loudnorm compressed instead; reduce the loudest overlapping clips (or lower the TP target) and export again. Measure the new file before handing it over.

The loop: export → `ebur128` → off by more than 1 LU? scale every clip `volume` by the difference (×1.12 per +1 dB) or re-master → true peak above −1 dBTP? pull the loudest overlapping clips down → measure again.
