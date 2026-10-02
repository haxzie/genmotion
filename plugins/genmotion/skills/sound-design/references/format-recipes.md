# Format recipes

Read this when you write the cue sheet for a specific kind of video. Frames at 30 fps. Levels assume normalised sources (VO and music at −16 LUFS, SFX peaks at −3 dBFS). Master: −14 LUFS / −1 dBTP unless noted. The owner skill sets the beats; this file sets the sound on them.

## Launch film (20–90 s)

- **Music**: instrumental build-and-drop, 110–128 BPM (ask for 120: 15 f per beat). Drop on the product reveal.
- **Shape**: frame 1 transient → problem section sparse and low → riser 2–4 s (one or two bars) into the **drop on the reveal** → feature montage, a cut every 1–2 beats, each feature landing with a light swish or click → breakdown under the key line → logo on the last hit, 1–3 s tail.
- **SFX**: 5–8 hero moments. Whoosh 0.7 three frames before each flood, impact 0.7–0.85 on slams and the logo, click 0.9 on taps.
- **Levels**: music-only films at 1.0; with SFX 0.5–0.6; VO-led 0.18–0.28 with VO at 1.0, +3 to +8 f after each cut.
- House examples: a fintech launch at music 0.55 with whooshes and impacts; a voice-AI launch with bed 0.28, block-wipe SFX on wipe starts and rings on cuts.

## Explainer with VO (40–120 s)

- **Order**: write and place the VO first; music and SFX fit around it.
- **Music**: 90–110 BPM, sparse, no lead melody. Bed 0.14–0.22 (house 0.22, fade in 30, split near the end and fade out 45). Optional duck up to ≈ 0.7 in pauses ≥ 1.5 s.
- **Cuts**: each section starts on a downbeat right after a VO pause; VO +6 f after each cut (house: 8 of 8).
- **SFX**: light UI sounds, at most one per 2–3 s; room tone 0.03–0.05 if the bed drops out.
- **Ending**: music button under the CTA.

## Brand sting (2–8 s)

- **Sequence**: whoosh or riser into the lock-up (0.5–1.5 s) → **impact on the settle frame** → tonal button (2–4 notes or a chord) → shimmer tail 1–1.5 s. About 3 s of sound.
- **Source**: a music generator with a 3–5 s length, or `sfx` ("short bright three-note synth logo jingle, ending on a sustained chord, 2.5 seconds").
- **Levels**: logo hit 0.9; no bed. No sub drop if the sting will precede speech.
- **Loop variant**: the last frame's sound must decay to silence before the loop point.

## UGC / social ad (6–60 s, vertical)

- **Frame 1**: a transient, never a fade-in.
- **Music**: trend-adjacent 95–130 BPM, cut on beats; bed 0.1–0.18 under talk. Brand TikTok accounts use the Commercial Music Library in-app; never export a trending sound into the file.
- **SFX**: a swish on every jump cut or none; a hit on the product shot; a pop (0.45) on caption keywords, sparingly; foley on product handling.
- **Muted**: captions carry every claim.

## Trailer / teaser (30–150 s)

- **Act 1**: quiet, emotional, 60–80 BPM, sparse hits.
- **Act 2**: pulses and percussion, rhythm accelerating, a braam on each act break, each break a dropout.
- **Act 3**: everything firing, hits on every cut, pulse 120–140.
- **Title**: riser → **hard cut to 0.5–1.5 s of silence** → title hit (braam + sub drop) → optional button (one last hit or joke).
- VO lines sit in the gaps between hits. LRA is wider than a promo's; −14 LUFS still.

## Podcast clip (15–90 s, vertical)

- Dialogue rules everything: speech at −16 LUFS (deliver −14 for social, −16 for podcast feeds).
- No music under talk, or ≤ 0.05 (−26 dB). Optional 1–2 s intro sting and outro tail.
- A pop or click on caption emphasis is optional and rare. VO fades 2–3 f to remove breath clicks.

## Talking head (YouTube, 1–15 min)

- Speech at −16 to −14 LUFS short-term. Music only on the intro, b-roll stretches and section stings (1–2 bars); bed 0.1 under speech when present.
- Light swishes on graphics and zoom punches; a boom on a rare emphasis joke.
- Room tone continuous under cuts so jump cuts do not drop to digital zero.

## Gen Z edit (7–30 s)

- Phonk, drill or house at 130–160 BPM (or half-time). **Cut on every beat or every half bar**; at 150 BPM that is 12 f per beat.
- A speed-ramp hit on the drop; a glitch on transitions; a low-shelf boost (+3 to +6 dB for one bar) on the drop if pre-rendering the track.
- Meme-style hits, one per joke, generated look-alikes only.
- Master −14 LUFS, up to −13 for a music-led edit; never above −10.

## UI demo / screen walkthrough (15–90 s)

- No music, or minimal tech / lo-fi at 100–120 BPM at 0.1 under VO (0.5 with no VO).
- **A click per interaction** on the press frame (0.8–1.0), varied in level ±0.04 and alternating tracks; soft whooshes on screen transitions; a typing loop under text entry; a success chime on completion; room tone throughout.
- Strip the recording's own audio before placing it.

## Milestone / stat announcement (6–20 s)

- House templates in this family ship silent; this is the obvious upgrade.
- **Music**: music-led at 1.0, 120 BPM so the count can step on beats.
- **SFX**: a tick (0.45, 4 f fade) per count step or per digit roll, accelerating with the count; an **impact on the frame the final number lands** (0.8) with a short shimmer; confetti or burst with a soft pop at 0.5.
- Hold the number through the music's button.

## Chat / message ad (10–30 s)

- One sound per bubble **on its first visible pixel**: received 0.85–0.9, sent 0.75–0.9; trim each file's leading silence with `startFrom`.
- Bed 0.136 (−17 dB) under bubbles, fade in 18, out 45; or music at 1.0 with no VO.
- Tap pop 1.0 on the press frame.
