# Talking head: YouTube, Shorts/Reels/TikTok, LinkedIn, courses, green-screen reaction

Read this when one person talks to camera and the user wants it edited. Pick the section for the destination; the shared craft (paper edit, jump zooms, J/L cuts) is in the main skill. Recipe numbers (§) refer to `ffmpeg-recipes.md`.

## A. YouTube long-form (8–25 min)

**Goal:** hold average view duration without the edit becoming noise. Energy you don't notice.

| Time | Beat |
|---|---|
| 0–5 s | Hook line that confirms the title and thumbnail promise (the payoff tease or the stakes) |
| 5–30 s | Context, why it matters, the roadmap. No channel intro; a greeting is at most 2 s |
| 30–60 s | First real value, which proves the promise early |
| every 2–3 min | A re-hook or open loop ("but the third one is where it gets weird") |
| ~3 min and ~6 min | An escalation or twist to re-engage |
| body | Sections opened by a 1–2 s chapter card or a topic lower third |
| last 20 s | Payoff → CTA to one specific next video; leave the end-screen area clear (bottom-right 20%) for 5–20 s |

**Cut rhythm**

- Jump-cut every pause over 0.3–0.5 s and every flub: a cut every 3–8 s is typical.
- Hide jump cuts with `ugc-craft`'s jump zoom: alternate 1.0 and 1.2 on consecutive segments (≥20% size change), never two zoomed segments in a row. Hard steps, not animated zooms. Reserve a slow push (1.0 → 1.08 over 3–6 s) for serious lines.
- 4K source in a 1080p timeline can scale to 2.0 without softness; 1080p sources stay ≤1.3.
- B-roll or a graphic every 10–30 s (denser in the first 2 minutes), 2–5 s each, literal to the words, with J/L cuts so the voice carries across.
- A pattern interrupt every 30–60 s: b-roll, a graphic, a zoom change, a text pop with a sound, an angle change, a screen insert.

**Graphics:** lower third on first appearance (4–6 s); keyword pops of 2–5 words for 1.5–3 s; chapter cards 1–2 s; spoken numbers become an animated chart; all inside title-safe.

**Sound:** a bed 20–28 dB under the voice, changing at each chapter; drop it to silence under the most important line; light SFX (a soft whoosh on transitions, a click on text). Loudness −14 LUFS.

**Delivery:** H.264 High, CRF 18 (or 12–20 Mbps at 1080p), AAC 48 kHz; SRT uploaded separately (not burned); chapters in the description.

**Mistakes:** branded intros; zooming on every cut (seasick); a zoom without a cut; b-roll that doesn't match the words; music louder than the voice; burned captions on long-form; ending with "that's it, bye" and 20 s of dead air.

**Render:** a 10–15 minute video is past the in-project render budget; use the hybrid path (main skill Step 10): the body by ffmpeg, the designed inserts by the project.

## B. Shorts, Reels, TikTok (15–60 s, sweet spot 20–45 s)

| Time (45 s example) | Beat |
|---|---|
| 0–1.5 s | Hook: the spoken line with matching hook text at y 270–450. Start mid-sentence or on movement; no greeting |
| 1.5–5 s | Stakes: why stay ("…and it costs you $400 a year") |
| 5–35 s | 3 points, 6–10 s each, each opened by a visual change |
| 35–42 s | Payoff or twist |
| 42–45 s | CTA ≤2 s, or a line that loops into the hook |

- A visual change every 1–3 s (jump cut, jump zoom, b-roll, text pop); `ugc-craft`'s three-second rule is the ceiling.
- Gaps ≤100 ms; the breath trim from `ugc-craft`.
- Punch-in (1.0 → 1.12 over 8 f) on stressed words, at most 4 per 30 s.
- Captions: word pop per `ugc-craft`, placed per `captions.md`.
- SFX: whoosh on b-roll entrances, pop on text, a ding on a key number; 3–8 per 30 s at most, each 6–12 dB under the voice.
- Aspect 1080×1920; eyes at y 500–750.
- Loudness −14 LUFS / −1 dBTP.

**Reframing a horizontal recording:** a static 9:16 crop on the face (§6) if they barely move; a scene-side crop with eased drift (`footage-in-scene.md`) if they lean and gesture.

**Mistakes:** a slow start (logo, "hi guys"); captions under the bottom UI; text under 50 px; 8-word caption lines; music over the voice; a 5 s "follow me" card; hook text that doesn't match the spoken hook.

## C. LinkedIn (30–90 s feed, up to 3 min for thought leadership)

- Aspect 1:1 (1080×1080) or 4:5 (1080×1350) for feed space; 9:16 accepted; 16:9 for webinars.
- The feed autoplays muted: **burned-in subtitles plus an SRT upload**. Clean subtitle style (`captions.md`): sentence case, ≤42 characters a line, 2 lines, white on a box, no bounce.
- A persistent headline bar in the top 15% in the brand colour: the insight in ≤2 lines.
- Lower third: name, title, company.
- Pacing: jump cuts are fine, a cut every 4–8 s; fewer zoom moves, no meme sounds; music subtle or none.
- End card 2–3 s: name or handle and one CTA ("Comment 'guide' and I'll send it").
- **Mistakes:** TikTok chaos; no captions; a tiny face in a landscape frame; a long logo intro.

## D. Course or tutorial (lessons of 3–10 min)

- Structure: show the finished outcome in the first 10–20 s → prerequisites → numbered steps (a title card or a numbered lower third each) → recap → next lesson.
- **Never cut a step the learner has to reproduce.** Cut dead time (loading, typos) only around steps; speed-ramp long waits 4–8× with a visible "8×" badge (stepped segments, §8).
- Screen sections: load `screen-capture`. Focus pushes to the active UI (`ugc-craft`'s focus push: 30 f inOutCubic to the zoom where text reads ≥34 px); cursor highlights and click rings.
- The presenter as picture-in-picture: a circle or rounded rectangle in a corner at 15–25% of the frame width, hidden when the screen needs full attention.
- Captions: SRT for accessibility; burned optional. Code and UI text ≥18 px equivalent at 1080p.
- Audio: consistent across lessons, −16 to −14 LUFS; remove keyboard noise if it dominates (`agate` or a 4–6 kHz notch only during typing).
- **Mistakes:** zooming without easing; cutting the step; loudness jumping between lessons; unreadable code.

## E. Green-screen reaction / commentary (9:16)

- The creator keyed over the source (a screenshot, article, post or clip): `chromakey` + `despill` in ffmpeg (§8), or a chroma-key shader on the footage plate in a Three scene (similarity 0.08–0.12, 1–2 px soft edge, spill pulled to grey).
- Layout: the creator in the bottom 35–45% (cropped at chest), the source in the top 55–65%. Keep the source's text above y 1110 and inside x 120–840 so captions and UI don't cover it.
- Pan and push on the source to the exact line being discussed (a focus push), and mark it (a highlighter swipe or underline drawn over 8–12 f).
- Hook: the most provocative line of the source, shown and read in the first 1–2 s.
- **Mistakes:** green fringe (add despill and a slight erode); source text too small; the creator covering the content.
- If the footage is a creator ad concept rather than commentary, see `ugc-green-screen` for the ad structure; the keying and cutting here still apply.

## Shared procedure

1. Probe; CFR; proxy; contact sheet (§1–§2).
2. Transcribe with word timestamps (§3).
3. Paper edit: drop retakes, keep the best take, reorder for the hook. Write it in `VIDEO.md`.
4. Silence and filler cut with 50–120 ms pads (the format's gap row in the main skill).
5. Jump zooms on alternate segments of the same angle.
6. B-roll and graphics plan from the transcript's nouns and numbers; at least one insert per 10–30 s long-form, per 3 s short-form.
7. Conform (§5), dialogue chain (§7), place audio, build the motion layer.
8. Render (or hybrid for long-form), measure, deliver with SRT and chapters where the platform wants them.
