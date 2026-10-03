---
name: sound-design
description: "Music, sound effects and the voiceover mix for every kind of video in the pack: the four-decision sound plan, choosing and legally sourcing a track (user file, a connected generator, CC0 or CC BY libraries, or no music), the beat grid in frames and cutting to it, the level ladder in gain and dB, ducking, fades, SFX placement to the frame, silence as a beat, sparse picture-led films and many-event stems, and measuring and re-mastering the export's loudness because the mix has no limiter. Load it whenever a video has sound."
---

# Sound design

Half of what a viewer reads as "polish" is sound arriving on the right frame at the right level. This skill holds the shared numbers for music, SFX and the VO mix; owner skills cite it and only state their deviations, and where an owner's number differs from one here (a sting's anticipation ticks, its first sound on its first motivated frame), the owner wins for that format.

Frame counts are at 30 fps; at 24 fps multiply them by 0.8 (the beat grid has its own 24 fps column). Times in seconds and milliseconds hold at any rate.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, never putting words in a real person's mouth, and the whoosh ban below. The checks at the end are a quality bar to clear, not a template to reproduce.

**Never use a whoosh.** No whoosh, swoosh, swish, swipe, air-sweep or "transition" noise-swell, in any film, generated, downloaded or synthesised: not on cuts, wipes, floods, camera moves, entrances or logo reveals. It is the sound that most marks a film as templated, and this pack bans it outright. A transition gets the sound of what happens in the picture (a click, a tap, a key, a tick, a soft thud or land on the settle, a pop, a tonal note on the beat), or nothing: most cuts are silent. This is a fixed rule like determinism, not a reference: it holds even when another skill, a template or a reference film seems to call for one, and only the user asking for one by name overrides it.

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

The export sums every clip with `amix normalize=0` and **no limiter or loudness stage**. Coinciding peaks add, and the AAC encode adds up to ~1 dB of true peak on top, so headroom is your job and the export must be measured (see Headroom and loudness, and Checks).

## The sound plan: four decisions

Make these before generating or fetching any audio, and write the answers into `VIDEO.md` under the Direction's sound plan.

1. **Music or not.** Pick one mode and write it down, because the levels and who decides the cuts follow from it:
   - **Music-led** (no voice: a promo, a text-led explainer, a music-led Gen Z edit): the track at 1.0 is the film. The music decides the cuts. Find its drop or dropout and put it on the film's breath, and its return on the peak frame (`direction`'s energy curve).
   - **VO-led** (generated narration): a bed under the voice, per the ladder below. The voice decides the timing.
   - **Over speech** (edited footage: talking head, podcast clip, UGC talk, a Gen Z edit of someone talking): the speech decides the cuts, because a beat-grid cut would land mid-word. The bed sits under the voice per the ladder, and drops to silence under the hook line and the payoff.
   - **Designed sound, picture-led** (no music and no VO: a muted-first launch, a calm hardware or data film carried by a handful of cues, or a film whose content is many sound events): the cues lead, any bed sits far under them, and the loudness target is lower (Sparse, picture-led films, below).
   - **Speech only** (a full podcast episode: no music under talk).
2. **Sync points.** List the 3–7 moments that matter: frame 1, the hook, the reveal, the logo, the CTA. For each pick one treatment: music event (drop, downbeat, button), `sfx`, silence, or nothing.
3. **SFX density.** Literal (≈1 cue per second, every event makes a sound), punctuated (0.25–0.5/s, hero moments plus consistent cut treatment), or minimal (1–3 cues in the whole film, VO carries it).
4. **VO.** Is there narration, whose voice (`pick-voice`, `voiceover`), and does it start +3 to +8 frames after each cut (house median +6) so the eye lands before the ear?

**Order of work: VO → music → SFX → mix → measure.** VO timing fixes the music edit, the music grid fixes the cuts, the cuts fix the SFX.

### Design for muted autoplay

Most feeds autoplay muted. Captions and on-screen type must carry the meaning; sound is the reward for unmuting, never the only carrier of a claim. Frame 1 is never silent once the viewer does unmute: start on a transient or a downbeat, never a fade in from nothing.

- **When the peak alignment fixes `startFrom`** (the track's dropout must sit on the breath), frame 1 lands mid-phrase: the alignment wins. Fade the music in over at least fps/2 frames *and* put a transient (a tick, the first reveal's cue) on frames 1–3, so frame 1 is still audible.
- **A sting's first sound may sit on its first motivated frame** (a tick on the first visible motion at frame 6) rather than an arbitrary frame-0 transient, as long as nothing is silent for more than 0.5 s.

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
- **Edit the track only at phrase boundaries**, downbeat to downbeat, with a 30 ms crossfade (longer only for pads and tails); beatless music (orchestral, ambient) has no downbeats, so join it inside a decay, both sides within 3 dB in the full band and above 4 kHz, with a 0.3–0.8 s equal-power crossfade under a picture transition (tested recipe: `references/mix-and-loudness.md`, Beatless music). **Back-time the ending**: put the track's real button on the film's last frame first, then join from an earlier phrase. The button lands on the logo or CTA and the tail rings 1–3 s over the end card.
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
| Soft lands / thuds on a settle | 0.5–0.7 | −6 to −3 | felt under the picture, not a hit |
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

**Pre-master what the SFX sit on.** When effects land on top of speech or music, pre-master that layer to **−15 LUFS / −3 dBTP** (not −14 / −1.5) before placing anything on it: an impact at 0.7–1.0 on a speech peak, plus the AAC encode's ~1 dB, otherwise pushes the export over −1 dBTP (measured: a −1.5 dBTP dialogue with three placeholder impacts exported at −0.8 dBTP; the same dialogue at −3 dBTP exported at −1.5). The export's re-master then brings it to −14 (Headroom and loudness).

| Mix | Pre-master the base layer | Place it at | Others |
|---|---|---|---|
| Speech + SFX (talking head, Gen Z, podcast clip) | dialogue −15 LUFS / −3 dBTP | 1.0 | bed per the ladder; SFX per the ladder, placeholders as `references/sfx-cues.md` says |
| **Music + sparse SFX** (a music-led promo, a text-led explainer, a launch with accents) | the cued music −15 LUFS / −3 dBTP | 1.0 | accents ≤0.7 (placeholders included); then re-master the export |
| Music alone (no other clips) | the cued section −14 LUFS / −1.5 dBTP, two-pass `loudnorm`, linear | 1.0 | none |
| **Music-led trailer or any piece whose loudness range is the design** | no `loudnorm`: automate a volume staircase, then limit peaks only (below) | 1.0 | hits ≤0.85; the staircase must survive |

**`loudnorm` falling back to `dynamic` compresses the loudness range**: on a trailer score it squeezed a 12 dB dropout to 8 dB and lifted Act 1 to the climax's level, the opposite of a staircase (measured: LRA 9.2 → 6.6 LU). For a music-led trailer, shape the build with volume automation (Act 1 0.6, Act 2 0.85, climax 1.0, ramps of 0.5 s), add the makeup gain, and limit the peaks only (`alimiter` with `level=disabled`, so it never rides the gain itself). Tested on a 45 s score cue: −14.9 LUFS, LRA 12.3 LU, sections at −20.5 / −17.8 / −11.8 LUFS, −1.4 dBTP, and −1.2 dBTP after AAC:

```
ffmpeg -i assets/score-cue.wav -af "volume='0.6+0.25*min(max((t-15)/0.5,0),1)+0.15*min(max((t-30)/0.5,0),1)':eval=frame,volume=3.5dB,alimiter=limit=0.79:attack=5:release=50:level=disabled" -ar 48000 -c:a pcm_s16le assets/score-stair.wav
```

`t-15` and `t-30` are the act boundaries in seconds of the cue; the `volume=3.5dB` is the makeup to land near −14 LUFS (adjust by the measured difference); `limit=0.79` is −2 dBFS sample peak, which leaves room for intersample peaks and the encode. Duck under a line by wrapping the staircase in parentheses and multiplying: `volume='(0.6+…)*(1-0.76*between(t,22.1,24.0))'` holds the music at 0.24 of its level under a line at 22.1–24.0 s (tested: 11 dB down). Commands for the other rows in `references/mix-and-loudness.md`.

### Sparse, picture-led films (designed cues, no music, no VO)

A film carried by 5–20 designed cues (and maybe an air bed) has no base layer to set the level, so the house −14 LUFS re-master lifts the bed instead of the cues and the mix becomes a flat "wall": measured on three such films, the bed ended up the loudest continuous thing in the film and the loudness range fell to 2–4 LU. Mix it the other way round:

| Rule | Number | Why |
|---|---|---|
| The cues lead | every designed cue's loudest 50 ms RMS ≥ **12 dB above the bed's RMS** in a cue-free 0.5 s window | at 5–8 dB the cues read as bumps in a drone; measure it (`references/mix-and-loudness.md`, Sparse mixes) |
| The bed | 0.05–0.15 (−26 to −16 dB) on a −16 LUFS-normalised file, low-passed at ≤ 4 kHz | air above 4 kHz reads as hiss once it is lifted; a bed is room, not content |
| Dynamics | loudness range **LRA 4–5 LU minimum, about 12–14 LU maximum** for a film meant to be heard (sound on, or a muted film's click-to-play version) | below about 3 LU the silences and the peak stop reading; above about 14 LU the quiet stretches sound broken or empty on unmute (measured: two judged films at 20–21 LU read as "near silent for the first quarter") |
| No dead air | outside a **named** silence (the breath, a designed dropout ≤ 1.5 s), the loudness never stays below **−40 LUFS for more than 2 s** (measured on the momentary 400 ms meter: the 3 s short-term window lags and hides a 4 s gap as 1 s); in a sound-on film the first 3 s carry audible cues on their visible events | a stretch of single-frame ticks over room tone measures as silence and plays as a fault; give it an audible bed (an air bed at 0.05–0.1) or cues that rise with the build |
| Delivery | **−16 to −18 LUFS integrated, true peak ≤ −1 dBTP** for a calm sparse film; −14 only if the cues still lead after the re-master | see the trade-off below |

**The trade-off, stated to the user:** YouTube and most feeds turn loud uploads *down* but do not reliably turn quiet ones *up* (YouTube never does; others vary), so a −17 LUFS film plays 3 dB quieter than a −14 neighbour. That costs a little apparent loudness on unmute and keeps the silence, the breath and the hit intact; pushing a sparse mix to −14 raises the bed into the cues. Choose −16 to −18 for calm films whose silence is part of the design, −14 for a picture-led film with dense, energetic cues. Write the choice and the measured LRA in `VIDEO.md`.

**Many sound events** (a jar filling with dozens of coins, a counter ticking a hundred times, a crowd of items landing): one sound per event becomes a wall and the identical repeats read as a machine gun. Build it as one stem from the scene's own event schedule, with five rules: seeded pitch and level variation per event (±0.5 semitone, ±1.5 dB, from a hash of the event index, never a random source); thinning (two events closer than 2 f are one sound); phrases (a gap of ≥ 8 f starts a new phrase; within a phrase the pitch walks up a scale, the phrase's first event +2 dB); a ceiling of 4 voices ringing at once; and a per-event level that falls as density rises (−10·log10(n) dB with n the voices sounding, so the summed loudness stays level). The first event, the last and any the picture isolates get full level. Tested recipe in `references/sfx-cues.md`, Many events.

### Ducking

House default: **no ducking**, a constant bed per the ladder (0.1–0.2) under the voice. Duck only when the bed should come up to about 0.8 between lines (pauses of 1.5 s or more). Duck per sentence, never per word, or it pumps.

- **Split the bed** into clips at VO phrase boundaries on alternating lanes 1 and 3, overlapping 4–8 frames, fading down over 4–8 frames and back up over 10–20.
- **Pre-render a ducked bed** with `ffmpeg` `sidechaincompress` (ratio 4–10, attack 20–80 ms, release 300–1000 ms) keyed by the VO laid out at its timeline positions; place the result at 1.0. Recipes in `references/mix-and-loudness.md`.
- **HyperFrames**: tween the `<audio>` volume down over ~0.2 s and back over ~0.4 s.

### Fades

| Clip | Fade |
|---|---|
| Bed in | ~15 f (house range 4–30); 0–1 f when it starts on a downbeat |
| Bed out, music-only ending | 15 f, or none when it ends on a button (frames at 30 fps; ×0.8 at 24) |
| Bed out under VO | 30–45 f; split a long bed so the fade sits at the true end |
| Any mid-phrase music start or stop | at least fps/2 frames (0.5 s), so it never clicks or lurches |
| SFX transients | no fade in; fade out 2–12 f only if trimmed mid-tail (clicks 2, ticks 4, pings 8, long SFX 10–12) |
| VO | 2–3 f each end, never clipping the first consonant |

### Headroom and loudness

Because the export has no limiter: keep every source peak at or below −3 dBFS, pre-master the base layer per the table above, and never stack a sub drop, a braam and a music drop at full gain on one frame (split the music clip and drop it 3–6 dB on the hit, or let the SFX carry it).

Default delivery: **−14 LUFS integrated, −1 dBTP** for everything online (YouTube, TikTok, Reels, Shorts, web), music-led edits included: louder buys nothing once platforms turn it down. A sparse, picture-led film may deliver at −16 to −18 LUFS (above). Podcast feeds −16 LUFS; EBU broadcast −23; US broadcast −24 / −2 dBTP. Measure every export:

```
ffmpeg -hide_banner -nostats -i out.mp4 -map 0:a -af ebur128=peak=true -f null -
```

Pieces under about 6 s (stings, bumpers) are the exception: judge them by true peak (−1 to −3 dBTP) rather than integrated loudness; if a sting lands under −3 dBTP, scale every clip together (×1.33 is typical with the owner's placeholder levels).

**The re-master is the standard last step**, not a rescue: whenever the export's true peak is above −1 dBTP or its loudness is off by more than 1 LU, re-master the exported file (the video stream copied, audio to AAC 192k, always `-ar 48000` or `loudnorm` outputs 192 kHz):

1. Measure the export's integrated loudness `I_measured` (`ebur128`).
2. Peak-limit at a **computed ceiling**, `ceiling_dBFS = target_TP − (target_I − I_measured) − 1` (the 1 dB covers intersample peaks and the encode), with `alimiter=…:level=disabled:latency=1`, so the gain that follows lands on target without pushing a peak over: a linear gain of `target_I − I_measured` dB then puts the loudest peak at `target_TP − 1`. A fixed −4 dBFS limiter is only right for a mix already within ~2 LU of target; a sparse mix that needs +5 to +9 dB falls back to `dynamic` with it (measured).
3. Two-pass `loudnorm` to `I=<target>:TP=<target_TP>:LRA=20` with `linear=true`, the limiter in both passes, feeding pass 1's measurements into pass 2.
4. **Print and record** pass 2's `normalization_type` (the command greps it). `linear`: done. `dynamic` on a speech-led piece: acceptable (light limiting). `dynamic` on a music-led or sparse piece: recompute the ceiling from the measured loudness and run again; on a music-led piece whose build matters, use the staircase + limiter recipe above instead.

Tested with the computed ceiling on three sparse picture-led exports (−21.0, −23.4 and −20.6 LUFS, needing +5 to +9.4 dB): all `linear`, landing at −16.1/−15.9/−15.8 LUFS (or −13.9/−13.8 at a −14 target), true peak −1.4 to −1.9 dBTP after AAC, LRA kept within 0.5 LU of the source; the fixed −4 dBFS limiter on the first of them gave `dynamic`. Commands in `references/mix-and-loudness.md`.

## SFX

Placement is frame-exact and comes from the same constants the animation uses (scene start + keyframe), never guessed. If a sound is tied to an element, its visual onset must be a defined frame, not the tail of a spring.

| Cue | Lands | Level |
|---|---|---|
| Hard cut | nothing (cuts are silent); a click if the cut is a UI action; or the music's beat | — |
| Wipe, flood or push | the picture's own event: a tap on the press that starts it, a soft land on its settle frame, or a tonal note on the beat; else nothing | 0.5–0.7 |
| UI click / tap | the press frame, 0 f (up to 1 f early) | 0.8–1.0 |
| Message / bubble | its first visible pixel | 0.75–0.9 |
| Impact / slam / logo lock | the contact frame (motion stops), ±2 f | 0.7–0.85 |
| Pop on arrival | the arrival frame | 0.45–0.55 |
| Ring / chime | on the cut or the success frame | 0.6 |
| Riser | ends on the reveal frame: `startFrame = reveal − length` | 0.55–0.6 |

**Layer hero hits**: a transient (snap, 2–5 kHz, carries on phones) + a body (thump, 100–500 Hz) + a tail (reverb, rumble, sub drop), transients on the same frame. A sub drop alone is inaudible on a phone.

**A riser resolves on the hit, never into a gap.** Every riser ends in something on its landing frame: a hit, a note (the sonic logo's first note), or the next bed's first transient blooming from that frame. Its last sample sits on that frame (`startFrame = hit − length`) and the resolving sound starts on that same frame; a riser with nothing after it is a bug: a riser that stops 1–3 f early, or a hit placed a few frames late, leaves a hole on the landing frame that reads as a dropout or a broken file, not as tension. Designed silence before a hit is a separate, deliberate beat (riser → hard cut to 0.5–1.5 s of room tone → hit, the trailer title), never an accident of placement; check it on the waveform (Checks 6).

**A riser into a hit is a level relationship, not two volumes.** The ladder's gains assume peak-normalised files, but a riser's tail is dense and a hit is short, so riser 0.55 + impact 0.8 can leave the hit only 1–4 dB above the riser (measured), and it doesn't punch. Verify it: the impact's first 10 ms RMS is **≥8 dB above the riser's last 100 ms**, and the riser's 50 ms RMS rises with **no dip over 6 dB** before its end (commands in `references/sfx-cues.md`). If the hit is short of 8 dB, lower the riser (usually to 0.3–0.4), never raise the impact past the headroom. Sound-on pieces give the anticipation sound too (ticks, an air bed, a tonal build): **never open on more than 0.5 s of silence**.

**Density**: about 1 cue per second at most, and only for UI-dense literal films; 0.25–0.5/s for most promos. Exception: a sting's anticipation ticks follow its swing (6 ticks in 1.2 s on a quickening swing is right); the owner's beat sheet wins there. One sound per event that matters, not one per event. Hard cuts are silent by default; a cut gets a sound only when something in the picture makes one (a press, a landing, the beat), and never a whoosh. At most 2 SFX at once, none over a VO word that carries meaning. Repeats of one file alternate lanes and vary level by ±0.04 (0.42 / 0.46 / 0.5) so they never stack identically.

**Getting them (`sfx`)**: describe the sound, not the picture: source, material, size, speed, envelope, tail, length, "one-shot", "no music". Use the model's own words: impact, click, tick, chime, riser (tonal), braam, glitch, drone, ambience, loop. Set a duration (0.5–30 s) for anything timed, and loop mode for ambience. Generate 2–3 takes of hero sounds. Example: "tight punchy impact, a sharp snap layered with a deep thud, very short tail, one-shot, 0.6 seconds". Prompt library in `references/sfx-cues.md`.
Fallback when `sfx` is unavailable, in order: the user's files; CC0 sounds from Freesound or Openverse via `web-research` + `save-asset` (credited); **synthesised placeholders** made with `ffmpeg` (riser, impact, pop, tick, chime, and a speech-like murmur for a crowd or a room of voices without words, never for one intimate voice: tested recipes with safe levels in `references/sfx-cues.md`), recorded in `VIDEO.md` as placeholders and named as such to the user, because a sine-and-noise sound reads as a test tone next to a designed one; or let the music's own transients mark the moment. A sparse set of synthesised cues beats a silent Gen Z edit or sting. A product whose output is sound (a soundscape, a sleep or music app) gets its own 2–4 s in the film with the score ducked 10–12 dB under it; with no recording, `references/sfx-cues.md` has a tested synthesised ambient bed (labelled a placeholder) and the command that turns it into per-frame amplitude for the drawn waveform.

## Silence and endings

- **Dropout before the reveal**: stop or cut the music 1–2 beats (0.25–1 s) before the reveal, then slam back with the hit and the downbeat. The silence is the effect.
- **Trailer title**: riser → hard cut to 0.5–1.5 s of silence → title hit (braam + sub) → tail. The climax before it peaks (loudest, densest in its last 2–3 s), never plateaus and stops.
- **A musical dropout may be longer than the picture's breath**: a library track's only clean dropout is often 2–3 s, while `direction`'s breath is 10–30 f. Keep the picture still for the breath only and keep it moving through the rest of the dropout, or the film stalls.
- **Room tone, not digital zero**, under quiet VO stretches and between clips; pure zero sounds broken on headphones. When one bed hands to another (a recording stops, the room takes over), overlap them 4–6 f, never butt them.
- **Endings land on a button**: the logo or CTA frame is the track's last hit and the tail rings 1–3 s. No button: fade 1–3 s ending on a bar line while the picture holds.
- **Stings end on a sonic logo**: a tonal build or ticks into the lock-up (0.5–1.5 s; a riser only if it is tonal, never a noise swell) → impact on the settle frame → a 2–4 note tonal button → shimmer tail 1–1.5 s. About 3 s total.

## Format recipes

| Format | Music | SFX | VO and mix |
|---|---|---|---|
| Launch film | 110–128 BPM build-and-drop, drop on the reveal | 5–8 hero moments, a click or tonal note per feature | bed per the ladder (0.18) under VO, 1.0 when music-only |
| Explainer with VO | 90–110 sparse, no melody | UI clicks ≤ 1 per 2–3 s, room tone | VO +6 f after cuts, bed 0.18 |
| Explainer, text-led (no VO) | music-led at 1.0, sparse, no lead melody | a cue on each reveal the diagram hinges on | dropout on the breath, return on the peak |
| Brand sting | a 3 s sonic logo or none | riser → impact on settle → tail; sound under the anticipation too | no VO; hit ≥8 dB over the riser tail |
| UGC / social ad | 95–130 trend-adjacent | transient on frame 1, nothing on jump cuts, a pop on caption keywords sparingly | bed 0.12–0.2 under talk |
| Trailer | three acts, accelerating; a volume staircase, peaks limited, never `loudnorm` on the cue | braams on act breaks, riser → room-tone silence → title hit | lines in the gaps, a cold-open line 6–10 LU under Act 1's music |
| Music + sparse accents | music-led at 1.0, pre-mastered −15 LUFS / −3 dBTP | ≤0.7, a few hero moments | re-master the export to −14 |
| Podcast clip | none under talk (or 0.1), optional 1–2 s sting | sparing pops on caption emphasis | dialogue −16 LUFS, deliver −14 for social |
| Talking head | intro, b-roll and section stings; bed 0.12–0.2 if any | a pop or click on graphics, nothing on zoom punches | bed out under the key line |
| Gen Z edit over speech | lo-fi / house / phonk bed, 0.14–0.2, low-passed at 6–8 kHz | 3–6 cues per 30 s on interrupts (pop, ding, hit) | speech decides the cuts; bed out under the hook line and payoff |
| Gen Z edit, music-led | 130–160 phonk or house at 1.0, cuts on beats or half bars | one hit per joke | −14 LUFS like everything else |
| UI demo | none or 100–120 at 0.1 | a varied click per interaction, typing loop, success chime | room tone throughout |
| Milestone | music-led at 1.0 | a tick per count step (0.45), impact when the number lands | no VO |
| Picture-led designed sound (no music, no VO) | none, or an air bed 0.05–0.15 low-passed ≤ 4 kHz | the cues lead: ≥12 dB over the bed; many events → one stem with the many-events rules | deliver −16 to −18 LUFS, LRA 4–14 LU, no stretch under −40 LUFS over 2 s outside the named silence |

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

1. `ebur128` on the exported file reports integrated loudness within ±1 LU of the target (−14 LUFS by default; −16 to −18 for a sparse, picture-led film, the choice written in `VIDEO.md`) and true peak at or below −1 dBTP; if not, the re-master above ran and its printed `normalization_type` is recorded. Report the numbers and LRA to the user.
2. No clipping: `volumedetect` `max_volume` below 0 dB.
3. Every SFX is on its frame: render `capture-frames` at each cue's frame and the frame before; the visual event (contact, first pixel, press, cut) is visible on the cue frame and not before.
4. The bed sits 14–20 LU under the voice (from the normalised levels, or measured): never louder than 0.2 under a voice line on normalised sources, and never so low it disappears. In the export, the momentary loudness in a ≥1 s speech pause is above −35 LUFS when a bed is meant to be there.
5. Frame 1 is audible (a transient or a downbeat; a sting's first motivated tick within 0.5 s also passes): `silencedetect=noise=-50dB:d=0.5` on the export reports no `silence_start: 0`. The last picture frame lands on the music's button or inside a fade that ends on a bar line.
6. Every riser into a hit: impact's first 10 ms RMS ≥8 dB above the riser's last 100 ms; no dip over 6 dB inside the riser; and **no gap on the landing frame**: the 50 ms RMS rows from 0.1 s before the hit to the hit never fall below the riser's level by more than 6 dB (`references/sfx-cues.md`).
7. Synthesised placeholder sounds are listed as placeholders in `VIDEO.md` and in your reply.
8. Big cuts sit on downbeats: for each, `(cutFrame − offset) ÷ framesPerBeat` is within 1 frame of a whole number.
9. No clip runs past the film's end unless it is a deliberate tail, and no long bed ends abruptly.
10. Every non-generated audio file has a credits line in `VIDEO.md` with its licence, and none is NC, BBC RemArc, YouTube-licence-only or a rip.
11. A sparse, picture-led film: each designed cue's loudest 50 ms RMS is ≥12 dB above the bed's RMS in a cue-free window, and the master's LRA is 4–14 LU (≤ 12–14 for any film meant to be heard). The momentary loudness shows no stretch below −40 LUFS longer than 2 s except the named silence (`references/mix-and-loudness.md`, Sparse mixes, has both commands). A film of many sound events was built as one stem from the scene's event schedule with the many-events rules, and the cue on its first and last event is audible above the texture.
12. No whoosh, swoosh, swish or air-sweep anywhere in the mix (the ban above): check every SFX file name, every generation prompt and the cue sheet in `VIDEO.md`.
13. A music-led trailer keeps its build: integrated loudness per section rises act by act and the climax is the loudest; any designed silence is room tone (−45 to −60 dBFS RMS), not digital zero.
