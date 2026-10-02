---
name: sound-design
description: "Music, sound effects and the voiceover mix for every kind of video in the pack: the four-decision sound plan, choosing and legally sourcing a track (user file, a connected generator, CC0 or CC BY libraries, or no music), the beat grid in frames and cutting to it, the level ladder in gain and dB, ducking, fades, SFX placement to the frame, silence as a beat, and measuring the export's loudness because the mix has no limiter. Load it whenever a video has sound."
---

# Sound design

Half of what a viewer reads as "polish" is sound arriving on the right frame at the right level. This skill holds the shared numbers for music, SFX and the VO mix; owner skills cite it and only state their deviations.

## When to use

Load it for any video that will have audio: motion promos, launches, explainers, brand stings, UGC and social ads, and edited footage (podcast clips, talking heads, trailers, Gen Z edits). Load it again when a user says the music is too loud, the voice is buried, the cuts feel off the beat, or the export is quiet or distorted.

Skip it only for a deliberately silent piece (a muted GIF-style loop). Even then, read "Design for muted autoplay" below.

The direction comes first: the `direction` skill decides intent, the energy curve and whether sound is on. This skill turns that into a cue sheet.

## The timeline you are mixing on

Know these units before placing anything, because they differ per field.

| Field | Unit | Note |
|---|---|---|
| `startFrame`, `durationInFrames` | frames | where the clip sits on the film |
| `startFrom` | **seconds** into the source file | trim heads and cue into a section: bar N = `firstDownbeatSec + (N-1) × 4 × 60/BPM` |
| `volume` | linear gain 0–2 | 1 = unity, 2 = +6 dB ceiling; one static value per clip, no keyframes |
| `fadeInFrames`, `fadeOutFrames` | frames | linear ramps from each end; if they overlap both shrink together |
| `track` | 0–3 | lane plan: 0 VO, 1 music, 2 SFX A, 3 SFX B / ambience; overlapping clips need separate lanes |
| scene `audio` + `audioVolume` | file + gain 0–2 | a scene's voiceover, played from the scene's first frame |

Place clips with `place-audio`. On a HyperFrames project the same thing is an `<audio id src data-start data-duration data-volume data-media-start>` element (start, duration and media start in seconds); a volume tween on the timeline (`tl.to("#bgm", { volume: 0.2, duration: 0.2 }, t)`) is honoured by the export, so there you can automate ducking directly.

The export sums every clip with `amix normalize=0` and **no limiter or loudness stage**. Coinciding peaks add, so headroom is your job and the export must be measured (see Checks).

## The sound plan: four decisions

Make these before generating or fetching any audio, and write the answers into `VIDEO.md` under the Direction's sound plan.

1. **Music or not.** Pick one mode and write it down, because the levels and who decides the cuts follow from it:
   - **Music-led** (no voice: a promo, a text-led explainer, a music-led Gen Z edit): the track at 1.0 is the film. The music decides the cuts. Find its drop or dropout and put it on the film's breath, and its return on the peak frame (`direction`'s energy curve).
   - **VO-led** (generated narration): a bed under the voice, per the ladder below. The voice decides the timing.
   - **Over speech** (edited footage: talking head, podcast clip, UGC talk, a Gen Z edit of someone talking): the speech decides the cuts, because a beat-grid cut would land mid-word. The bed sits under the voice per the ladder, and drops to silence under the hook line and the payoff.
   - **SFX-led** (no music, dense literal sound) or **speech only** (a full podcast episode: no music under talk).
2. **Sync points.** List the 3–7 moments that matter: frame 1, the hook, the reveal, the logo, the CTA. For each pick one treatment: music event (drop, downbeat, button), `sfx`, silence, or nothing.
3. **SFX density.** Literal (≈1 cue per second, every event makes a sound), punctuated (0.25–0.5/s, hero moments plus consistent cut treatment), or minimal (1–3 cues in the whole film, VO carries it).
4. **VO.** Is there narration, whose voice (`pick-voice`, `voiceover`), and does it start +3 to +8 frames after each cut (house median +6) so the eye lands before the ear?

**Order of work: VO → music → SFX → mix → measure.** VO timing fixes the music edit, the music grid fixes the cuts, the cuts fix the SFX.

### Design for muted autoplay

Most feeds autoplay muted. Captions and on-screen type must carry the meaning; sound is the reward for unmuting, never the only carrier of a claim. Frame 1 is never silent once the viewer does unmute: start on a transient or a downbeat, never a fade in from nothing.

## Music

### Choosing

| Format | Feel | BPM | Shape |
|---|---|---|---|
| Launch / hype promo | electronic pop, driving indie, real drums | 110–128 | intro → build → drop on the reveal → button |
| Explainer with VO | light electronic, plucks, lo-fi, sparse | 90–110 | flat and steady, no lead melody |
| Brand sting | a 2–4 s motif or riser into a hit | n/a | one gesture ending on a button |
| UGC / social ad | trend-adjacent pop, hip-hop, house | 95–130 | energy on frame 1, then loop |
| Trailer / teaser | hybrid orchestral, pulses, braams | 60–90 rising to 120–140 | three acts, silence, title hit |
| Gen Z edit, music-led (no speech) | phonk, house, drill | 130–160 (or 65–80 half-time) | cuts on beats or half bars, not every beat for 30 s |
| Gen Z edit over speech | lo-fi, house, phonk under talk | any | speech decides the cuts; the bed sits under it |
| UI demo | minimal tech, soft house | 100–120 | steady, room for clicks |
| Emotional brand film | piano, strings, ambient | 60–90 | one slow swell, long tail |

Rules that hold everywhere: **instrumental under any voice** (lyrics fight speech for intelligibility); prefer tracks with audible section boundaries and a clean ending "button" (final hit plus a short tail), because a track that fades out on its own master cannot end on picture; know the BPM before cutting.

### Getting a track: the decision ladder (`music`)

Go down the ladder and stop at the first rung that works. Read `references/music-sources.md` for the full library and service tables, licences and prices.

1. **The user's own file.** Ask once whether they have a track or a licence (Epidemic, Artlist, a composer). Put it in `assets/` and place it.
2. **A connected generator.** ElevenLabs Music (exact length, instrumental mode, composition plans) through the `elevenlabs` connector, or Stable Audio / MusicGen / Lyria through `fal` or `replicate`. If none is connected, offer one with `recommend-integration` (ElevenLabs first: the same account covers voice and SFX). Prompt pattern:
   > "Instrumental, no vocals. Upbeat electronic pop, 120 BPM, 4/4. 30 seconds: 4-bar soft intro, 8-bar build with rising synths, a drop at 0:12, steady groove, ending on a single hard hit with a 2-second tail (a button, no fade out)."

   Always state: instrumental, genre and instruments, an exact BPM (pick one with whole frames per beat, below), total length (the film plus 2–3 s), section timing, and the ending. Generate 2 takes, pick by ear on the hero moment.
3. **A licensed free library**, found with `web-research` and fetched with `save-asset`: Openverse audio filtered to `cc0,pdm,by`, Jamendo filtered to CC BY / CC BY-SA, Free Music Archive (check each track), Incompetech (CC BY 4.0, credit verbatim), Freesound for SFX (CC0 or CC BY only).
   Do not use: YouTube Audio Library "YouTube licence" tracks outside YouTube; BBC Sound Effects in anything commercial (personal and educational licence); any NC licence in a commercial video; soundboard rips of meme sounds; commercial songs; unofficial Suno or Udio wrappers. Pixabay music is usable but some tracks are registered with Content ID, so warn the user before a YouTube upload. Brand accounts on TikTok add trending audio in-app from the Commercial Music Library.
4. **No music.** Carry the film on `sfx`, room tone and designed silence. A clean SFX-led film beats an unlicensed song.

**Credits.** Write a line into `VIDEO.md` for every audio file not generated by the user's own account: title, creator, source URL, licence, and the exact attribution text the licence demands. Tell the user where it has to appear (description or end card).

## Beat grid

`frames per beat = fps × 60 / BPM`; a 4/4 bar is 4 beats; a phrase is 4 or 8 bars.

| BPM | @24 | @25 | @30 | @60 | bar @30 |
|---|---|---|---|---|---|
| 90 | 16 | 16.67 | **20** | 40 | 80 |
| 100 | 14.4 | **15** | 18 | 36 | 72 |
| 110 | 13.09 | 13.64 | 16.36 | 32.73 | 65.5 |
| 120 | **12** | 12.5 | **15** | 30 | 60 |
| 128 | 11.25 | 11.72 | 14.06 | 28.13 | 56.3 |
| 140 | 10.29 | 10.71 | 12.86 | 25.71 | 51.4 |
| 150 | 9.6 | **10** | **12** | 24 | 48 |

Whole-frame tempos at 30 fps: 60, 72, 90, 100, 120, 150, 180. When you generate music, ask for one of those so the grid sits on frames. Beat k lands at `round(offset + k × fps×60/BPM)`; round each beat from the exact value, never accumulate rounded beats (they drift a frame every few bars).

Cutting rules:
- **Big changes on beat 1 of a phrase**, ordinary cuts on beat 1 of a bar, montage cuts every beat. A visual hit may be 1 frame early, never late, because late sound reads as lag.
- **Risers end exactly on the drop frame**, 1, 2 or 4 bars long.
- **Edit the track only at phrase boundaries**, downbeat to downbeat, with a 30 ms crossfade (longer only for pads and tails). **Back-time the ending**: put the track's real button on the film's last frame first, then join from an earlier phrase. The button lands on the logo or CTA and the tail rings 1–3 s over the end card.
- **Cue in with `startFrom`** so the first audible frame is a downbeat or a strong section, not the track's quiet intro (one house template starts its track at 17.05 s for exactly this).
- **Peak alignment vs back-timing.** With one unedited stretch of a track you can land its drop on the peak frame *or* its button on the last frame, not both. The peak wins (it is the memorable moment). Then either edit the track (join from the drop's phrase to a phrase that ends on the button: the recipe below), or end on a 30–45 f fade on a bar line while the picture holds. A library track with no drop: search the onset dump below for a natural dropout followed by a hit, and cue the track so that hit lands on the peak frame.

Edit to length with `ffmpeg` (inline, nothing saved as a script):

```
ffmpeg -i assets/track.wav -filter_complex "[0:a]atrim=0:8,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=24,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=0.03:c1=tri:c2=tri[out]" -map "[out]" assets/track-edit.wav
```

**Unknown BPM.** Prefer metadata or the BPM you generated with. Otherwise dump a low-passed energy curve and read the kick onsets:

```
ffmpeg -i assets/track.wav -af "lowpass=f=150,aresample=48000,asetnsamples=n=480:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=assets/rms.txt" -f null -
```

Each 10 ms row has a `pts_time` and an RMS level. Onsets are rows where the level jumps 6 dB or more over the previous row; the first strong one after the intro is usually beat 1. BPM = 60 ÷ the median gap between onsets. Treat ×2 and ÷2 as the same answer and pick by genre (a 174 BPM track often reads as 87). Delete `rms.txt` after. On sparse or ambient music there is no trustworthy grid: cut on phrases and swells instead of forcing a metronome.

## Mix

### Level ladder

These are the house levels, with each source normalised first (below) so the gains mean the same thing every time. **This is the pack's one level table**: owner skills cite it rather than carry their own bed numbers.

| Layer | `volume` | dB | Why |
|---|---|---|---|
| VO or recorded speech | 1.0 | 0 | the anchor; nothing else wins against it |
| Music alone (no voice): music-led promo, text-led explainer, music-led Gen Z | 1.0 | 0 | the track is the film; drop it on the breath, bring it back on the peak |
| Music under SFX only | 0.5–0.6 | −6 to −4.4 | leaves room for hits |
| **Music bed under any voice** | **0.1–0.2** | **−20 to −14** | default 0.18 (−15) for a sparse bed under generated VO; 0.12 (−18) for a dense track (drums, bright synths) under recorded speech; a dense track low-passed at 6–8 kHz can sit at 0.16–0.2 |
| Podcast clip | none, or 0.1 | −20 | talk carries it |
| UI clicks / taps | 0.8–1.0 | −2 to 0 | short and bright, they cut through |
| Impacts / slams | 0.7–0.85 | −3 to −1.4 | felt, not louder than VO |
| Whooshes | 0.5–0.7 | −6 to −3 | air, not a hit |
| Risers / swells / rings | 0.55–0.6 | −5 to −4.4 | |
| Pops / ticks | 0.45–0.55 | −7 to −5 | many of them, so each is quiet |
| Room tone / ambience | 0.03–0.1 | −30 to −20 | felt only in the gaps |

`gain = 10^(dB/20)`; halving is −6 dB, ×0.7 is −3 dB. Full table in `references/mix-and-loudness.md`.

**The bed rule, as a measurement:** the bed sits **14–20 LU under the voice**. More than 20 LU down is inaudible on a phone speaker (a −21 LU bed was judged "no music" in testing); less than 14 starts to mask consonants. With both sources normalised to −16 LUFS the gap is simply `−20·log10(volume)` (0.1 → 20, 0.12 → 18.4, 0.18 → 15, 0.2 → 14); with un-normalised sources it is `voice LUFS − (bed LUFS + 20·log10(volume))`. Low-pass a busy bed under talk (`lowpass=f=7000` when you normalise it) rather than burying it.

**Normalise sources first**, because generated and library files arrive anywhere from −8 to −30 LUFS and a `volume` on an unknown file means nothing. VO and music to −16 LUFS, SFX to a −3 dBFS peak:

```
ffmpeg -i assets/vo-raw.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000 assets/vo.wav
```

For an SFX, read `max_volume` from `ffmpeg -i in.wav -af volumedetect -f null -` and apply `volume=<−3 minus that>dB`.

**One dense track that must carry the film alone** (music-led, no other clips) often cannot reach −14 LUFS by `volume` without its peaks passing −1 dBTP, and the export has no limiter. Pre-master the cued section with a two-pass `loudnorm` to `I=-14:TP=-1.5` (it may report `dynamic`, which is light limiting and fine here), then place it at 1.0. Commands in `references/mix-and-loudness.md`.

### Ducking

House default: **no ducking**, a constant bed per the ladder (0.1–0.2) under the voice. Duck only when the bed should come up to about 0.8 between lines (pauses of 1.5 s or more). Duck per sentence, never per word, or it pumps.

- **Split the bed** into clips at VO phrase boundaries on alternating lanes 1 and 3, overlapping 4–8 frames, fading down over 4–8 frames and back up over 10–20.
- **Pre-render a ducked bed** with `ffmpeg` `sidechaincompress` (ratio 4–10, attack 20–80 ms, release 300–1000 ms) keyed by the VO laid out at its timeline positions; place the result at 1.0. Recipes in `references/mix-and-loudness.md`.
- **HyperFrames**: tween the `<audio>` volume down over ~0.2 s and back over ~0.4 s.

### Fades

| Clip | Fade |
|---|---|
| Bed in | ~15 f (house range 4–30); 0–1 f when it starts on a downbeat |
| Bed out, music-only ending | 15 f, or none when it ends on a button |
| Bed out under VO | 30–45 f; split a long bed so the fade sits at the true end |
| Any mid-phrase music start or stop | at least fps/2 frames (0.5 s), so it never clicks or lurches |
| SFX transients | no fade in; fade out 2–12 f only if trimmed mid-tail (clicks 2, ticks 4, pings 8, long SFX 10–12) |
| VO | 2–3 f each end, never clipping the first consonant |

### Headroom and loudness

Because the export has no limiter: keep every source peak at or below −3 dBFS; never stack a sub drop, a braam and a music drop at full gain on one frame (split the music clip and drop it 3–6 dB on the hit, or let the SFX carry it).

Default delivery: **−14 LUFS integrated, −1 dBTP** for everything online (YouTube, TikTok, Reels, Shorts, web), music-led edits included: louder buys nothing once platforms turn it down. Podcast feeds −16 LUFS; EBU broadcast −23; US broadcast −24 / −2 dBTP. Measure every export:

```
ffmpeg -hide_banner -nostats -i out.mp4 -map 0:a -af ebur128=peak=true -f null -
```

Pieces under about 6 s (stings, bumpers) are the exception: judge them by true peak (−1 to −3 dBTP) rather than integrated loudness. Otherwise, if integrated loudness is off by more than 1 LU, scale every clip volume by the difference, or re-master the export with a two-pass `loudnorm` (`linear=true`, always `-ar 48000` or it outputs 192 kHz; the video stream is copied). Commands in `references/mix-and-loudness.md`.

## SFX

Placement is frame-exact and comes from the same constants the animation uses (scene start + keyframe), never guessed. If a sound is tied to an element, its visual onset must be a defined frame, not the tail of a spring.

| Cue | Lands | Level |
|---|---|---|
| Whoosh on a cut | starts ~4 f before the cut (house) so its peak hits the cut | 0.5–0.7 |
| Whoosh on a wipe or flood | starts on the wipe's first frame (3–24 f before the cut) | 0.5 |
| UI click / tap | the press frame, 0 f (up to 1 f early) | 0.8–1.0 |
| Message / bubble | its first visible pixel | 0.75–0.9 |
| Impact / slam / logo lock | the contact frame (motion stops), ±2 f | 0.7–0.85 |
| Pop on arrival | the arrival frame | 0.45–0.55 |
| Ring / chime | on the cut or the success frame | 0.6 |
| Riser | ends on the reveal frame: `startFrame = reveal − length` | 0.55–0.6 |

**Layer hero hits**: a transient (snap, 2–5 kHz, carries on phones) + a body (thump, 100–500 Hz) + a tail (reverb, rumble, sub drop), transients on the same frame. A sub drop alone is inaudible on a phone.

**A riser into a hit is a level relationship, not two volumes.** The ladder's gains assume peak-normalised files, but a riser's tail is dense and a hit is short, so riser 0.55 + impact 0.8 can leave the hit only 1–4 dB above the riser (measured), and it doesn't punch. Verify it: the impact's first 10 ms RMS is **≥8 dB above the riser's last 100 ms**, and the riser's 50 ms RMS rises with **no dip over 6 dB** before its end (commands in `references/sfx-cues.md`). If the hit is short of 8 dB, lower the riser (usually to 0.3–0.4), never raise the impact past the headroom. Sound-on pieces give the anticipation sound too (ticks, an air bed, a whoosh): **never open on more than 0.5 s of silence**.

**Density**: about 1 cue per second at most, and only for UI-dense literal films; 0.25–0.5/s for most promos. One sound per event that matters, not one per event. Treat hard cuts consistently: all get a quiet swish or none do. At most 2 SFX at once, none over a VO word that carries meaning. Repeats of one file alternate lanes and vary level by ±0.04 (0.42 / 0.46 / 0.5) so they never stack identically.

**Getting them (`sfx`)**: describe the sound, not the picture: source, material, size, speed, envelope, tail, length, "one-shot", "no music". Use the model's own words: impact, whoosh, riser, braam, glitch, drone, ambience, loop. Set a duration (0.5–30 s) for anything timed, and loop mode for ambience. Generate 2–3 takes of hero sounds. Example: "tight punchy impact, a sharp snap layered with a deep thud, very short tail, one-shot, 0.6 seconds". Prompt library in `references/sfx-cues.md`.
Fallback when `sfx` is unavailable, in order: the user's files; CC0 sounds from Freesound or Openverse via `web-research` + `save-asset` (credited); **synthesised placeholders** made with `ffmpeg` (riser, impact, whoosh, pop, tick, chime: tested recipes with safe levels in `references/sfx-cues.md`), recorded in `VIDEO.md` as placeholders and named as such to the user, because a sine-and-noise sound reads as a test tone next to a designed one; or let the music's own transients mark the moment. A sparse set of synthesised cues beats a silent Gen Z edit or sting.

## Silence and endings

- **Dropout before the reveal**: stop or cut the music 1–2 beats (0.25–1 s) before the reveal, then slam back with the hit and the downbeat. The silence is the effect.
- **Trailer title**: riser → hard cut to 0.5–1.5 s of silence → title hit (braam + sub) → tail.
- **Room tone, not digital zero**, under quiet VO stretches; pure zero sounds broken on headphones.
- **Endings land on a button**: the logo or CTA frame is the track's last hit and the tail rings 1–3 s. No button: fade 1–3 s ending on a bar line while the picture holds.
- **Stings end on a sonic logo**: whoosh or riser into the lock-up (0.5–1.5 s) → impact on the settle frame → a 2–4 note tonal button → shimmer tail 1–1.5 s. About 3 s total.

## Format recipes

| Format | Music | SFX | VO and mix |
|---|---|---|---|
| Launch film | 110–128 BPM build-and-drop, drop on the reveal | 5–8 hero moments, swish per feature | bed per the ladder (0.18) under VO, 1.0 when music-only |
| Explainer with VO | 90–110 sparse, no melody | UI clicks ≤ 1 per 2–3 s, room tone | VO +6 f after cuts, bed 0.18 |
| Explainer, text-led (no VO) | music-led at 1.0, sparse, no lead melody | a cue on each reveal the diagram hinges on | dropout on the breath, return on the peak |
| Brand sting | a 3 s sonic logo or none | riser → impact on settle → tail; sound under the anticipation too | no VO; hit ≥8 dB over the riser tail |
| UGC / social ad | 95–130 trend-adjacent | transient on frame 1, swish on every jump cut or none | bed 0.12–0.2 under talk |
| Trailer | three acts, accelerating | braams on act breaks, riser → silence → title hit | VO lines in the gaps |
| Podcast clip | none under talk (or 0.1), optional 1–2 s sting | sparing pops on caption emphasis | dialogue −16 LUFS, deliver −14 for social |
| Talking head | intro, b-roll and section stings; bed 0.12–0.2 if any | swish on graphics and zoom punches | bed out under the key line |
| Gen Z edit over speech | lo-fi / house / phonk bed, 0.14–0.2, low-passed at 6–8 kHz | 3–6 cues per 30 s on interrupts (pop, whoosh, hit) | speech decides the cuts; bed out under the hook line and payoff |
| Gen Z edit, music-led | 130–160 phonk or house at 1.0, cuts on beats or half bars | one hit per joke | −14 LUFS like everything else |
| UI demo | none or 100–120 at 0.1 | a varied click per interaction, typing loop, success chime | room tone throughout |
| Milestone | music-led at 1.0 | a tick per count step (0.45), impact when the number lands | no VO |

Beat sheets, frame budgets and levels per format are in `references/format-recipes.md`.

## Requirements

| Need | Capability | Fallback |
|---|---|---|
| Music | `music` | the decision ladder above; with nothing licensed, no music |
| Sound effects | `sfx` | user files or credited CC0 sounds; else `ffmpeg`-synthesised placeholders (`references/sfx-cues.md`); else music transients |
| Narration | `voiceover` (+ `pick-voice`) | the user's recording, or type carries the words |
| Placing clips | `place-audio` | edit `project.json` `audio` or the HyperFrames `<audio>` elements |
| Normalising, editing, measuring | `ffmpeg` | none: an unmeasured export is not finished |
| Checking sync | `capture-frames` | step through the preview at the cue frames |
| Finding licensed audio | `web-research`, `save-asset` | ask the user for a file |

## Checks before you finish

1. `ebur128` on the exported file reports integrated loudness within ±1 LU of the target (−14 LUFS by default) and true peak at or below −1 dBTP. Report both numbers to the user.
2. No clipping: `volumedetect` `max_volume` below 0 dB.
3. Every SFX is on its frame: render `capture-frames` at each cue's frame and the frame before; the visual event (contact, first pixel, press, cut) is visible on the cue frame and not before.
4. The bed sits 14–20 LU under the voice (from the normalised levels, or measured): never louder than 0.2 under a voice line on normalised sources, and never so low it disappears. In the export, the momentary loudness in a ≥1 s speech pause is above −35 LUFS when a bed is meant to be there.
5. Frame 1 is audible (a transient or a downbeat): `silencedetect=noise=-50dB:d=0.5` on the export reports no `silence_start: 0`. The last picture frame lands on the music's button or inside a fade that ends on a bar line.
6. Every riser into a hit: impact's first 10 ms RMS ≥8 dB above the riser's last 100 ms; no dip over 6 dB inside the riser (`references/sfx-cues.md`).
7. Synthesised placeholder sounds are listed as placeholders in `VIDEO.md` and in your reply.
8. Big cuts sit on downbeats: for each, `(cutFrame − offset) ÷ framesPerBeat` is within 1 frame of a whole number.
9. No clip runs past the film's end unless it is a deliberate tail, and no long bed ends abruptly.
10. Every non-generated audio file has a credits line in `VIDEO.md` with its licence, and none is NC, BBC RemArc, YouTube-licence-only or a rip.
