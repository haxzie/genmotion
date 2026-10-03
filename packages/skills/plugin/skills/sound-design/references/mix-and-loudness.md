# Mix and loudness: tables and `ffmpeg` commands

Read this when you set levels, duck a bed, normalise a source, or measure and re-master an export. Every command here was run on ffmpeg 6.1; type them inline in the shell, never save them as script files.

## Why the numbers matter here

The export sums every clip with `amix … normalize=0` and applies **no limiter and no loudness stage**. Two peaks at −6 dBFS that coincide reach about 0 dBFS, and the AAC encode adds up to ~1 dB of true peak on top. So: normalise sources, pre-master whatever the SFX sit on to −15 LUFS / −3 dBTP, and measure the output.

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
| Music bed under any voice (VO or recorded speech) | 0.1–0.2 (default 0.18 sparse bed under VO; 0.12 dense track under recorded speech) | −20 to −14 dB: the bed sits 14–20 LU under the voice | −34 to −28 LUFS |
| Podcast clip | none, or 0.1 | −20 dB | −34 LUFS |
| UI clicks / taps | 0.8–1.0 | short transients, perceived well below VO | −30 to −22 LUFS |
| Impacts | 0.7–0.85 | hits under VO ≈ −6 dB | peaks −10 to −6 dBFS |
| Soft lands / thuds on a settle | 0.5–0.7 | | |
| Transition cues | none by default (no whooshes: SKILL.md) | | |
| Risers / swells / rings | 0.55–0.6 | | |
| Pops / ticks | 0.45–0.55 | | |
| Logo hit | 0.45 intro / 0.9 final lockup | | |
| Recorded ambience from the user's footage (never synthesised noise) | 0.03–0.1 | −30 to −20 dB | −40 to −30 LUFS |
| A quiet source (house: tile clinks) | up to 2.0 | | prefer normalising |

These hold only if sources are normalised: VO and music to −16 LUFS integrated, SFX to a −3 dBFS peak.

### Is the bed audible? (and not masking)

The rule is 14–20 LU between voice and bed. On normalised sources it is `−20·log10(volume)`. To measure it on real files, read each source's integrated loudness and add the clip gain:

```
ffmpeg -hide_banner -nostats -i assets/edit-audio.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:"
ffmpeg -hide_banner -nostats -i assets/bed.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:"
# gap = voice I − (bed I + 20·log10(volume)); 14–20 passes
```

A dense bed (drums, bright synths, anything busy at 1–4 kHz) masks consonants at a smaller gap than a sparse pad. Low-pass it rather than burying it below 20 LU, where a phone speaker loses it entirely:

```
ffmpeg -i assets/track.mp3 -af "lowpass=f=7000,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 48000 assets/bed.wav
```

On the export, a ≥1 s pause in the speech should read above −35 LUFS momentary when a bed is meant to be there (the momentary curve command under Measuring).

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

Typical amounts: 6–12 dB for gentle carving, 12–20 dB for clear narration. Attack 30–80 ms, release 300–1000 ms (longer stops the bed pumping up between words). In frames at 30 fps: 3–6 f down, 10–20 f up (at 24 fps: 2–5 f, 8–16 f).

House default is **no ducking**: a constant bed at 0.1–0.2 under the voice (the ladder). Duck only when the music should rise between lines (pauses ≥ 1.5 s), and per sentence, never per word.

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

## Fades (30 fps; at 24 fps multiply by 0.8)

| Situation | Fade |
|---|---|
| Any head or tail not on a transient | ≥ 1–2 f, never 0 mid-waveform (it clicks) |
| SFX one-shot | in 0; out 2–12 f only if trimmed mid-tail |
| Music starting on a downbeat | in 0–1 f |
| Music starting mid-phrase or under VO | in 15–30 f (house median 15) |
| Music ending on a button | none; let the tail ring 1–3 s |
| Music ending without a button | out 30–90 f, ending on a bar line, picture holding |
| Bed under VO, ending | out 30–45 f |
| Recorded ambience | 15–30 f each end |
| Any SFX cue | its own decay, or a fade over the last 80–150 ms; never truncated |
| VO | 2–3 f each end |

## Music edits

Join downbeat to downbeat at phrase boundaries with a 30 ms crossfade **centred on both downbeats**. `acrossfade` overlaps the last `d` of A with the first `d` of B, so a plain cut at both downbeats moves B's downbeat `d` early (a frame at 30 ms): end A `d/2` past its downbeat and start B `d/2` before its own. Here A's out-downbeat is 8.000 s and B's in-downbeat 24.000 s:

```
ffmpeg -i assets/track.wav -filter_complex "[0:a]asplit[x][y];[x]atrim=0:8.015,asetpts=PTS-STARTPTS[a];[y]atrim=start=23.985,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=0.03:c1=tri:c2=tri[out]" -map "[out]" assets/track-edit.wav
```

B's downbeat lands at 8.000 s of the output, exactly where A's would have been. Find the downbeats with `beat-sync.md`. Use ½–2 beats of crossfade only when the joined material is pads or reverb tails, placed before the downbeat so the new transient stays intact. On the timeline the same edit is two clips of the file on tracks 1 and 3, overlapping 1 f with 1-frame fades; the pre-rendered file is more precise because a frame is 33 ms.

### Beatless music (orchestral, ambient, drones): join by level and texture

With no downbeats there is no grid to hide the join, and matching loudness alone is not enough: a join where the full band matched within 1.3 dB still read as a texture switch, because the strings' upper band fell away. Three rules:

1. **Join inside a decay.** The out point is where a phrase or swell is falling away (the 50 ms RMS dropping over the last 0.3–0.5 s), never on a held climax or an attack; the in point starts on a sustain or a soft entry, never on an attack that the crossfade would smear.
2. **Both sides within 3 dB in both bands.** Compare the 0.5 s RMS just before the out point with just after the in point, full band **and** above 4 kHz (the air and string wash that the ear tracks as "the same recording"). The upper band must not drop out across the join: within 6 dB side to side (a 20–30 dB fall is the switch you hear).
3. **Crossfade 0.3–0.8 s, equal power** (`c1=qsin:c2=qsin`, because the two sides are uncorrelated and a linear fade dips about 3 dB in the middle), and place it under a picture transition (a cut, a wipe, a flood), so any residual change reads as motivated.

```
# 1. 50 ms RMS rows, full band and above 4 kHz: pick the out point (A) and the in point (B) from these
ffmpeg -i assets/score.mp3 -af "aresample=48000,asetnsamples=n=2400:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=assets/rms-full.txt" -f null -
ffmpeg -i assets/score.mp3 -af "highpass=f=4000,highpass=f=4000,aresample=48000,asetnsamples=n=2400:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=assets/rms-hf.txt" -f null -
# 2. the join: A = 14.3 s (out), B = 68.8 s (in), 0.5 s equal-power crossfade
ffmpeg -i assets/score.mp3 -filter_complex "[0:a]atrim=0:14.3,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=68.8:end=84,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=0.5:c1=qsin:c2=qsin[out]" -map "[out]" -c:a pcm_s16le assets/score-edit.wav
# 3. re-run step 1 on score-edit.wav and read the 0.5 s windows from 1 s before the join to 1 s after it (the join starts at A − d = 13.8 s)
```

Measured on a CC BY orchestral end-credits score (126 s, no beat): this join's 0.5 s windows across it stayed within 1.6 dB step to step in the full band, and the upper band went from −31.5 dB before to −29.5 dB after (no dropout). A join from 8 s into 26 s on the same track, chosen by full-band level alone (within 3 dB), measured fine in the full band but its upper band fell from −29 to −65 dB: the audible switch from a dense string wash to a thin texture. Delete the RMS files after. The output is A + (end − B) − d seconds long.

## Delivery loudness

| Destination | Integrated | True peak |
|---|---|---|
| YouTube (turns loud uploads down, never quiet ones up) | −14 LUFS | ≤ −1 dBTP |
| TikTok, Reels, Shorts (not published; practitioners measure ≈ −14) | −14 LUFS, music-led edits included | ≤ −1 dBTP |
| Spotify video / podcasts | −14 LUFS | ≤ −1 dBTP (−2 if louder) |
| Apple Podcasts | −16 LUFS ± 1 | ≤ −1 dBTP |
| Podcasts general | −16 stereo / −19 mono | −1 dBTP |
| Web or in-app autoplay | −14 to −16 | −1 dBTP |
| Sparse, picture-led film (designed cues, no music or VO) in a feed: X, LinkedIn, Instagram, TikTok, YouTube Shorts, Kickstarter, Product Hunt | −14 LUFS (feeds never turn a quiet file up; a −18 post plays 4 dB under its neighbours and its bed drops out on a phone) | ≤ −1 dBTP, LRA about 4–10 LU |
| Sparse film on its own page: a site hero, an autoplay-muted embed, a long-form player | −16 to −18 LUFS (no louder neighbour; the silence is part of the design) | ≤ −1 dBTP, LRA 4–12 LU |
| EBU R128 broadcast | −23 LUFS ± 0.5 | ≤ −1 dBTP |
| ATSC A/85 (US broadcast) | −24 LKFS ± 2 | ≤ −2 dBTP |
| Netflix | −27 LKFS ± 2, dialogue-gated | ≤ −2 dBTP |

Default: −14 LUFS / −1 dBTP unless the user names another destination. Keep some dynamics: a short promo's loudness range (LRA) is typically 4–10 LU, so hits still land; a wider LRA in a short feed film usually means too few cues or clipped tails, not designed dynamics.

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

Always add `-ar 48000`: loudnorm otherwise outputs 192 kHz. If pass 2 reports `normalization_type: dynamic`, the peak target could not be met with plain gain and loudnorm compressed instead. Measure the new file before handing it over.

**The standard form: peak-limit at a computed ceiling, then linear.** A mix that sits below the target with peaks near the ceiling cannot be raised linearly (the gain would push the peaks over), so pass 2 falls back to `dynamic`. A sample-peak limiter in front of `loudnorm`, in both passes, keeps the gain linear, **if its ceiling leaves room for the whole gain**:

`ceiling_dBFS = target_TP − (target_I − I_measured) − 1`

The gain `loudnorm` will apply is `target_I − I_measured`; a peak limited to the ceiling lands at `target_TP − 1` after it, and the 1 dB covers intersample peaks, the small loudness the limiter itself removes, and the AAC encode. A fixed −4 dBFS ceiling is the special case of a mix about 2 LU under target; a sparse picture-led mix 5–9 LU under it needs −6 to −10 dBFS. `alimiter`'s lowest `limit` is 0.0625 (−24 dBFS); if the formula asks for less, the film needs mixing, not mastering (raise the cues, not the master).

```
IN=out.mp4; TI=-16; TTP=-1          # target: -16 for a calm sparse film, -14 for everything else
MI=$(ffmpeg -hide_banner -nostats -i $IN -map 0:a -af ebur128 -f null - 2>&1 | awk '$1=="I:"{v=$2} END{print v}')
C=$(awk -v ti=$TI -v tp=$TTP -v mi=$MI 'BEGIN{printf "%.2f", tp-(ti-mi)-1}')
LIM=$(awk -v c=$C 'BEGIN{printf "%.4f", 10^(c/20)}')
echo "measured $MI LUFS -> ceiling $C dBFS (limit=$LIM)"
P="alimiter=limit=$LIM:attack=5:release=50:level=disabled:latency=1"
ffmpeg -hide_banner -nostats -i $IN -map 0:a -af "$P,loudnorm=I=$TI:TP=$TTP:LRA=20:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p' > assets/ln.json
J(){ grep "\"$1\"" assets/ln.json | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -y -hide_banner -nostats -i $IN -af "$P,loudnorm=I=$TI:TP=$TTP:LRA=20:measured_I=$(J input_i):measured_TP=$(J input_tp):measured_LRA=$(J input_lra):measured_thresh=$(J input_thresh):offset=$(J target_offset):linear=true:print_format=json" -ar 48000 -c:v copy -c:a aac -b:a 192k -movflags +faststart out-master.mp4 2>&1 | grep -E '"(normalization_type|output_i|output_tp)"'
ffmpeg -hide_banner -nostats -i out-master.mp4 -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -A14 Summary | grep -E "I:|LRA:|Peak:"
```

The grep prints `"normalization_type" : "linear"` (or `"dynamic"`) with the output loudness and true peak: record the type in `VIDEO.md`. `LRA=20` keeps loudnorm from treating a sparse film's wide range as a reason to compress; `latency=1` removes the limiter's 5 ms lookahead delay; `level=disabled` stops `alimiter` riding the gain itself. Delete `ln.json` after.

Tested on ffmpeg 6.1 with three sparse picture-led exports (cue-led sound, no music or VO; synthesised tones, crest factor under about 12 dB, so not recorded clicks: those take the next section):

| Source | Target | Ceiling | `normalization_type` | Result after AAC |
|---|---|---|---|---|
| −21.0 LUFS, LRA 5.7 | −16 / −1 | −7.0 dBFS | linear | −16.1 LUFS, −1.9 dBTP, LRA 5.2 |
| −23.4 LUFS, LRA 2.2 | −16 / −1 | −9.4 dBFS | linear | −15.9 LUFS, −1.6 dBTP, LRA 2.2 |
| −23.4 LUFS | −14 / −1 | −11.4 dBFS | linear | −13.9 LUFS, −1.7 dBTP |
| −20.6 LUFS, LRA 7.7 | −16 / −1 | −6.6 dBFS | linear | −15.8 LUFS, −1.5 dBTP, LRA 7.5 |

The first source through the old fixed −4 dBFS limiter to −14 gave `dynamic`. On a speech + impacts export at −15.3 LUFS / −1.5 dBTP the fixed limiter is enough (−14.1 LUFS, −1.7 dBTP, linear): there the formula gives about −3.5 dBFS anyway.

If it still reports `dynamic`: recompute `C` from the new measurement and rerun; on speech-led pieces a residual `dynamic` is acceptable (light limiting); on a music-led piece whose build matters, re-shape the music with the staircase recipe (SKILL.md, Pre-master what the SFX sit on) and export again. A linear master keeps the source's LRA, so an LRA under 3 LU after it was already in the mix: fix the bed, not the master.

## Mastering a sparse film of real transients

Recorded clicks, keys, taps and switch snaps carry a 15–27 dB crest factor (sample peak over the loudest 50 ms RMS; measured on the CC0 library's keys, mouse clicks and switch). A sparse film of them has a peak-to-loudness ratio of 20–24 dB, and −14 LUFS at −1 dBTP allows 13, so the master has to take 10–20 dB off the transients. The computed-ceiling recipe above does it badly on these files: its 5 ms attack lets a 2 ms click straight through, `loudnorm` falls back to `dynamic`, and on a 15 s test it landed at −16.3 LUFS with true peak −0.2 dBTP. No noise bed goes under it (SKILL.md, the noise-bed ban): master the cue stem itself.

1. **Trim each hot cue before placing it.** Crest over 12 dB: a fast limiter at the loudest 50 ms RMS + 12 dB. Give every cue its natural tail and fade its last 80–150 ms, so nothing ends in a truncation.
2. **Build the stem in the final channel layout** (stereo for every feed; the library files are mono, so `aformat=channel_layouts=stereo` on each cue) at the role levels: the hit loudest, the logo ≥ 2 dB under it, action cues 5–6 dB under the hit, pings and ticks under the action cues they bracket, repeated keys 10–11 dB under the hit (the limiter narrows these gaps by 3–5 dB). **Measure the stereo file**: a mono stem mastered and then panned to stereo reads **+3 LU** louder (−14.2 → −11.3 LUFS, and −13.5 → −10.7, on two makers' films).
3. **Master the stem itself**: linear gain, then a 4× oversampled sample-peak limiter at **−3.5 dBFS** (oversampling makes it a true-peak limiter; −3.5 leaves room for the AAC encode after 15–20 dB of limiting), encode, measure. The first step adds 1.0× the shortfall; each later step adds the shortfall × the gain-per-LU the last pass measured, clamped to 1–3 (the limiter eats more of the gain as it works, so a fixed step crawls, and a fixed 1.5× went backwards on a sparse stem: −15.4 → −15.7). **At most 4 passes**; the silence between cues is under the absolute gate, so the reading is stable once the stem itself is what you master.
4. **Measure the result**: −14 ± 1 LUFS, LRA 4–10 LU, true peak ≤ −1 dBTP, the cue hierarchy read on this file, not the pre-master mix, and no tail cut off. If four passes leave it more than 1 LU short, the film is too sparse for a feed: add the product's own small sounds on its visible events and let the hit ring, rather than limiting harder.

A bed, when there is one (music, or a tonal pad: `sfx-cues.md`), goes into the stem before step 3 and is shaped per section (out for the breath, lighter after the peak). Keep it 6–9 LU under the cue stem's integrated loudness and shaped: measured on the stem below, a shaped pad 6 LU under gave LRA 4.1 LU and 9 LU under gave 3.9; a steady, unshaped pad on a sparser stem squeezed the LRA to 2.7–2.8 LU. Re-measure after adding it: a bed loud enough to dominate the gating makes the gain loop chase the bed instead of the cues.

```
# 1. trim one cue (repeat per file), stereo, its tail faded over the last 120 ms; crest = sample peak - loudest 50 ms RMS
F=assets/click-mouse-1.mp3
P=$(ffmpeg -nostdin -i $F -af astats=measure_perchannel=none -f null - 2>&1 | awk -F: '/Peak level dB/{v=$2} END{print v+0}')
R=$(ffmpeg -nostdin -v error -i $F -af "asetnsamples=n=2400:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - | awk -F= '/RMS_level/{if($2!="-inf"&&(m==""||$2+0>m))m=$2+0} END{print m}')
LIM=$(awk -v p=$P -v r=$R 'BEGIN{c=p-r; printf "%.4f", 10^((c>12?r+12:p)/20)}')
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $F </dev/null)
ffmpeg -nostdin -y -v error -i $F -af "aresample=48000,aformat=channel_layouts=stereo,adelay=10:all=1,alimiter=limit=$LIM:attack=0.1:release=15:level=disabled:latency=1,atrim=start=0.01,asetpts=PTS-STARTPTS,afade=t=out:st=$(awk -v d=$D 'BEGIN{print (d>0.12?d-0.12:0)}'):d=0.12" assets/click-mouse-1-trim.wav
# 3. master the stereo cue stem itself: damped secant gain loop, at most 4 passes, measured on the encoded file
TI=-14; TP="aresample=192000,alimiter=limit=0.668:attack=0.1:release=40:level=disabled:latency=1,aresample=48000"
LU(){ ffmpeg -hide_banner -nostats -i $1 -af ebur128 -f null - 2>&1 | awk '$1=="I:"{v=$2} END{print v}'; }
PI=$(LU assets/cue-stem.wav); G=$(awk -v t=$TI -v i=$PI 'BEGIN{print t-i}'); PG=0
for n in 1 2 3 4; do
  ffmpeg -y -v error -i assets/cue-stem.wav -af "volume=${G}dB,$TP" -ar 48000 -c:a aac -b:a 192k assets/master.m4a
  I=$(LU assets/master.m4a); echo "pass $n: +$G dB -> $I LUFS"
  awk -v t=$TI -v i=$I 'BEGIN{exit !(i-t<0.3 && t-i<0.3)}' && break
  K=$(awk -v g=$G -v pg=$PG -v i=$I -v pi=$PI 'BEGIN{k=(i-pi)!=0?(g-pg)/(i-pi):1; if(k<1)k=1; if(k>3)k=3; print k}')
  PG=$G; PI=$I; G=$(awk -v g=$G -v t=$TI -v i=$I -v k=$K 'BEGIN{print g+k*(t-i)}')
done
# 4. measure, then mux onto the picture
ffmpeg -hide_banner -nostats -i assets/master.m4a -af ebur128=peak=true -f null - 2>&1 | grep -A14 Summary | grep -E " I:|LRA:|Peak:"
ffmpeg -y -i out.mp4 -i assets/master.m4a -map 0:v -map 1:a -c copy -movflags +faststart out-master.mp4
```

`-nostdin` matters when the trim runs inside a `while read` loop over a cue list: without it ffmpeg swallows the list and most cues silently go missing.

Tested on ffmpeg 6.1 with a 15 s stereo stem of 23 real CC0 cues and no bed: a tap, two runs of four laptop keys, two mouse clicks, a switch, two pops, a tick, a glass tink, a toggle, a tap, a soft thud, a chime + thud as the hit at 10.5 s and a low bell as the logo at 12.5 s (stem levels, loudest 50 ms RMS: hit −11.6, logo −15.5, taps and clicks −19 to −21, keys −25 dB). Stem −24.1 LUFS; passes −17.8 → −15.7 → −14.4 → −14.2; the master **−14.2 LUFS, LRA 5.4 LU, −3.0 dBTP after AAC**; on it the hit −6.3 dB, the logo −8.3 (2.0 dB under), the tink and thud −8.5 to −9.9, taps and clicks −13.2 to −14.8, keys −15.4. The same stem through a fixed 1.0× step crawled: −17.8 → −16.4 → −15.7 after three passes. With a tonal pad shaped under it (out at the breath, ×0.6 after the peak): −13.9 LUFS, LRA 4.1 LU, −2.0 dBTP, the hit 3.4 dB over the logo. The gaps between cues are true silence after decayed tails; the one fault the test found was the 0.29 s library chime on the hit, whose tail stops 1.7 s before the logo: give the hit a longer-tailed take or a layered bell so it rings into the next beat. Delete the intermediate files after.

The per-cue trim is the cheap half: without it the same mix needed more limiting at the master and the keys and clicks lost more of their difference. Synthesised tones (crest under 12 dB) skip step 1.

## Sparse mixes: do the cues lead?

For a picture-led film of designed cues (SKILL.md, Sparse, picture-led films), with or without a bed (music or a tonal pad; never noise). Compare like with like: a cue's **loudest 50 ms RMS** against the bed's RMS in a cue-free stretch, and against the other cues.

```
# 50 ms RMS rows of the master (not the pre-master mix: the limiter changes the lead)
ffmpeg -v error -i out.mp4 -map 0:a -af "aresample=48000,asetnsamples=n=2400:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=assets/w50.txt" -f null -
# a bed: power-average of a cue-free window (here 3.0-4.0 s)
awk -F'[:= ]+' '/pts_time/{t=$NF} /RMS_level/{if(t>=3.0&&t<4.0&&$NF!="-inf"){s+=10^($NF/10);n++}} END{if(n)printf "bed %.1f dB\n", 10*log(s/n)/log(10); else print "no bed"}' assets/w50.txt
# a cue: the loudest 50 ms row in its window (here the cue at 4.6 s)
awk -F'[:= ]+' '/pts_time/{t=$NF} /RMS_level/{if(t>=4.5&&t<5.0&&(m==""||$NF+0>m))m=$NF+0} END{printf "cue %.1f dB\n", m}' assets/w50.txt
```

Pass: every cue ≥ 12 dB over the bed; the hit the loudest row of the film and the logo ≥ 2 dB under it; pings and ticks under the action cues they bracket; a beat bed's kick ≥ 6 dB under the hit and ≥ 3 dB under the cues on its beats. Measured on a film the bed swamped: bed −24.2 dB, cues −17.9 and −18.3 dB, a 6 dB gap. The fix is the bed (halve it twice: 0.5× is −6 dB), never the cues past the headroom. Then read LRA: 4–5 LU minimum, no more than about 12–14 LU for a film meant to be heard. A bed that holds the LRA under 4 is shaped (a dropout for the breath, a lighter section), not raised. Delete `w50.txt` after.

**Dead air**: print the momentary loudness (400 ms window) every 100 ms and list every stretch under −40 LUFS longer than 2 s. Use M, not the 3 s short-term S: S lags, and reads −120 for the first 3 s while its window fills.

```
ffmpeg -v error -i out.mp4 -map 0:a -af "ebur128=metadata=1,ametadata=print:key=lavfi.r128.M:file=assets/st.txt" -f null -
awk -F'[:= ]+' '/pts_time/{t=$NF} /r128.M/{if(t<0.4)next; v=$NF+0; if(v<-40){if(s=="")s=t} else {if(s!=""&&t-s>2)printf "quiet %.1f-%.1f s\n",s,t; s=""}} END{if(s!=""&&t-s>2)printf "quiet %.1f s-end\n",s}' assets/st.txt
```

Every printed stretch is either the named silence in `VIDEO.md` (≤ 1.5 s of picture breath, or a sting's designed gap) or a fault: give its visible events cues, or let the cue before it ring. Never fill it with noise. Tested: a 4 s gap of near-silence between two tones printed `quiet 5.3-9.0 s`. Delete `st.txt` after.

**Abrupt cut-offs** (the sub-second half): a gap is fine after a tail that decays; a tail cut into zero is not (a 0.8 s zero-hole straight after a payoff cue's truncated tail was judged a broken file, twice on one wallet film). List the silences and look at the 50 ms rows just before each one: the level should fall over at least 2–3 rows (100–150 ms), never drop from a cue's level to `-inf` in one row.

```
ffmpeg -hide_banner -nostats -i out.mp4 -map 0:a -af silencedetect=noise=-60dB:d=0.3 -f null - 2>&1 | grep -E "silence_start"
awk -F'[:= ]+' -v s=10.68 '/pts_time/{t=$NF} /RMS_level/{if(t>=s-0.2&&t<s+0.05)printf "%.2f %s\n", t, $NF}' assets/w50.txt
```

Replace `s` with each printed `silence_start`. Fix a cliff with a fade over the cue's last 80–150 ms or a longer-tailed take, never with a bed.

The loop: export → `ebur128` → off by more than 1 LU or true peak above −1 dBTP? re-master as above (or scale every clip `volume` by the difference, ×1.12 per +1 dB, and pull the loudest overlapping clips down) → measure again.

## One dense track that has to carry the film alone

A single music clip at 1.0 with a high crest factor can measure −17 LUFS with peaks already at −0.7 dBTP: no `volume` reaches −14 without breaking −1 dBTP, and there are no other clips to pull down. Pre-master the cued section before placing it (cue it first with `-ss`/`-t`, so the measurement is of what plays):

```
ffmpeg -ss 30.0 -t 30.2 -i assets/track.mp3 -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null -
ffmpeg -ss 30.0 -t 30.2 -i assets/track.mp3 -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=<input_i>:measured_TP=<input_tp>:measured_LRA=<input_lra>:measured_thresh=<input_thresh>:offset=<target_offset>:linear=true" -ar 48000 assets/track-cue.wav
```

If pass 2 falls back to `dynamic` (light limiting), that is acceptable for a steady music-only promo, where the loudness range is small anyway. It is **not** acceptable when the track's dynamics are the design (a trailer score, a slow build): `dynamic` compressed one score cue's LRA from 9.2 to 6.6 LU and lifted its quiet act to the climax's level. Use the volume staircase + `alimiter` recipe in SKILL.md instead. Place `track-cue.wav` at 1.0 with `startFrom` 0, and measure the export as usual.

When SFX will sit on the track (accents, hits), pre-master it to `I=-15:TP=-3` instead, place the accents at ≤0.7, and re-master the export as above.
