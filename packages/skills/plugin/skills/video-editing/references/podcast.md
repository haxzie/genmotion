# Podcast: the full episode, multicam, and clips

Read this when the footage is a recorded conversation: an audio or video podcast, an interview, a panel. Part A is the full episode; Part B is mining it for vertical clips. Recipe numbers (§) refer to `ffmpeg-recipes.md`. Frame counts are at 30 fps; at 24 fps multiply them by 0.8 (times in seconds stay as they are).

## Part A: the full episode

**Goal:** a clean, listenable, watchable episode that keeps the conversation's feel. Tighten it; don't sanitise it.

### Structure

| Time | Beat | Rule |
|---|---|---|
| 0:00–0:30 | Cold open: the best 15–30 s of the episode (a teaser pull) | must stand alone; no "so, as I was saying" |
| 0:30–0:45 | Ident: show logo or sting with 3–5 s of music | under 10 s; a long branded intro loses people |
| 0:45–1:30 | Host introduces the guest and what the listener will get | the promise, specific |
| body | Chapters every 5–15 min, each opened by a topic card or lower-third label | chapter titles 3–7 words, phrased as a benefit or question |
| mid-roll | Ad read, if any, at a chapter boundary | never mid-thought |
| end | Final question or takeaway → CTA → outro music under 15 s | no dead outro |

### Cleanup rules

- **Pauses:** compress any silence over 0.6–0.8 s down to 0.25–0.4 s (the podcast-episode row of the main skill's pause table, Step 5). Keep 80–150 ms of room tone or breath either side of every cut. Long-form needs air; over-tightening sounds robotic.
- **Fillers:** remove isolated "um", "uh", "er" (about 60–80% of them, not all). Keep one where removing it causes a pitch or breath jump, or a visible jump on a single camera with no cutaway. Leave "like", "you know", "so" unless repeated 3+ times in a sentence.
- **Crosstalk:** keep laughter, agreement and energy; cut false starts and overlapping restarts. On multitrack audio duck the non-speaker 6–10 dB rather than muting, unless their track bleeds noise.
- **Retakes:** keep the last complete take.
- **Every audio cut** gets a 10 ms fade each side (5–20 ms is fine). Lay the recording's own room tone under gaps: harvest 5–10 s of its quietest stretch and loop it; never digital silence, never a synthesised noise.
- **Levels:** speakers matched within 1 LU before the mix (`ebur128` per track, then gain).

### Multicam switching

| Rule | Number | Why |
|---|---|---|
| Cut to the speaker | 4–12 frames after they start, or on a breath or sentence boundary | slightly late feels natural; slightly early only for punchlines |
| Minimum shot | 2–3 s | faster switching is restless |
| No cut for interjections | under 1.5 s ("yeah", "right", "mm") | stay on the speaker, or go wide if both talk |
| Wide / two-shot | on crosstalk and shared laughter, and every 30–90 s of monologue | resets the eye |
| Reaction cutaway | 1–2 s on a strong reaction (laugh, shock, nod at a key line) | reactions often carry the emotion |
| Long monologue (>20 s, one camera) | alternate jump zoom 1.0 / 1.2 and wide so the frame changes every 8–15 s | per `ugc-craft`'s jump zoom |
| Never cut between near-identical angles | under 30° or under 20% size change | reads as a jump cut |

**Deciding who is speaking, without a diarising transcript:** with one track per speaker, measure RMS every 100 ms per track:

```sh
ffmpeg -i host.wav -af "aresample=48000,asetnsamples=n=4800:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=edit/rms-host.txt" -f null -
```

(tested: one `pts_time` + `RMS_level` pair per 0.1 s). The speaker per window is the loudest track. Switch only when the new speaker has led for ≥0.7 s **and** the current shot is ≥2.5 s old; insert the wide on overlap or when a shot exceeds your maximum. With a single mixed track, use the transcript's speaker labels (whisperX/pyannote). Without labels, look: the 1 fps talk sheet (`ffmpeg-recipes.md` §2) shows whose mouth and hands move each second; mark the changes in the paper edit.

The camera cut list then becomes the `concat` segments of the conform (§5), each segment from its camera's input, all at the same fps and size.

### Graphics

- Guest lower third on first appearance: name + one credential, 4–6 s, inside title-safe, never over a face.
- Chapter card or topic label at each chapter: 1–2 s card, or a lower-third label held 3–5 s.
- Optional logo bug: top corner, 60–70% opacity, off during the cold open.
- Captions: SRT sidecar (see `captions.md`), not burned, on the full episode.

### Sound

Dialogue chain per §7, target −16 LUFS integrated / −1 dBTP for podcast feeds (−14 if it is only published on YouTube). Music only in the ident, chapter stings and outro; under any speech it overlaps, `sound-design`'s bed row. The rest per `sound-design`.

### Procedure

1. Probe every file (§1). Transcode VFR to CFR.
2. Sync cameras and recorders by audio (clap or cross-correlation, §9). Log offsets.
3. Proxies, contact sheets per camera (§2). Note each locked-off camera's subject x-centre.
4. Transcribe with word timestamps and speaker labels if available (§3).
5. Paper edit: cold-open pull, chapters, cuts (tangents, retakes, ad-libs to drop), all in `VIDEO.md`.
6. Cut list: content cuts + pause compression + filler removal, with pads and fades.
7. Multicam pass with the rules above.
8. Dialogue chain and loudness (§7).
9. Long episodes: the hybrid render path in the main skill (Step 10). Inserts (cold-open title, chapter cards, end card) from the project; the body from ffmpeg.
10. Measure (§11), then export chapters (first at 00:00, ≥3, each ≥10 s), the SRT and a description.

### Common mistakes

Over-tightening into robot speech; cutting on every interjection; clicks at cuts; music louder than voices in the intro; dead-silent gaps; speakers at different levels; a 30 s branded intro; captions over a face.

## Part B: clips for social

**Goal:** 30–60 s vertical clips (up to 90 s for a strong story) that make a stranger stop, understand without context, and want the episode. Target 3–8 clips per hour of conversation.

### Finding the moments

Score every candidate span 0–5 on each, and keep the top N:

| Criterion | What scores 5 |
|---|---|
| Hook | the first sentence is a claim, a number, a contrarian take, a question or an emotional line, and works without the sentence before it |
| Standalone | no unresolved "he", "that thing" or "like I said" in the first 10 s |
| Emotional peak | laughter, a raised voice, a story's climax, vulnerability, conflict |
| Payoff | ends on a resolved thought or a punchline, not mid-argument |
| Value | a tactic, a number or an insight someone would send to a friend |

Search the transcript for "the secret", "nobody talks about", "the biggest mistake", "I've never told", numbers, and question → answer pairs; find laughter peaks in the waveform.

**No transcript (the main skill's Step 3 policy applies first).** Without words you cannot score Hook or Payoff, so pick **units of conversation, not shots**, and say the pick is provisional:

1. On the 1 fps talk sheet of the whole conversation (`ffmpeg-recipes.md` §2), mark every second the interviewer's mouth or hands move. Each run of guest speech between two interviewer turns is one candidate: a question → answer unit.
2. **A camera change inside a monologue is not a boundary.** Multicam editors cut during answers as a matter of course (the wide every 30–90 s above), so the original edit's cut points say nothing about where a thought ends. In testing, a clip cut on the source's camera changes started and ended mid-answer.
3. Rank the units by: length that fits the target (30–60 s), the guest facing a camera for most of it, visible energy (gestures, leaning in, laughter on the sheet and the RMS peaks), and loudness variation.
4. **In point:** the guest's first syllable after the interviewer stops (the first speech onset in `silencedetect` after the question, minus 0.08 s). **Out point:** a pause of ≥0.5 s inside the last 10 s of the window, the longest one there. Trim to length by moving the out point back to an earlier ≥0.5 s pause, never by starting later.
   - **A monologue** (a talking head, a lecture, one speaker with no interviewer) has no question → answer units: the units are sentences, and the out point is a sentence end.
   - **No pause ≥0.5 s in the last 10 s** (a tightly delivered or already-edited source): end on the longest pause there whose pitch falls into it (a falling, sentence-final intonation; listen to the 2 s strip, or compare the RMS envelope: a sentence end decays, a mid-sentence breath stops abruptly). Say in the delivery note that the ending may be mid-thought, and close the clip with an end card that repeats the hook (`genz.md`, Loops and endings) rather than a credit alone.
5. Check both boundaries (`ffmpeg-recipes.md` §11, In and out boundaries): 2 s either side. If the guest is still talking past the out point, move it or disclose a mid-answer excerpt.
6. Prefer one continuous answer over a splice of sections you have not heard.

### Building a clip

- **Start on the hook.** Cut any preamble ("So, yeah, I think…").
- **Reordering is allowed:** pull the punchline forward as a 2–4 s cold open, then play from the setup. Never splice words to make the hook; it must be a sentence the speaker said whole.
- If context is missing, add one line of on-screen text or a 3–5 s host setup, not a voiceover.
- Snap boundaries to sentence starts and ends. Tighten joins per the podcast-clip row of the main skill's pause table (Step 5): a join gap of about 0.13 s.
- End right after the payoff line, or on a line that loops into the hook. No outro over 2 s.
- Check frame 0: not a blink, not black, not mid-gesture, not inside a camera move, the face forward and on the column. If the source is mid-move or looking down, start 2–6 frames later.
- Pick the cover frame: a strong face, mouth closed.

### 9:16 layouts from a horizontal recording

| Layout | When | How |
|---|---|---|
| Active-speaker crop | monologue, insight clips (the default) | a 9:16 crop per camera centred on that speaker (one x per locked-off camera); hard-switch on speaker change with the multicam hysteresis (≥1.5 s per shot); ease drifts over 8–12 frames |
| Stacked split screen | exchanges, debates, reactions | two 1080×960 halves, the active speaker on top or a fixed A/B order; captions on the seam or in the lower half's lower third |
| 4:5 or 1:1 plate with text bands | sources ≤720p or letterboxed, where a full-height crop would enlarge >2× | plate top at y 460, hook title above it, captions over its lower part (`ffmpeg-recipes.md` §6) |
| Blurred letterbox | both people in one wide shot that can't be separated | 16:9 centred on a blurred, darkened fill, zoomed 1.2–1.5×; last resort |

Crops by ffmpeg (§6) when the framing per camera is fixed; in the scene (`footage-in-scene.md`) when it moves. Keep the eyes on the upper-third line (y ≈ 500–750 of 1920). Measure the enlargement first (main skill, Step 7): a 9:16 crop of 720p is already 2.67×.

**Use every angle of the guest the source gives you**, including a 9:16 crop of the wide: alternating the close angle and the wide-crop is a real camera change, which a jump zoom on one angle only imitates. When captions are absent, something must still change every 3–5 s: an angle switch, a jump zoom, or a slow 1.0 → 1.06 drift across a long segment.

### Graphics and sound for clips

- Captions: word pop per `ugc-craft`, placed per `captions.md`.
- Hook title: a 5–9 word claim at y 270–450 for the first 3–5 s, or persistent ("Why VCs pass on 99% of founders"). Optional small guest label: name + credential, ≥40 px (a 28 px credit is unreadable on a phone).
- **No transcript: still ship a hook title.** Build it only from public facts (the guest, the show, the episode or file title, the topic if the metadata names it), as a question or a POV, never a quote: "How does a surgeon decide when to stop?" when the episode title is about that decision; "POV: you get 40 seconds with <guest>" when nothing names the topic. Never a bare name label, and never words the guest may not have said. Record it in `VIDEO.md` as unverified.
- End: a 1 s "Full interview: <show>" card earns its place when the licence asks for credit; otherwise end on the payoff.
- Music: optional; `sound-design`'s podcast-clip row (none, or 0.1 low-passed). SFX: at most one pop on the key number; nothing on the open's cut.
- Loudness −14 LUFS / −1 dBTP.

### Procedure (clips)

1. Transcript with word timestamps and speakers.
2. List candidate spans (start and end word), each with its hook line and scores. Pick the top N and write them as a clip table in `VIDEO.md`.
3. Per clip: snap, tighten, decide the layout, conform one `edit-<n>.webm` + `edit-<n>-audio.wav`.
4. One project per clip, or one project with one scene per clip rendered with `--frames` ranges; each clip is its own deliverable.
5. Captions, hook title, measure (main skill Step 11), deliver with a cover frame suggestion.
