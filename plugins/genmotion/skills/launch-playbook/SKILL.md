---
name: launch-playbook
description: "The product launch film, 15 to 90 seconds: five story shapes (problem-first, demo-first, manifesto, metric-first, category-creation) with the selection rule, peak placement by kind of film (an early reveal, or a name reveal plus a later outcome peak), frame-budgeted beat sheets for 15, 30, 45 and 60 seconds with VO word budgets, the reveal and hero-shot craft measured from GenMotion's launch templates, the music or VO sound plan, social proof rules and recuts per destination. Load it for a product, app or company launch video."
---

# Launch playbook

A launch film has one job: make the product look inevitable. The viewer should know what it is by the second beat, see it working by the third, and remember one moment from it. This skill is the format's structure; `direction` decides the film's proposition, idea and style family first, `motion-language` supplies every move's timing, and `sound-design` the mix. Frames are at 30 fps.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, and never putting words in a real person's mouth. The checks at the end are a quality bar to clear, not a template to reproduce.

## When to use

- A product, app, feature-set or company launch: "launch video for my new app", "Product Hunt video", "promo for our SaaS launch", "turn our homepage into a launch film".
- A funding announcement that is mostly about the product (if it is mostly about the number, use `announce-milestone`).

Another owner fits better when:

| The ask is really | Owner |
| --- | --- |
| One feature shipped to existing users | `announce-feature` |
| A number going up, no product to demo | `announce-milestone` |
| Only the logo, 2–8 s | `brand-sting` |
| A store listing preview | `app-store-preview` |
| A 1–3 minute tour of one workflow | `demo-walkthrough` |
| Cutting the user's own footage (founder on camera, event clips) | `video-editing` |
| A vertical paid social ad | the `ugc-*` owners |

## Ask first (only what changes the film)

1. **What is the product, and the one thing it does that the alternative can't?** This becomes the proposition. Offer your best guess from their site.
2. **Where does it run first, and with sound?** A landing-page hero (16:9 muted autoplay loop), a click-to-play film or keynote (16:9, sound on) and feed (muted, 1:1, 4:5 or 9:16) are different films, not recrops.
3. **What real material is there?** Screens or a recording, a logo file, a true number. It decides the style family and whether metric-first is possible.

When the user says "just make it" and material is missing:

- **No screens** (an app or web product): build a **representative UI of the core flow** (for an invoicing app: the draft invoice → the reminder it sends on day 7 → the "paid" stamp), in the brand colours, generic chrome, no features beyond the brief. Build it from this product's specifics, not the category's literal pipeline (input → AI processing → output list) that every competitor's film already shows: lead with the product-specific noun (the invoice that was 40 days late, the doc you owed) and let the pipeline stay implied. Record it under "I assumed" as "illustrative UI, replace with real screens". On Three.js, `three-assets`' `references/drawn-ui.md` has the tested helpers (screen panel, status bar, fields, chips, buttons, list rows, grey copy bars; 2× canvases, nothing seen under 28 px). An app launch in which no device or screen ever appears fails: the viewer must see *that it is an app*, not only what it does.
- **No logo file**: set the product name as a wordmark in the brand's face (or the house face), and give it a hero mark beside it; a bare wordmark loses the product's identity at the peak. Which mark (`brand-sting` has the full no-logo policy; this is how a launch applies it):
  - **The product is an app** (phone, desktop, web app): draw an **illustrative app icon** and prefer it as the hero mark. It is part of the illustrative UI, not a logo: the same glyph the viewer has already seen in the film (on the home screen, in the dock or tab, as the button they pressed), built in one file (`components/brand.ts`) so the real icon replaces it 1:1, and listed in `VIDEO.md` under "I assumed" as "illustrative app icon, swap in the real one". Simple geometry in the brand colours on the platform's icon shape (a rounded square for iOS and macOS, a circle or squircle for Android); never imitate a known brand's icon, and when the product already has a real icon somewhere, ask for that file instead of drawing one.
  - **Infra or a data service with a web UI** (a database, an API platform, an analytics or security service): prefer the **motif carried from the device** over a drawn app icon, because the viewer never saw an icon in the film but did watch the device; draw an icon only when the film showed the app's icon in use (in a dock, a tab, a launcher).
  - **Not an app** (a service, a company, a device, an API): a motif built from the film (the waveform that settles into one clean line under the name) may sit beside the name, flagged in `VIDEO.md` as "motif, not a logo"; never present an invented symbol as the brand mark.
  - Either way, never call what you drew "the logo". **The mark is carried, not redrawn**: one element of the idea persists from the last UI beat through the hero into the end card, where it becomes the motif. An end card that redraws the icon or motif from an empty field drops the idea's culmination.
- **Props need content** (an invoice needs a total, a calendar needs events): fictional names and plausible amounts are fine as illustration; they are not claims, and `VIDEO.md` says so. Claims (users, savings, ratings) still trace to the user.

Everything else (length, music, voice, palette) you choose and state under "I assumed".

## Pick the shape

Pick one. A film that is half manifesto, half demo reel loses both.

| Shape | Opens on | Wins when | House exemplar |
| --- | --- | --- | --- |
| **Problem-first** | The failure state, no product in sight | The pain is universal and instantly felt | Gojiberry launch (the cold DM nobody answers), ElevenLabs voice-AI launch (phones ringing, no one picks up) |
| **Demo-first** | The product already working | Watching it is more convincing than any claim | Codex launch (speak → it builds), Notion dock, Claude MCP launch, Prequel launch |
| **Manifesto** | The sharpest line of a point of view | A crowded category where the difference is a stance | "Don't Blink" GPT-6 film: kinetic type, no UI |
| **Metric-first** | A true, surprising number already moving | The number is real, recent and the strongest asset | Lovable funding (idea → apps → wall → "$400M") |
| **Category-creation** | A reframe: what kind of thing this even is | Nobody has a word for it yet | Google generative AI (a ring of tiles becomes the headline) |

Rule: if the demo is visually strong on its own, demo-first. If the problem is more relatable than the product is impressive, problem-first. A real, startling number beats both. Manifesto and category-creation are high-risk, high-ceiling; use them when the user asks for a point of view or there is no UI to show. `references/shapes.md` has each shape's beat-by-beat adaptation and the 90-second structure.

## Direction defaults for a launch

Write these into the Direction block in `VIDEO.md` (`direction` Step 4–9) unless the material says otherwise.

- **Style family**: K (social title-card launch) for a feed or X cut of 8–30 s posted under a message, with B, C or the perspective UI showcase supplying its product beats (`launch-taste` style map); B (soft-light SaaS) for app or web UI; C (3D product hero) for consumer, fintech or physical-feeling products and when the project should look like Three.js; A (beat-cut kinetic type) for manifesto and when there is only copy and a logo; D (one-shot camera film) for a desktop or phone journey; I as a closing borrow for a brand-led company launch.
- **Energy curve**: the peak's place is set by `launch-taste` step 7's kind of film, not by this skill. **Reveal-led** (the name or product is the news): quiet tease (3) → build (5) → **reveal (9–10) at 25–33%** → cascade (6–8, a micro-peak per run) → hero + name (8) → end card (3); the beat sheets below are laid out this way. **Accumulation or outcome** (a count, a fill, a build that completes): the two-peak shape, the name reveal at 25–33% as a secondary peak (≤ 7) naming what the viewer already watched, and the device's completion at 60–75% as the 10; move the breath to before the completion. A 10–30f breath before the 10: stillness, a music dropout, or black.
- **Feed placements** (Instagram, LinkedIn, X, store autoplay, **a landing-page hero or homepage autoplay**, or a 16:9 master that also plays in a feed): the product in context (its icon, UI, device or the object itself) is on screen by 3–4 s and the mark is in frame by 4 s (a small header tag or the mark in a corner is enough), even when the reveal comes later; the reveal then names what the viewer has already been watching. Message lines ≥ 90 px and any label that carries the argument (a counter, a chip the hook depends on) ≥ 40 px at 1080p, because a feed shows the frame at about a third of its size; smaller labels are texture. The dead-hold limit is 1.5 s: a line whose hold formula runs longer holds, and the device acts during it.
- **Pacing**: Medium (new information every 30–50f) for VO-led films; High (18–30f) in the feature cascade and for music-led films; Hyper (8–14f) only for an A-family montage passage.
- **Transitions**: signature from the reveal device (flood becomes object, iris from the clicked button, rush into the lens, match-push into the UI); workhorse persisting element (B, C) or exit-then-cut (VO-led). Hard cuts only on the beat. One direction of travel, left to right.
- **Sound**: music-led (track at 1.0, or 0.5–0.6 under SFX) when there is no VO; VO-led with a bed at 0.18 (−15 dB, `sound-design`'s bed row: 0.1–0.2 under any voice) otherwise. 110–128 BPM build-and-drop with the drop on the reveal; ask for 120 BPM (15f per beat, 60f per bar) so the grid sits on frames. Sonic logo on the mark. The product's key action (a shutter, a send, a click) always has its own sound; with no `sfx`, use `sound-design`'s synthesised placeholders.
- **If the product makes sound, the bed steps aside and the viewer hears it** (a music app, a soundscape or white-noise generator, a voice or podcast tool, a synth, a meditation app). Hearing the output is the demo; a waveform drawn under someone else's score is a claim. For 2–4 s (60–120f) on that feature's beat, duck the score 10–12 dB (gain 0.25–0.3; fade down over 8–12f) and play the product's own sound at speech level; the drawn picture of it (waveform, meter, spectrum, a pulsing ring) is driven by that audio's measured amplitude per frame, not by a sine, so what you see is what you hear. The score returns for the hero. With no real recording, use `sound-design`'s synthesised ambient bed (or a `voiceover` read for a voice tool) and flag it in `VIDEO.md` as a placeholder for the product's real output. **One intimate voice** (a diary, a voice note, a private recording) is never stood in for by the crowd murmur, which reads as voices through a wall: without `voiceover`, the on-screen words carry it with a close breath or room tone under the recording frames; with it, the real line recorded close and dry, the bed out (`sound-design`'s `references/sfx-cues.md`).
- **A flat library track** (no build or drop; the same phrase gap every few bars) has no peak until you give it one:
  1. Search the onset dump (`sound-design`, Beat grid) for a natural dropout followed by a hit, and cue the track (`startFrom`) so the hit lands on the reveal frame.
  2. Make the breath unique: over the 10–30f before the reveal, duck the bed 10–12 dB (or filter it with `ffmpeg`'s `lowpass`/`highpass`), full band again on the reveal frame, so it does not sound like every other phrase end.
  3. Duck the bed 3–4 dB under the cascade, so the reveal and the mark have headroom.
  4. End on a phrase ending under the mark, or fade the tail over ≥ 45f after the mark lands; never a mid-groove cut in the last frames.
  Check: the 0.5 s RMS of the breath is lower than any other gap in the film, and the export's loudness range (LRA) is above about 3 LU.
- **Landing-page hero**: it autoplays **muted** and usually loops, so the whole message lives in picture and type; sound is a bonus for the click-to-play version. It is a feed film: it plays at about a third of its size beside the page's own headline, so the product or mark is in frame by 3–4 s, message lines are ≥ 90 px, and the 1.5 s dead-hold limit applies. The file must be small (≤ 5 Mb/s at 1080p, faststart), and the last frame must cut back to frame 0 cleanly (both are Delivery blockers in `direction`'s critique; "left as deliberate" does not clear them). A loop and an end card meet in one of two ways; pick one in the Direction block:
  1. **Designed seam** (one file): frame 0 is built on the end card's ground (the same brand hex, the same vignette or none), and the lockup's last 15–20f make a move that becomes frame 0's first element: the motif's last stroke becomes the first UI element, or the lockup shrinks into the phone's screen where frame 0 opens. The hook then opens mid-action from that element. Those 15–25 seam frames are exempt from the end card's "nothing new after the CTA". Frame 0's elements appear only after the ground has fully returned to frame 0's ground: one faded in while a flood is still contracting composites to a grey half-object on the loop.
  2. **Two deliverables**: the click-to-play master ends on the end card; the hero loop is a separate export that ends on a hero frame matched to frame 0's layout and ground (the mark lives in the page around the video).
  Check either way: last frame vs frame 0 at 320 px wide, PSNR ≥ 30 dB (the command is in `direction`'s critique §1), or the seam is one of the film's designed matched cuts, visible as a continuous move on a strip across the loop point.
- **The peak is the biggest picture change**: the 10 gets the film's largest scale change or camera move (a push through the phone, the product growing to fill the frame), at least 2× any other move in the film, not only a flash or a colour change on the same layout. It must read with sound off: the picture change lands on the hit frame and the words change with it (a word swapped, a counter snapping to its new state). If the restraint budget spends the camera as the broken rule, the hero beat moves the subject (a turn, a lift, a scale-up), not the camera. The craft of a camera-carried peak (`three-camera`, Moves that carry the peak):
  - **Pre-roll**: the move's ease-in starts 10–14f before the hit, so on the hit it is visibly under way (about 40–60% of its peak speed). A move that starts on the hit, or 4f before it, leaves the hit frame looking still with a headline on it.
  - **A push reframes**: 1.7–3.8× (this skill's range for a launch peak; `motion-language`'s 1.3–2.5× is for ordinary pushes), ending with the subject in the centre third and ≥ 40% of the frame's height. A subject grown in place at the frame edge, with the rest of the frame empty, is not a push.
  - **A pull-back as the broken rule scales about the focal element**, which stays fixed on screen while the world arrives around it; never a re-layout that slides rows across the frame.
  - **Type during the move**: labels belonging to the world land after it settles; the world is routed out of the headline band, or fades under a feathered knockout (≥ 40 px soft edge), never a hard-edged patch.
- **No peak on a flat flood**, whether it is the name reveal or the payoff line. The device completes on screen and holds ≥ 30f before any flood; the name lands on the product's own glyph (the flood, iris or push contracts into the app icon, the shutter button, the product's silhouette, which becomes the hero mark beside the name on the hit), and a payoff line sits on or beside the completed device. A plain word on a flat colour could close any competitor's film; the glyph or device the viewer just watched is what makes it this product.
- **Memorable moment**: the reveal, built from the idea: the send button floods the frame and contracts into the product; the camera pushes through the phone into the UI; "Introducing" deletes itself and types the name; the headline slams out of the lens.

## Beat sheets

Frames at 30 fps, laid on a 120 BPM grid (bar = 60f); snap boundaries to your track's bars. VO budgets use the house 2.3 words/s over the VO window (VO starts 6f in, last 60f VO-free). "Words" is the on-screen line; its hold must meet `max(30, 9 × words + 15)` frames from the frame it is legible.

### 15 s (450f), feed teaser or homepage loop

| # | Frames | Job | Content | Typical motion | Sound |
| - | - | - | - | - | - |
| 1 | 0–60 | Hook | Product mid-action or the problem state, line ≤4 words | Already moving at frame 0; the family's headline entrance by word (`motion-language`) | Frame-1 transient or downbeat |
| 2 | 60–150 | Reveal (peak at ~120) | Product's glyph + name land | Flood or rush-into-lens 10–24f contracting into the icon; name slam 14f, starting 14f before the hit so it is legible on it | Dropout 1 beat before, hit on the land |
| 3 | 150–360 | Proof | 1–2 runs of input → response → result | Cursor 16–26f, click 4f/6f + ring, push 24–48f | Click 0.8–1.0 per press |
| 4 | 360–450 | End card | Mark + name + URL or platform line | Mark on gentle spring 14–20f, holds ≥75f; the URL or platform line holds ≥60f | Track's button on the mark |

VO: ≤30 words, or none. Music-led is the default at this length.

### 8–20 s social cut (the title-card interleave, family K)

The shape most launches posted on X and in feeds take (`launch-taste` §The social launch cut). The post carries the details; the film carries the feeling and two or three facts.

| # | Frames | Job | Content | Typical motion | Sound |
| - | - | - | - | - | - |
| 1 | 0–45 | Hook | A kinetic opener already moving on frame 0 that resolves into the product's glyph or control, or the control acting | Glow-resolve or a scatter re-forming round an inline glyph; a typed request | Transient on frame 1 |
| 2 | 45–100 | Claim + name | "Now ___" or the claim, the name or mark docked beside the product | Card by word, out on the ground's move | A beat per card |
| 3 | 100–420 | 2–3 pairs | Card (a term or a fact, 2–4 words, hold formula) → product beat (45–90f: the control lifted, a tilted screen pushing, a typed request answered) | Rise-through or brand-shape pass between them; each product beat enters already moving | Effects on the product beats, quiet cards |
| 4 | peak, 75–100f | Physical payoff | The control at poster scale with numbers ticking, a burst out of the toggle, the result landing | The biggest scale change of the film | The hit; the bed thins |
| 5 | last 60–75f | URL card | Mark + URL (or platform line) | Card by word; one ambient behaviour | The button |

An 8 s sting is beats 1, 2, 4 and 5 only (object → claim → "now live" → URL). At 25–30 s use three pairs and give the peak about 3 s. Never longer than one idea per pair.

### 30 s (900f), the default

| # | Frames | Job | Content | Typical motion | Sound |
| - | - | - | - | - | - |
| 1 | 0–60 | Hook | Shape's opening move, ≤4 words | In motion at frame 0 | Transient on frame 1 |
| 2 | 60–240 | Setup + claim | The problem or the claim; **the problem or the proposition is on screen by frame 240** (reveal-led: the proposition) | Exit-then-cut or persisting element; breath 225–240 | Sparse; music dropout 225–240 |
| 3 | 240–330 | **Reveal** | The product arrives through the idea's device and lands as its own glyph + name | Signature handoff contracting into the icon, camera push 24–48f; name slam completes on 240 | Riser ends on 240 (none when the chosen track has its own dropout → hit there); hit + drop on 240 |
| 4 | 330–720 | Feature cascade | 3 features × 120–150f, each a run on the same surface: input → response → result | UI magnified 2–2.5×, cursor-driven, persisting element between features | A click or tonal note per feature, on the bar |
| 5 | 720–810 | Hero | Product at its most iconic + one line | Slow orbit or pull-back 45–52f | Full track |
| 6 | 810–900 | End card | Mark + name, then the URL, or with no URL a platform line | Mark lands by 825, holds 75f; URL or platform line in by 830, holds ≥60f | Button on the mark, tail rings out |

VO: ≤64 words. Directed example (beats, cues and shots) in `direction`'s `references/planning.md`.

**Accumulation or outcome at 30 s** (the two-peak shape): hook 0–60 with the thing counted against already on screen · the device (its first unit) on screen and acting by 60; the first run of units ≤ 75–90f, nothing visible stopping for > 30f between units, a thin unit shown large first (≥ 15% of the frame width) · name reveal 210–300 as a secondary peak (≤ 7) **beside the device while it keeps acting** (docked beside it or read off its header, no flood, never a mark and name alone on an empty ground: that is a mid-film logo card, and the film gets one, at the end) · units tighten 300–560 · breath 10–30f · **completion (the 10) at 540–675** on the device, held ≥ 30f · outcome / hero to 810 · end card 810–900. A duration claim in the brief ("ready in 30 seconds") is shown compressed, ≤ 75f in visible steps or a time-skip, never waited out.

**One-capability products** (the brief names one thing the product does): the cascade is the **same run at rising scale**, not three features: one item through the whole flow (about 150f) → three at once (about 90f) → a montage of many in 30f. "Many" is many of the **device's own event** (many parcels routed, many requests answered, many files restored), never a wall of generic cards, tiles or dashboard panels. The device is in every run; a contrast device (two worlds, before and after, a refused crossing) keeps **both sides in frame**, the antagonist inert or empty while the product works. It ends on the brief's **promised outcome made visible** as an artefact (the report filled in, the export sent, the inbox at zero, the "done" state), not on new copy, and the artefact **holds ≥ 30f after its last unit lands**, like a device completion, before anything carries it away. When the run's first half is the category's (the thing every competitor also does), the 10 goes on the half only this product does, even a subtraction (many → none), per `launch-taste` step 2. Never invent a hero line the brief didn't give: the brief's own tagline carries the hero, split across beats if it has two halves. **Each run's line adds one new fact the brief supports** (what goes in, where it runs, what comes back, how fast); a paraphrase of the proposition, or the same totals shown three ways, is padding, and a run with nothing new to say carries no line.

**One physical claim (hardware, an object, a wearable)**: the same shape with the object as the surface. One claim, made physical on the object and built up: the headline spec is a **visible state on the object** (a charge arc that barely moves across days, a reading on its face, a seal that stays dry), present from frame 0 so the tension is in the first frame; each run raises the stakes on that state rather than listing another spec. Show the object at **≥ 35% of the frame width** at least once, with one close-up on its material, and give the 10 a push in to the object, not a wipe across it. A second or third spec rides in the end card, not as its own feature beat.

### 45 s (1350f)

Hook 0–90 · setup + claim 90–330 (proposition by 330, breath 310–330) · **reveal 330–420** (25–31%) · cascade 420–1080 (4 features × 165f) · proof 1080–1170 (a number or logos, only if real) · hero 1170–1260 · end card 1260–1350. VO ≤98 words.

### 60 s (1800f)

Hook 0–90 · problem or claim 90–450 (2–3 beats of 120f, proposition by 450, breath 430–450) · **reveal 450–540** (25–30%) · demonstration 540–1380 (3–4 runs of 210–280f, each input → response → result → benefit) · proof 1380–1530 · hero 1530–1680 · end card 1680–1800. VO ≤134 words. Past 90 s without a second story, the material belongs in `demo-walkthrough`.

## Script and VO

- Hook in **outcome language**, never inventory: "Invoices that chase themselves", not "12 new features". If the first line starts "Introducing" or "Welcome to", rewrite it. Exceptions: the typewriter-delete device (the word exists to be deleted), and in a social cut a kinetic opener that moves from frame 0 and resolves into the product's glyph or control within 2 s.
- **Cards, not sentences, in a social cut**: "Now ___", one term per card with a full stop, a setup and payoff split across two cards, a number with its unit, the URL last; one accent word per card on the benefit noun; at least half the cards a fact only this product can say (`launch-taste` §The social launch cut).
- One idea per line, written as cues ("You ask — it searches — it answers") so each visual can land as the voice names it.
- VO starts 6f after the film starts and 3–8f after each cut (house median +6f); a line may pre-roll up to 45f to bridge a cut. Write numbers as spoken; the picture shows the exact figure.
- Over budget: cut words, never speed up the read. Word counts within 10% of the beat sheet.
- Music-led (no VO): on-screen lines carry the story at ≤7 words per frame, one line per beat (the end-card lockup may run to 9, End card below).
- Read each problem line alone, muted: if it could be the product's tagline, it is not the pain yet; rewrite it (`direction`'s copy read).

## Launch craft (numbers from the house templates)

- **First frame**: the product doing something, a transformation already half-way, a number already moving, the manifesto's sharpest line, or (in a social cut) a kinetic opener already in motion. Never a logo, a black card, a static title card, a mission statement or a person about to speak.
- **UI**: rebuild the real screens at true proportions and magnify the part that matters 2–2.5×; never paste a full screenshot flat. Camera pushes 1.7–3.8× onto the control that matters, 24–48f inOutCubic. Typing 2–3 frames per character with a solid caret. Click: press 4f in, 6f out, scale −8 to −15%, ring 8–14f.
- **One demo is a run**: three or more beats on the same surface (input → response → result → benefit) joined by persisting elements. Single-shot features with a new layout each time read as a slideshow.
- **Same surface, different framing**: each run gets its own camera move (push into the line being read, track to where it files, pull back to the result), and runs shorten as the viewer learns the pattern (for example 150 → 110 → 60f, the last a montage of several at once). Three runs with one locked framing read as one shot played three times.
- **Flashes**: one big flash (the reveal) is the signature. A flash the product itself makes (a shutter on a phone screen) may repeat on that action at 0.25–0.4 of the reveal flash's peak opacity, ≤ 4f, over its own area only (the screen), additive toward white or the accent so it contrasts ≥ 50% in mean luma against the frames either side, **measured within that area**; a flash that composites to grey is a dip and is cut, and a flash into an already bright plate reads as a bloom.
- **The reveal**: build the 10–30f before it calmer. **When the end card repeats the reveal's lockup**, the reveal holds only its legibility formula (`max(30, 9 × words + 15)` from legible), then hands straight into the first run: the lockup docks into a header or corner while the run's first motion has already started (overlap 10–15f), with no empty window between; one logo card per film, at the end (a name reveal on an empty ground mid-film, with nothing of the device in frame, is a logo card). When the 10 is a device completing on the product's own surface, the name may land ≤ 45f after it, beside the completed device, rather than on the same frame. Device timings (`motion-language`): flood 6–13f ease-in then contract 10–13f; iris 16–34f; rush into the lens 10–24f; slam z 6 → 0 with scale 0.7 → 1.04 → 1 over 14f, **ending on the hit frame** (start it 14f before the hit, so the name is legible on the hit; an entrance that starts on the hit lands half a second late); typewriter "Introducing" at 2.4 f/char, delete at 2.1, name at 2 f/char.
- **Hero type**: sizes from `three-type`'s house table (hero 72–130 px at −0.02 to −0.03em, weight ≤ 500; supporting 34–48; labels 28–34); feed headlines ≥ 90 px, and labels that carry the argument ≥ 40 px when the film plays in a feed (Energy curve, Feed placements). Only the name or the one number that *is* the image goes bigger. One accent colour, on the focal element and CTA only. Printed matter on a prop (an invoice's line items, a document's body) is drawn as grey bars, never as glyphs under 28 px. **Exception: when the product's output is text or content** (a writing tool, a summariser, a translator, a code generator), the output is the hero: at the payoff it is real, legible text at ≥ 60 px, a few lines magnified, never bars.
- **End card**: mark lands on a gentle spring (no overshoot) 14–20f, holds 75–120f (2.5–4 s); a URL or CTA holds ≥60f and its text formula. **No URL given**: a platform-and-where line instead ("for macOS · Today on Product Hunt", "Available on iOS", "Free on the web"), from what the user told you about the launch, held ≥60f at supporting size (34–48 px); a launch film never ends on a name alone. **Hardware or a product sold on a product page with no URL or platform**: the product name, the brief's two strongest claims at supporting size, and "Available now" or the launch date if the user gave one (never invent a date or a price). Calmer than everything before it. **Word count**: name + tagline + platform line may run to 9 words, over the feed's ≤ 7, if the card holds ≥ 90f and reads in two glances (the name, then the line at ≥ 40 px in a feed); beyond 9, cut the tagline, never the platform line. It follows the brand-identity look (`three-look`): the brand hex exact at centre and corners, no grain, no vignette (or, if a lift stays, a static 1–2% grain so it does not band), with the film's lift, vignette and grain faded out over ≥ 20f into it; the lockup centred optically as one group (mark + name + tagline), and every mesh from the previous beat hidden once it has handed off.
- **Social proof**: only if real and strong. Numbers before names. Logos 60–90f in a row, never long enough to read one by one, never before the demonstration, never a relationship the user hasn't confirmed. No invented numbers or quotes; leave a bracketed placeholder and say so.

## Destination recuts

Build the master for the first destination; the others are recuts of the same beats, re-laid-out per ratio rather than cropped.

| Destination | Aspect, length | What changes |
| --- | --- | --- |
| Landing-page hero, homepage autoplay | 16:9, 10–30 s loop | A feed film: muted autoplay, every beat readable in picture and type, brand by 3–4 s, message lines ≥ 90 px, 1.5 s dead-hold limit; loop-safe last frame; H.264 ≤ 5 Mb/s at 1080p, ≤ 15 MB, `+faststart` |
| Click-to-play page film, keynote | 16:9, 20–60 s | The master. Sound on, the reveal can breathe |
| Product Hunt, a store page (launch film, not a store-spec preview) | 16:9, ≤60 s | Muted-first, treat as a feed: every claim on screen, hook by frame 15, product in context by 3–4 s |
| X, LinkedIn | 1:1 or 4:5, 15–45 s (or the 16:9 master, sized for the feed) | Captions carry it; message lines ≥ 90 px, argument-carrying labels ≥ 40 px; product in context by 3–4 s, mark in frame by 4 s; 4:5 keeps content in the central 1080 × 1080 |
| Reels, TikTok, Shorts | 9:16, 15–30 s | Re-lay type 2–4 words per line; everything readable inside x 120–840, y 270–1210; Hyper/High pacing |
| YouTube | 16:9, up to 90 s | The longest cut; sound on is common, the hook still lands before 5 s |

## Building it

- **Three.js (default)**: `three-look` before the first scene (stage, light, tone mapping), `three-type` for canvas-texture headlines and per-word planes, `three-assets` for screenshots, the logo and video textures, `three-camera` for pushes, orbits and the push through a screen, `three-transitions` for floods, irises and flashes as camera-parented planes. Rebuild UI as planes with canvas-drawn content (`three-assets` `references/drawn-ui.md`); an orthographic camera (or a fixed-distance perspective one) keeps pixel sizes exact for family B. Put shared handoff poses in `components/` so both scenes import them.
- **HyperFrames**: one sub-composition per beat in `scenes/`, the timeline slots in `index.html`; the same numbers, as timeline tweens and `<audio>` elements.
- **React**: one scene per beat, `@genmotion/motion` eases and `<TextAnimation>` for headlines.

## Good and bad

- Bad: logo fade-in, "Introducing Acme", a feature list with icons, a stock-music swell, a logo for 1 s. Good: the cursor is already typing a request at frame 0, the answer builds, the send button floods the frame and contracts into the app's icon, which lands beside the name on the drop.
- Bad: three features, each a new screenshot with a different transition. Good: one surface, three runs, the same card persisting and morphing between them, each run framed by its own camera move and shorter than the last.
- Bad: "Loved by teams everywhere" over a logo wall at second 3. Good: the real "4.9 ★ from 2,100 reviews" as its own beat after the demo.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Brand, copy, screenshots | `web-research` on the product's site, `save-asset` for real files | Ask the user; on "just make it", a representative UI, a wordmark and (for an app) an illustrative icon, all flagged (Ask first); never invent a claim or number |
| Narration | `pick-voice`, then `voiceover` | Music-led cut carried by on-screen lines |
| Music | `music` | Per `sound-design`'s ladder; with nothing licensed, an SFX-led film |
| Effects | `sfx` | Credited CC0 sounds, or the music's own transients |
| Placing audio | `place-audio` | Edit the project's audio list by hand |
| Seeing it | `capture-frames` | None: do not report quality you have not seen |
| Mix and loudness check | `ffmpeg` | None: an unmeasured export is not finished |
| Direction, moves, mix | `direction`, `motion-language`, `sound-design` | — |

## Checks before you finish

1. `VIDEO.md` has the Direction block and a Beats table whose frames sum to the length; the shape is named.
2. `capture-frames` at frame 0 and frame 15: not a logo, not black, not a static title card (a kinetic opener visibly changes between the two captures and resolves into the product's glyph or control by frame 60); the hook is readable by frame 15.
3. The problem or the proposition is on screen or in the VO by the end of beat 2 (frame 240 at 30 s, 450 at 60 s); a reveal-led film shows the proposition itself by then. Feed placements (a landing-page hero included): the product (icon, UI, device or object) is in frame by 3–4 s and the mark by 4 s (capture 120f). Capture frame 60: the device (or, for an accumulation, its first unit) is on screen and acting; no frame between 60 and the 10 shows a mark and name alone on an empty ground.
4. The peak sits in `launch-taste` step 7's band for this kind of film (reveal-led: the reveal at 25–33%; accumulation or outcome: the completion at 60–75%, with any name reveal at 25–33% as the secondary peak); the 10–30f before the 10 are visibly calmer (capture both) and the music drops out or thins there. Neither peak is a line on a flat flood (the completed device holds ≥ 30f first), and the peak frame alone, with no audio, shows the turn. The 10's scale change is at least 2× any other move in the film; a camera-carried 10 differs visibly in scale between the hit frame and 2f before it, and a push's last frame has the subject in the centre third at ≥ 40% of frame height.
5. Mute check: on captured frames alone (no audio), a stranger can say what the product does **and what kind of product it is** (app, web tool, device); an app film shows a screen or device.
6. VO words ≤ the budget for the length; the last 60f are VO-free; spot-check two cuts that VO starts 3–8f after them.
7. Every on-screen line meets its hold formula (capture its first legible frame and its exit's first frame).
8. The end card's mark holds ≥75f with at most one ambient behaviour, and the music's button lands on it within 1 frame; a URL, CTA or platform line is on it for ≥60f. The reveal frame and the end card each show the product's glyph (icon or motif) beside the name, never the name alone on a flat field, and it arrived there from the film (a strip across the hand-off shows it persisting), not redrawn from an empty field.
9. Every claim, logo and quote traces to something the user gave you; illustrative UI, a drawn app icon and prop content are labelled as such in `VIDEO.md`; an invented icon or motif is never called the logo.
10. If the product makes sound: on its beat the score's 0.5 s RMS sits 10–12 dB below its level either side (`ffmpeg` `astats` on the score stem), the product's sound is audible there, and the drawn waveform or meter visibly follows it (capture a loud and a quiet frame).
11. `ffmpeg` `ebur128` on the export: the integrated loudness `sound-design` sets for this kind of mix (−14 LUFS ±1 for a music- or VO-led film), true peak ≤ −1 dBTP. The file fits its destination (a landing-page hero ≤ 5 Mb/s with faststart; `direction`'s critique has the commands). A loop: last frame vs frame 0 at 320 px, PSNR ≥ 30 dB, or a designed seam (see Landing-page hero); with two deliverables, both files exist and each passes its own check.
12. The demo runs differ in framing and shorten (one-capability: the same run at rising scale, ending on the promised outcome as an artefact, with no hero line the brief didn't give); one captured frame per run shows the device (both sides of a contrast device) and no run is a grid of generic tiles; each run's line adds a fact. Hardware: one frame shows the object ≥ 35% of the frame width and the spec as a state on it. When the reveal's lockup returns on the end card, the reveal holds only its formula before the first run starts. The outcome artefact holds ≥ 30f after its last unit lands. No stretch of more than 2.5 s without a change (1.5 s for a feed or landing-page hero): every `freezedetect` range has a 4 fps strip you looked at (critique §1), a line held at its formula has something else visibly acting, and no confirmed dead hold is "left as deliberate". The end card matches the brand hex with no grain (or keeps its dither on a lift), and a strip across its hand-off shows the finish fading over ≥ 20f.
13. The `direction` self-critique passes (swap test fails for a competitor; rubric average ≥4, no axis below 3), and `validate` passes.
