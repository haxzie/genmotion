# Pacing, reading time and safe zones

The arithmetic behind Step 6 of `direction`: how long words need, how fast VO runs, how often to cut per platform, and where text may sit in each aspect ratio. Frames at 30 fps (at 60 fps double them; at 24 fps multiply by 0.8). Read it while filling in the beat table, and again for any 9:16 deliverable.

Contents: 1 Beat interval by energy · 2 On-screen text · 3 Voiceover · 4 Cut rate by placement · 5 Safe zones per aspect · 6 Type sizes · 7 Holds that end a film · 8 Worked budget

---

## 1. Beat interval by energy (house measurements)

"Beat interval" = frames between new pieces of information on screen (a new card, word group, message, UI step or camera reveal), measured across GenMotion's 25 templates.

| Energy | Interval | Seconds | Seen in |
| --- | --- | --- | --- |
| Hyper | 8–14f | 0.27–0.47 | beat-cut kinetic type (7.9f average), a dock montage (13f), a match-cut chain (14f), lyric words (7.5f) |
| High | 18–30f | 0.6–1.0 | 3D product launches (18–25f), brand guide (22f), group chat (20–22f), HUD parody (25f) |
| Medium | 30–50f | 1.0–1.7 | VO-led launches (30–40f), UI demos (35–50f), one-shot films (45–60f) |
| Calm | 45–70f | 1.5–2.3 | chat ads (48f per message), whiteboard explainer (50–70f per idea), stat reveal (45f, then a 100f payoff) |

- House average: about 30f, median 25f.
- Scene length: mean 5.4 s, median 4.3 s, shortest 1.0 s (30f, a single beat in a fast chain). By family: beat-cut 3.3 s, VO-led launch 3.0–3.6 s, soft-light demo 6–7 s, explainer 7 s, chat ad one 15–17 s scene.
- Launch films cluster at 20–35 s; VO-led explainer-launches at 40–71 s.
- Vary the interval with the energy curve. A film that runs one interval end to end has no curve.

## 2. On-screen text

**Hold formula** (from the frame the line is fully legible, which for a staggered line is the frame the *last* word's entrance finishes: opacity ≥ 0.9, blur ≤ 1 px; entrance frames do not count):

```
hold_frames = max(30, 9 × words + 15)          // 0.3 s per word + 0.5 s, minimum 1 s
hold_frames ≥ characters × 2                   // never faster than 15 characters per second
// any fps: hold_seconds = max(1, 0.3 × words + 0.5) and ≥ characters / 15; frames = seconds × fps
// at 24 fps: max(24, 7.2 × words + 12), and ≥ characters × 1.6
```

| Words | Minimum hold at 30 fps | at 24 fps (film, trailers) | at 60 fps |
| --- | --- | --- | --- |
| 1–2 | 30f (1.0 s) | 24f | 60f |
| 3 | 42f | 34f | 84f |
| 5 | 60f (2.0 s) | 48f | 120f |
| 8 | 87f | 70f | 174f |
| 12 | 123f (4.1 s) | 99f | 246f |

Every other frame count in the pack is at 30 fps too: entrances, staggers, beats, holds that end a film. A 24 fps project (footage shot at 24 is kept at 24) multiplies each by 0.8 and rounds to the nearest whole frame, never below 1 (a 3f stagger is 2f, a 12f blurUp is 10f, a 75–120f logo hold is 60–96f).

- **Exceptions**: a 1–3 word line inside a rapid sequence may drop to 18f (0.6 s) — the house minimum before an exit starts — because the eye reads one or two words almost instantly. Cards in the beat-cut style hold 5–15f because they are rhythm, not reading. Anything shorter than its formula is texture: it may not carry the message.
- **Subtitle standard** for comparison: 17 characters per second for adults, 13 for children, minimum 20f (0.83 s) per caption. Designed motion type competes with imagery, so it gets the more generous house formula.
- **Test**: if you cannot read it twice in its hold, it is too fast.
- **When text mirrors VO**: the text is legible before or as the word is spoken, and holds at least 15f after the VO finishes it.
- **Max words at once**: 7 for feed placements (about one line), 12 for explainers. One idea per text beat; change the text when the idea changes.
- **Animate long lines by line or word**, not by character. Reserve per-character motion for 2–3 key words in a film.

## 3. Voiceover

| Read | Words per second | 15 s | 30 s | 45 s | 60 s |
| --- | --- | --- | --- | --- | --- |
| Standard commercial | 2.5 | 37 | 75 | 112 | 150 |
| House default (breathing room) | 2.3 | 34 | 69 | 103 | 138 |
| Soft / premium | 2.0 | 30 | 60 | 90 | 120 |

Budget against the VO's own window, not the film length: subtract the lead-in and the VO-free tail.

- **Script check**: `seconds_needed = words / 2.5 + 0.3 × pauses`. Over the slot: cut words. Never ask for a faster read.
- **Placement** (house): VO starts 5–8f after the film starts; 3–8f after each cut (median +6f, so the picture lands first); a line that bridges a cut may start 15–45f before it. The last 45–60f (1.5–2 s) are VO-free for the logo and sonic logo.
- **Write numbers as spoken** ("$1.9T" → "nearly two trillion dollars", "10x" → "ten times", "API" → "A P I"). The picture shows the exact figure.
- **Write VO as cues** ("First the request — then the cache — then the answer") so each visual can arrive as the voice names it.
- **Opening**: a claim, a question, a contrast or a number. If it starts "Welcome to" or "Introducing", rewrite it.

## 4. Cut rate by placement

| Placement | Average shot | Cuts per minute | Notes |
| --- | --- | --- | --- |
| TikTok / Reels / Shorts | 0.5–2 s | 30–90 | Something meaningful changes every 1–3 s; the hook is visible by frame 15; brand by 3–4 s |
| Feed ad (LinkedIn, X, Facebook) | 1.5–3 s | 20–40 | Sound off by default; captions carry it |
| YouTube pre-roll | 1.5–2.5 s | 25–40 | Sound on is common; the hook must land before the 5 s skip point |
| TV-style 30 s spot | 1.5–2.5 s | 25–40 | |
| Product launch on a site | 2–5 s hero shots, 0.5–1 s in feature montages | varies with the curve | Slow is fine where attention is given |
| Explainer | 3–6 s per scene, a change inside every 1–2 s | 10–20 scene changes | |
| Sting | 1–3 shots in total | — | |

**Hard cut beats a fancy transition when**: the cut is on a musical beat, the two shots contrast on purpose, the pace is above about one cut per second, the transition would take more than 15–20% of the shot, or nothing in the frame can motivate it.

## 5. Safe zones per aspect

Margins are the area that must hold every word, logo and face the viewer needs. Backgrounds and motion may bleed past them.

### 16:9 (1920 × 1080)
- Title-safe (broadcast): 5% per side → 96 px left/right, 54 px top/bottom.
- House comfort zone for web: 8–10% per side (150–190 px left/right). The whiteboard explainer uses a 140 px left margin.
- Action-safe: 3.5% per side (67 px / 38 px).

### 9:16 (1080 × 1920): platform UI covers the frame

| Platform | Top | Bottom | Left | Right |
| --- | --- | --- | --- | --- |
| Instagram Reels | 14% (270 px) | 35% (672 px) | 6% (65 px) | 6% (65 px) |
| TikTok in-feed | 13% (250 px) | 37% (710 px) | 11% (120 px) | 22% (240 px, the like/comment/share column) |
| YouTube Shorts | use the TikTok margins as the safe superset | | | |

- **One rule for all three** (unknown or multi-platform placement; a single named platform uses its own row above): keep everything readable inside x 120–840, y 270–1210. That is the TikTok right column plus the Reels top band plus the TikTok bottom band.
- The hook line goes just below the top band (y 270–450). Offers and CTAs go centre or centre-left, never bottom-right.
- Captions in vertical ads sit about 58–63% down the frame (caption block inside y ≈ 1110–1210), above the bottom UI band and below a face.
- If the video also ships outside the platforms (a site, a store), the margins still do no harm.

### 1:1 (1080 × 1080) and 4:5 (1080 × 1350)
- 5–8% margins (54–86 px).
- 4:5 previews may crop to the centre 1:1: keep key content inside the central 1080 × 1080 (y 135–1215).

### Multi-aspect deliverables
Design to a centre-weighted core that survives 16:9 → 1:1 → 9:16, or re-lay-out type per ratio (preferred). In 9:16, break headlines into 2–4 words per line and stack them rather than shrinking one long line.

## 6. Type sizes that read

The sizes are the house design standards, kept in one table in `three-type` (§ "One type system per film"): hero headline 72–130 px, supporting line 34–48, labels and annotations 28–34, uppercase eyebrows 28 at wide tracking, and **28 px as the floor for anything, anywhere**, at 1080 px on the frame's short side (1920 × 1080 and 1080 × 1920 alike; scale by the short side for other resolutions). In 9:16, break headlines to 2–4 words a line rather than dropping below 72 px. Word-timed social captions over footage follow the social caption spec in `ugc-craft`.

- **Feed sizes** (a 9:16, 1:1 or 4:5 feed cut, a landing-page hero or homepage autoplay, or a 16:9 master that also plays in a feed, where the frame is shown at about a third of its size): message lines ≥ 90 px, and any label that carries the argument (a counter, a chip the hook depends on, a "before / after" tag) ≥ 40 px. A 28–34 px label is texture there; it may decorate, never carry the claim.
- Contrast ≥ 4.5:1 for anything read; the house sets 5.3:1 as the dimmest tone allowed for small text.
- Hierarchy ratio between levels ≥ 1.5–2×.
- A low-contrast accent (< 4.5:1 on its ground) never carries text under 60 px; accents are for display type, fills and glows, never body copy.

## 7. Holds that end a film

| Style | Logo / lockup hold after it lands |
| --- | --- |
| Most families | 75–120f (2.5–4 s) |
| Beat-cut, hyper styles | 10–30f, by design |
| CTA or URL that must be read | ≥ 60f, and by the text formula above |
| End-card lockup of 8–9 words (name + tagline + platform line) | ≥ 90f, read in two glances; the one exception to the feed's ≤ 7 words |

The final hold is calmer than everything before it: one ambient behaviour at most, no new information after the CTA (a designed loop seam's last 15–25f, which grow the first frame back, are exempt).

## 8. Worked budget: 30 s click-to-play launch film, VO-led

1. Length 900f. VO window: starts at 6f, ends at 840f (last 60f VO-free) → 834f ≈ 27.8 s → at 2.3 words/s, **64 words** maximum.
2. Energy High in the cascade (new information every 20–25f), Medium elsewhere (30–40f).
3. On-screen lines: hook "Invoices that chase themselves" (4 words → 51f hold) — fits in a 75f hook beat with a 12f entrance and a 9f exit.
4. Logo lands at 800 and holds 100f to 900.
5. Check: the beat table's frame ranges sum to 900; every row's text hold ≥ its formula; VO words ≤ 64.
