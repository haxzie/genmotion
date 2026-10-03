---
name: ad-qa
description: "The pre-ship QA pass for a short-form or social ad, run on captured frames and the exported file: the exact frames to capture, eleven tests with pass criteria and fixes (hook frame, brand timing, mute, safe zones with a drawn overlay, captions, text size and contrast, pacing, CTA and ending, audio and loudness, ad codes, claims), then direction's critique rubric as the ship bar and a short report for the user. Every UGC owner ends here. Load it before telling anyone an ad is finished."
---

# Ad QA

An ad that validates can still be unwatchable. This is the pass between "it renders" and "it is done", run on pixels and on the exported file, never on the code.

It extends `direction`'s critique (→ `references/critique.md`: the checklist and the 8-axis rubric) with the checks only an ad needs. Numbers come from `ugc-ad-foundations` (safe zones, levels), `ugc-craft` (captions, moves) and `sound-design` (loudness). Frames at 30 fps.

## When to use

- At the end of every UGC or social ad, before telling the user it is finished. Every UGC owner's checks end by pointing here.
- When a user asks "is this ready to post", "will this work on TikTok", "did I get the safe zones right", or "check the claims".
- On a user's existing ad, to review it (report only; change nothing they did not ask you to).

For a launch film, explainer or sting, run `direction`'s critique alone; the ad-specific tests below assume a feed placement.

## Severity

**Blocker**: do not ship. **Fix**: fix unless the Direction block in `VIDEO.md` says it is deliberate. **Polish**: fix if time allows.

## Step 1: capture

Export first (an unexported ad has no audio to measure), then take one `capture-frames` pass at:

| Frame | Why |
| --- | --- |
| 0, 6, 15 | The thumbnail, the hook line legible, the first movement |
| 45, 90, 120 | The hook settling, the 3 s mark, brand-in-context by 4 s |
| Every scene's first, middle and last frame | Mute, safe-zone and pacing tests; each cut is judged as a pair |
| Two caption groups at their first frame | Caption test |
| The peak / memorable-moment frame from the Direction block | Craft score |
| The CTA's first legible frame and D − 2 s | CTA hold |
| The last frame | Ending, loop |

Then build a contact sheet with `ffmpeg` (`-vf "fps=1,scale=180:-2,tile=8x4" -frames:v 1 sheet.png`) so rhythm, repeated layouts and stills that hold too long are visible at once.

## Step 2: the tests

### 1. Hook frame
- [Blocker] Frame 0 is not a logo, a wordmark, a brand-colour field, a black frame, or a person about to speak.
- [Blocker] Frame 15 shows the hook: the line is legible and something has moved since frame 0.
- [Fix] The hook line is the largest text on screen, ≤7 words, legible by frame 6.
- Fix: trim the clip head so frame 0 is mid-motion; move the strongest image to frame 0; cut the first beat.

### 2. Brand and product timing
- [Fix] The product or its UI is in frame, in context, by frame 120 (4 s); the logo card, if any, only at the end. Exception: a problem-solution ad whose Direction block holds the product until its turn (≤7 s).

### 3. Mute
- [Blocker] Reading only the scene captures with no sound, someone can say what the product does and what to do next.
- Fix: put the beat's meaning on screen (caption, state change, mark); give the turn a visual (hard cut, state change); make the CTA text and visual cue appear with the spoken CTA.

### 4. Safe zones
Draw the readable area on each captured 9:16 frame and look:

```
ffmpeg -i frame.png -vf "drawbox=x=120:y=270:w=720:h=940:color=red@0.8:t=4,drawbox=x=0:y=1110:w=iw:h=100:color=yellow@0.5:t=2" frame-safe.png
```

- [Blocker] Every word, logo, face and CTA that must be read sits inside the red box (x 120–840, y 270–1210).
- [Fix] Captions sit in the yellow band (y 1110–1210), never over the mouth or the line being read.
- [Fix] 4:5 deliveries keep key content inside the central 1080×1080 (y 135–1215); 1:1 and 4:5 keep 54–86 px margins.
- Fix: re-lay-out, don't shrink: break a headline into 2–4 words per line; move the CTA centre or centre-left; offset the crop so a face clears the right rail.

### 5. Captions (spec in `ugc-craft`)
- [Blocker] Every spoken line is captioned.
- [Fix] 1–3 words per group, one line, 76–96 px, 8 px stroke, one highlight colour; only one group visible at a time; each group gone by the next group's start frame.
- [Fix] Captions trim filler but never change the meaning of what is said.

### 6. Text size and contrast
- [Blocker] Text that must be read is ≥34 px at 1080 wide (UI text, source text, prices); nothing meaningful under 24 px.
- [Blocker] Contrast ≥ 4.5:1 against what is behind it (stroke or box counts); an accent colour carries text under 60 px only if it clears 4.5:1 itself.
- Fix: crop tighter or focus-push; rebuild the UI magnified; add the stroke or a 60% box.

### 7. Pacing
- [Fix] No two captures 90f (3 s) apart look the same (use the contact sheet); hook shots ≤36f.
- [Blocker] Every on-screen message line holds ≥ `max(30, 9 × words + 15)` frames from the frame it is legible, and ≤15 characters per second.
- [Fix] Eased punch-ins ≤4 per 30 s; no crossfades anywhere.

### 8. CTA and ending
- [Blocker] The CTA is in the last 3–5 s, said, written (legible ≥60f) and shown with a visual cue.
- [Fix] No fade to black over the last seconds; no new information after the CTA; the last frame is the CTA or a frame that loops into frame 0.
- [Fix] The export's duration matches the Beats table (`ffprobe -v error -show_entries format=duration -of csv=p=0 out.mp4`).

### 9. Audio
Measure the export:

```
ffmpeg -hide_banner -nostats -i out.mp4 -map 0:a -af ebur128=peak=true -f null -
ffmpeg -hide_banner -nostats -i out.mp4 -vn -af silencedetect=noise=-50dB:d=0.3 -f null -
ffmpeg -hide_banner -nostats -t 0.1 -i out.mp4 -vn -af astats=metadata=0 -f null -
```

- [Blocker] Integrated −14 LUFS ±1, true peak ≤ −1 dBTP, no clipping. Report both numbers.
- [Blocker] VO intelligible at the loudest music section; the bed is 0.12 under VO (`sound-design` ladder).
- [Fix] Frame 1 is audible (the first 0.1 s RMS is not near −inf); no unintended silences ≥0.3 s inside the ad (room tone under VO gaps).
- [Fix] SFX sit on their visual frames (tap on the press frame, impact ±2f); hard cuts are silent unless the picture makes a sound on them.
- [Blocker] No whoosh, swoosh, swish or air-sweep anywhere in the ad, on cuts or anything else (`sound-design`'s ban): check the SFX file names, the generation prompts and the cue sheet.
- Fix: scale clip volumes by the loudness difference, or re-master per `sound-design` → `references/mix-and-loudness.md`.

### 10. Ad codes
Look at the first second again and name the thing that says "advertisement". There is usually one.

| The code | The fix |
| --- | --- |
| Even, directionless light | Grade it; let one end clip |
| Dead-centre composition | Offset the subject 3–6% of the width |
| A crossfade or a graphic wipe | Hard cut on a word or a sound |
| A logo bug or watermark throughout | Remove it; the brand lands at the end |
| A designed lower third with a name and title | Remove it or make it a caption |
| Every shot the same length | Vary them per `ugc-craft`'s cadence table |
| A performed, bright read | Regenerate with a flatter delivery note |

### 11. Claims
Read every spoken line and every piece of on-screen text, including text inside rebuilt UI and mocked sources, and ask where each fact came from. Test against the six rules in `ugc-ad-foundations` → "Claims".

| Fails when | Fix |
| --- | --- |
| A number, rating, timeframe or user count nobody supplied | Remove it, or bracket it and tell the user |
| Words attributed to a named person who did not say them | Remove the name or the line |
| A synthetic presenter implied to be a customer, employee or expert | Rewrite so it claims no identity |
| A before-and-after implying a typical result | Remove the implication or ask the user to confirm |
| A rebuilt UI or mocked page showing something that does not exist | Rebuild what exists; genericise a mocked third-party page |
| A competitor claim with no source | Remove it; compare on your own facts |

Never resolve a claims failure by guessing.

## Step 3: the craft score

Score the ad on `direction`'s rubric (Idea, Hook, Frame, Type, Motion, Transitions, Pacing / energy, Sound), one sentence of evidence each, from the captures. Read Transitions with the UGC deviation: hard cuts on words or sounds are the intended workhorse, so the question is whether one motivated signature move exists at the turn or payoff. **Ship bar**: no Blocker open, no axis below 3, average ≥4. Fix the lowest axis first, re-capture, re-score.

## Step 4: the report

Give the user one short paragraph, not a checklist. Name what you changed and what only they can answer; do not list tests that passed. Append the scores to `VIDEO.md` in `direction`'s critique format.

> Checked the ad on captured frames and the export. Frame 0 is the render bar already crawling, and the hook line is legible by frame 6. It plays muted: every line is captioned in the 1110–1210 band and the turn is a hard cut with a brightness step. I moved the price out of the right rail and raised the bed's fade so frame 1 has the downbeat. Export measures −14.2 LUFS, −1.6 dBTP. Two things for you: "eleven minutes" is a placeholder until you give me the real figure, and the presenter is generated, so the script does not claim they are a customer. Scores: Idea 4 · Hook 5 · Frame 4 · Type 4 · Motion 4 · Transitions 4 · Pacing 4 · Sound 4.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Every visual test | `capture-frames` | None. An ad nobody looked at is not finished |
| Loudness, silences, duration, overlays, contact sheet | `ffmpeg` | None for loudness; say the export is unmeasured |
| Scene boundaries and audio clips | `project-overview` | Read `project.json` and the Beats table |
| The project compiling at all | `validate` | None: run it first; a failing scene captures nothing useful |

## Checks before you finish

1. `validate` passed before any capture was taken.
2. Every capture in Step 1 was actually taken and looked at; the safe-zone overlay was drawn on at least frame 15, one mid-body frame and the CTA frame.
3. All eleven tests were run; no Blocker is open.
4. The export was measured: integrated loudness and true peak are in the report.
5. The rubric scores are written with evidence, average ≥4, none below 3.
6. The report names every placeholder and every claim only the user can confirm, and nothing is described as checked that was not looked at.
