---
name: device-mockup
description: "A convincing generic phone and a mobile app UI rebuilt in Three.js, measured from a polished launch film: the device as ratios of its width (flat slab, thin metal ring, black bezel, camera pill, status bar, home indicator, two-layer soft shadow) with its screen a render target clipped to the rounded glass; a canvas-drawn app kit (nav, chips, image cards, lists, typing inputs, a three-state button, sheets, toasts, streaming chat, library, detail, glossy stickers); and its motion on a beat grid. Load it when a video shows an app on a phone."
---

# Device mockup: a modern phone and its app, in motion

A phone on a quiet stage with the app working inside it is the backbone of most app launch films. Done well, it reads as the real product; done badly (a black rounded rectangle, a stretched screenshot, UI text too small to read), it reads as a template. This skill is the full kit for the good version on Three.js: four tested modules, the device measured as ratios, the UI system as a type scale and tokens, and a motion vocabulary in frames, taken frame by frame from a 45 s, 115 BPM, 1080 × 1920 launch film and then corrected where that film was weak.

It builds on, and does not repeat: `three-camera` (`components/stage.ts`, `components/ease.ts`), `three-type` (`components/type.ts`: `withFonts`, `label`, `line`, `setLabel`, `onTop`), `three-assets` (`components/ui.ts` from its `references/drawn-ui.md`: `canvasPlane`, `roundRect`, the 28 px floor), `motion-language` (entrance, exit and spring numbers) and `launch-taste` (the "UI-led story film" family in its `references/style-map.md`). Copy those modules first, then the ones here.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, and never putting words in a real person's mouth. The checks at the end are a quality bar to clear, not a template to reproduce.

## When to use

- The video shows an app on a phone: a launch, a feature announcement, a demo walkthrough, an app store preview, a screen demo in an ad.
- There are no usable screens yet (concept, pre-launch) and the UI must be rebuilt as illustrative chrome, or there are screenshots that need a convincing device around them.
- A flow must play out inside the device: a sheet slides up, a button saves, a toast lands, a question gets an answer.
- A phone "looks fake": hard rim, uneven bezel, corners that do not nest, a stretched screenshot, unreadable UI.

Not for: laptops and browser windows (`three-assets` device frames, `screen-capture`), real screen recordings shown full frame (`screen-capture`, `video-editing`), the film's structure and pacing (the owner skill and `direction`).

## The modules

| File | Reference | What it gives you |
| --- | --- | --- |
| `components/phone.ts` | `references/phone-frame.md` | `phone(ctx, opts)`: the device as one SDF-shaded plane (ring, bezel, pill, screen clip all antialiased at any scale), the screen as a render target fed by `ph.ui`, status bar and home indicator, two-layer shadow, side walls for tilts, `render(a, b?, mix)` crossfades, `set({ opacity, veil })` (a fade composites as one layer), `attach()` for stickers, `above()` for world objects over it, `toDevice()`/`toWorld()` for screen-px placement, `stageBackdrop()`, the beat moves `punch()` and `creep()`, and the lift-out recipe |
| `components/appui.ts` | `references/ui-kit.md` | `appKit(spec, theme)`: a type scale and spacing in % of the screen width with a legibility floor, `page()`, `put()` and `stack()` layout, and the common components listed below; `withImages()` for real screenshots and photos; placeholder art; original glossy stickers. Rules, API and two scenes first, the module last |
| `components/appmore.ts` | `references/ui-kit-more.md` | `moreKit(k)`: share-sheet rows, grouped actions, a chat turn's parts, a library card, a detail hero, step lists, a camera scanner and `paper` art. Read it only when the film has one of those |
| `components/flows.ts` | `references/screen-flows.md` | `beatGrid()`, `rise()`, `scaleIn()`, `sheetPose()`, `buttonPose()`, `tapPose()`, `toastPose()`, `typed()`, `streamPose()`, `staggerIn()`, `pageIn()`, `scanRow()`, `feedLayout()`, `aimY()`, `bubbleGlide()`, `stickerPose()`, `wordBuild()`, `blockGlide()`, the sound for each UI event, plus a complete tested 6 s scene in the 9:16 feed framing, a chat scene, a chapter card and a title card |

All four compile against `three` r185 with strict TypeScript and were tested by rendering with the CLI at 1080 × 1920 (SwiftShader). Look at the frames rendered from that code before building: `references/images/device-finishes.png` (black, silver turned 22°, graphite landscape), `feed.png` (the 9:16 feed framing at rest and pushed for a tap), `home.png`, `settle.png` (rows flipping to Paid, a rolling amount), `scanner.png`, `sheet-rising.png`, `toast.png`, `chat.png`, `chapter-card.png` and `kit.png` (button states, chips, banner, pill toast, typing field, radios, bubble, the eight stickers).

## The device, as ratios of its outer width W

| Part | Ratio | At W = 765 (9:16) | Notes |
| --- | --- | --- | --- |
| Body | W × **2.09 W**, corner radius **0.162 W** | 765 × 1600, r 124 | Flat-edged slab, perfectly frontal by default |
| Outer edge line | 0.003 W, `#18191f` | 2 px | |
| Metal ring | 0.004 W, `#3b3b40` (lighter than the bezel) | 3 px | The only material cue: it reads as polished |
| Bezel to screen | **0.031 W** total, `#0b0b0b` | 24 px | Even on all four sides |
| Screen | 0.938 W × 2.03 W, radius **0.131 W** | 717 × 1552, r 100 | Concentric: screen radius = outer radius − inset |
| Camera pill | **0.30 W × 0.088 W**, fully round, `#000` | 230 × 67 | Top 0.027 W below the screen top, centred |
| Status bar | centre 0.071 W below the screen top | y 54 | On the pill's centre line. Time 0.039 W semibold, left edge 0.118 W in; battery 0.052 × 0.025 W, right edge 0.078 W in; four signal bars 0.044 × 0.029 W, 0.016 W left of the battery |
| Home indicator | **0.32 W × 0.010 W**, bottom 0.021 W above the screen bottom | 246 × 8 | Ink on light screens, white at 85% on dark |
| Shadow | broad: 0.04 W down, σ 0.06 W, `#1e2a3a` 22%; contact: 0.012 W down, σ 0.016 W, 16% | 30 / 46 px | Bottom-weighted, slate blue, never black |
| Stage | `#eff3f6`, glow `#cfe2f5` rising from below, gone by 75% of the height | | The screen's background equals the stage, so the phone melts into it |

Finishes: `black` (above), `silver` (ring `#dcdde2`, edge `#8e9096`), `graphite`, or your own `{ edge, rim, bezel, side }`. The reference had no glass highlight; the kit adds a faint one (`sheen` 0.35) because a perfectly flat face was one of its weaknesses. Set 0 for the flat look.

**Originality.** This is a generic modern phone: no maker's logo, no named model, no system font (Inter, shipped as woff2 per `three-type`), no copied status-bar artwork or wallpaper. Never call it a specific product in copy or `VIDEO.md`. **When the brief names a device brand** ("our app on an iPhone"), still build this generic modern phone with no brand marks, say the platform in copy instead ("Now on iOS", "on Android"), and note the choice in `VIDEO.md` under "I assumed": the viewer reads the platform from the copy, and a device maker's marks are not the user's to use. Icons and stickers in the kit are original geometry. A real brand's mark goes on screen only from the brand's own file (`three-assets`).

## Sizing in frame

| Aspect | Device | Why |
| --- | --- | --- |
| 9:16 (1080 × 1920), no film type around it | **W = 765**: height 83% of the frame, 71% of the width, centred | Measured rest framing; pushes reach 795 (+3.9%) and punches 789 (+3.2%). Fine for a site or a store; in a feed its lower half is under the platform UI |
| **9:16 feed with a message band** (Reels, TikTok, Shorts) | **W = 700**, device top ≈ 620, bottom bleeding **150–200 px** off the frame (`feedLayout()`); the band (lines ≥ 90 px) in frame rows 270–580 | The band needs room above the device, and the bleed gives the device ground and its shadow. Never let the bottom sit within 40 px of the frame edge either way: a tangent edge reads as a mistake and loses the shadow. To raise the device to top ≈ 470 (a one-line band), widen it to W ≈ 770 so the bottom still bleeds 150 px |
| 4:5 (1080 × 1350) | W = 536 (83% of height), centred; or W = 640 with the bottom 15% bleeding off | Text floor is easier with the bleed |
| 1:1 (1080 × 1080) | W = 430 whole device beside a text column; or W = 640 cropped, top 55% of the screen visible | Whole-device UI is small: design fewer, larger rows |
| 16:9 (1920 × 1080) | W = 430 (83% of height) off-centre on a third, copy on the other two thirds; detail shots at W = 760, bleeding off the bottom | Never shrink a 9:16 layout into a 16:9 frame |

### The 9:16 feed framing: what is safe where

The platform UI covers the bottom ~35–37% of a feed frame (Reels 672 px, TikTok 710 px of 1920) and TikTok's action rail the right 22% (`direction`'s safe zone: readable inside x 120–840, y 270–1210). With the feed framing at rest the screen's top is at frame y 642, so:

- **Safe at rest: screen rows above y ≈ 566** (40% of the screen height, 0.86 S; `feedLayout(ph.spec).safeY`). The proof goes there: the number the film argues with, the row that changes, the radio, a toast, the result.
- **Visible but covered: screen rows 566 → the frame bottom.** Secondary content only (more rows, a preview card, art), so the screen is not empty, but nothing the story needs.
- **Right rail**: text at the kit's right padding ends at frame x ≈ 834, just clear. Put stickers on the **left** edge in a feed cut.
- **Buttons inline**: a sheet's primary button goes under its list (`k.stack`), never pinned to the screen bottom; toasts and confirmation pills go under the status bar (`k.toast`, `k.pillToast` at y 15% S), never bottom centre.
- **A tap that must happen low gets a push**: 1.15–1.3× over 12f before the press (`aimY(spec, screenY, 1150, scale)`), so the control is at frame y ≤ 1210 when pressed; ease back after. The band yields (fades) while the phone fills the frame.

Pass the scale the UI is read at to `appKit(spec, theme, { shown })`: every type role is clamped to `28 / shown` px, so a phone shown at 0.6 draws its captions at 47 px or more and the layout has to lose rows rather than shrink text. Push beyond 1.06× (a push into the screen, a 1.3× read of an answer): set `phone(ctx, { maxZoom })` and `appKit(..., { res: 2 × maxZoom })` so the render target and canvases stay sharp at the end of the push.

## The UI system

Sizes are % of the screen width S (S = 716 at W = 765). The reference's caption and body sizes failed on a phone feed (body 32 px is 1.7% of the frame height), so the kit lifts them; the floor is **28 px on screen**, the same as `three-assets`.

| Role | % S | px at S 716 | Weight | Reference |
| --- | --- | --- | --- | --- |
| Large title | 8.8 | 63 | 700 | same |
| Sheet title | 6.6 | 47 | 700 | same |
| Greeting (2 lines, `**name**` bold, lh 1.24) | 7.0 | 50 | 400 + 700 | same |
| Section header | 4.6 | 33 | 600 | 4.3 |
| Body, list title, chat text (lh 1.4) | **4.8** | **34** | 400–500 | 4.4 |
| Card title | 4.6 | 33 | 600–700 | 4.3 |
| Secondary | 4.2 | 30 | 400, muted | 3.8 |
| Caption, meta | **3.9** | **28** | 400, muted | 3.2 (too small) |
| Chip label | 4.0 | 29 | 500 | 3.5 |

Weights to 700 are fine here because this is a product's own chrome; the film's own titles keep `three-type`'s house cap.

**Colour tokens** (`APP_LIGHT`): screen `#eff3f6`, surface `#ffffff`, sheet `#fbfbf8`, ink `#0d0f12`, muted `#62666b`, hairline `#e3e6ea` at 2 px, one accent (links, bubbles, selected states, chapter cards; default `#2e5be6`, replace with the brand's), primary button `#0f0f0f`, success `#1c7c3d` for completed steps only, selected `#0f0f0f` (checks and radios that are on: ink, never the brand accent, which reads as an error when it is coral or red), frosted banner `rgba(243,241,242,.97)`, pastel tiles behind stickers. One accent, green only for success, black for the primary action: the eye goes to content, not chrome.

**Spacing and radii** (% S): side padding **5.4**; header row centre 19 below the screen top, content from about 27; gaps 2.5 (chips), 3.1 (cards), 8.4 (sections); image card radius 4.7, list card 6, sheet top 7, toast 6.7, primary button 4.5 (a rounded rectangle, not a pill), chips and inputs fully round, thumbnails 3.4. Cards that do not fit peek off the right edge so a row reads as a carousel.

## Components

`appKit` gives, all drawn once at `res` (2.2 default) into canvas planes, never redrawn per frame: `page` (a full screen, top-left origin), `put` (place by top-left px) and `stack` (a column), `navBar`, `greeting`, `section`, `chip` / `chipRow`, `imageCard`, `rowCard`, `listGroup` (rows with radio controls as their own on/off planes), `stateList` (rows whose sub line and right side change per frame: "owes £28.01" → a "Paid" pill), `pill` (status capsule), `dots` (small assignee avatars, one plane each), `counter` (an in-app amount that rolls and goes through `put()`), `input` (a field that types), `stateButton` (idle, pressed, loading, success, its colour mixed in OKLCH), `tapMark` (a touch that presses), `sheet`, `toast` (banner), `pillToast`, `textBlock` (left, centre or right), `scrollEdge`, and `sticker`. Art: `scenery`, `blobs`, `tile`, `photo`. Details, a full home page and a settle-up scene in `references/ui-kit.md`. `moreKit(k)` adds `avatarRow`, `actions`, `bubble`, `answer` (one label per word, for streaming), `resultRow`, `followUp`, `collection`, `hero`, `steps` and `scanner` (a camera page with a scan line and a shutter): `references/ui-kit-more.md`.

**Real screens.** When the user has screenshots, use them: `withImages(ctx, [url], ([img]) => …)` and `k.page("home", photo(img))`, with `ph.set({ status: false })` if the screenshot carries its own status bar. The screenshot's aspect must match the screen's (0.462); crop, never stretch. Rebuilt UI is illustrative: record it in `VIDEO.md` under "I assumed".

## Motion vocabulary (30 fps, measured)

| Move | Frames | Ease | Numbers and notes |
| --- | --- | --- | --- |
| Phone first entry | **12** | outExpo | Rises 0.53 × its height (840 px at W 765), opaque, no scale or fade; per-frame travel roughly halves |
| Phone after a cut | 8–10 | outCubic | Scale 0.85 → 1, opacity 0.25 → 1; the screen content is already in place |
| **Beat punch** | 6 | ×0.5 per frame | **+3.2% in one frame** on the downbeat when the UI changes and the phone stays, then 1.6, 0.8, 0.4, 0.2, 0 (765 → 789 → 778 → 772 → 769 → 767 → 765). The signature move: a silent UI gets a physical hit on the kick |
| Bar push | 1 bar + 5 | linear, then ×0.55 | **+3.9% over one bar** (2.09 s), snaps back over 5f on the next downbeat; never sits dead, and the snap is an accent. Use max(punch, push), never the sum |
| Sheet up | **10–12** | outExpo | Top from the screen bottom to its slot, no overshoot, page behind **not dimmed** (the default; if it needs separation, `scrim: 0.4` = 10% of the ink, tinted warm on a warm ground; a full 25% black reads as mud on cream) |
| Sheet down | 8 | inCubic | Off the bottom |
| Sheet to full modal | 0 | cut + punch | The modal is already open on the cut |
| "Opening" a page | 6 + 8 | fade, then veil | Screen washes to near-white over 6f, cut, the new page lifts from under a `#555` veil over 8f (`ph.set({ veil, veilColor })`) |
| Crossfade between screens | 6–8 | inOutCubic | `ph.render(a, b, mix)`: two render targets, no double-exposure of overlapping parts |
| Push (navigation) | 12–16 | inOutCubic | New page in from the right, old one moves 30% left |
| Scroll | 10 | inOutCubic | Content up about 25% of the screen; the compact nav title fades in as the large title passes under |
| Content stagger | 3–4 per block, 8 each | outCubic | Fade + 20 px rise; list items 4f apart with 10 px; grid cards 3f apart, scale 0.92 → 1 over 6f |
| **Page on a cut** | key blocks 3f apart from cut − 2 | outCubic | **≥ 80% built on the cut frame**: stagger only the 2–4 blocks that matter (`pageIn`), the rest is already there; a page build is done ≤ 15f after the cut |
| Touch | 6 land + press + 10 ring | outCubic | The dot lands over the 6f before the press, squeezes on the press frame while a ring spreads 1.9× and fades; on the button's own tap frame (`tapPose`) |
| Scan | a row every 6–10f, 4f glide | outCubic | The line lands on each row of the document and marks it (`scanRow`) |
| Radio or check fill | 3 | linear | On a beat |
| Button | 3 + 3 + 14 + 4 | outCubic, inOutSine | Press: −4% width in 3f, release 4f; label → spinner over 3f; spinner holds **14f (0.47 s)**; colour → success over 4f with a check, mixed in OKLCH with a lighter middle (coral → orange → gold → green; an sRGB crossfade of two far hues passes through brown); the sheet title crossfades in step (3f) |
| Toast | 4 in, 30 hold, 6 out | outCubic | Drops 40 px with a fade, holds 1.0 s, dissolves (or slides up 8f inCubic); never covered by a sticker |
| Pill toast | 4 | outCubic | Scale 0.9 → 1; under the status bar in a feed cut; bottom centre (0.31 S above the screen bottom) only when the whole device is on screen and nothing covers it |
| Typing | — | linear | Reference 35–45 characters/s; use **25–30** for queries under 30 characters, ending ≥ 4f before the send; a hero query at `motion-language`'s 2–3 frames per character. Caret solid while typing |
| Send | 6 + 9 | outCubic | Input clears; empty state fades 6f; the bubble appears where the empty state was and glides to its slot in 9f |
| Status line ("checking…") | 15 | | 0.5 s, then the answer |
| Answer stream | — | 4f fade per word | **5 words/s** (≈ 30 characters/s), not the reference's unreadable 290; keep the answer ≤ 20 words, hold it per `direction`'s hold formula, and push in 1.3× so it reads at ≥ 44 px |
| After the answer | +2, then 3–5 apart | outCubic | Result rows, action row, follow-ups |
| Sticker | 4 pop + 3 settle, 39 unwind | outCubic, inOutSine | Scale 0 → 1.08 → 1, from −30° and from just inside the device edge outward; unwinds 15°, bobs ±4 px at 0.35 Hz; one per shot, 0.20–0.23 W |

Every cut and every chapter card sits on a **bar downbeat** (4 beats); inside a shot, UI state changes land on beats or half-beats. Snap them with `beatGrid(bpm, fps, firstDownbeat)`: **120 BPM by default** (15f beats, 60f bars, whole frames, the tempo `sound-design` and `motion-language` use); the reference measured 115 (15.65f beats), which is why some numbers here are rounded. The frame tables, the recipes and the sound for each UI event are in `references/screen-flows.md`. Sounds, when the film has them, are the event's own: a soft low thock on the sheet's settle frame, a click on a tap, a short tonal blip per scanned row, a chime on success; never a rushing-air transition sound (`sound-design`).

## Structure patterns

- **One shot = one bar** (2.0 s at 120 BPM). A strict metre lets a dense demo (16 screens in 30 s) read as rhythm instead of chaos. Vary the shot length only on purpose (a 2-bar hold for the payoff).
- **The persistent band** (the common feed layout): a message band of one or two lines (≥ 90 px, about 12–14 characters a line at 1080 wide) above the phone in the feed framing, swapping its line on the downbeats while the device acts under it. It keeps the device on screen through every proof beat, which is what `launch-taste` asks of a concept device.
- **Claim, then proof.** A full-bleed card in the app's accent, three lines built word by word on half-beats, then the phone shot that proves the verb. The reference used "[Product] that / [icon] [verb phrase] / for you"; adapt the shape, never the words: "[Product] / [icon] [does the thing] / [for whom or when]". Only the middle line changes between cards, so the repetition becomes a hook; a final card can rotate its middle line once per beat to list four features in one bar.
- **Which one when.** Use the band when the device *is* the film's concept device (the product's own UI carries the idea: `launch-taste`'s "the device persists"), which is most app launches. Use claim → proof cards for a feature montage with no single device, or as the **one accent** in a band film: a full-bleed card for at most one bar between two proofs, never between a device's cause and its effect.
- **Variety rule** (any layout held past about 4 bars): **every ~2 bars change something at frame level**, one of: the framing or scale (a push to 1.15 bleeding top or bottom, one ≤ 25° turn), the band's position (above ↔ a short line beside a pushed device), a full-bleed accent card for at most one bar, or a new content-matched sticker per beat (a receipt, a coin, a key). In-screen changes alone (a radio, a toast) do not count: one framing for 23 s read as a still to a judge even with the UI changing under it.
- **Title cards** before the phone: one word every 8f (half a beat), each rising 35 px into place while the line re-centres; key phrase in the accent; exit as a staggered blur-fade.
- **The arrival tells the story**: the first phone entry can swallow the problem (labels or chips floating on the stage tumble into the screen as it rises under them).
- **Stickers** are one per shot, matched to the content, overlapping the device edge; they add depth and warmth at almost no cost.
- **End**: hard cut to a dark card; wordmark fades up over 12f; hold about 1.4 s.

## The reference's weaknesses, fixed here

| Bad (seen in the reference) | Good (this kit) |
| --- | --- |
| A sticker covers live UI (a toast's timestamp) | A sticker overlaps at most the bezel plus the side padding (≈ 0.08 W into the device), beside empty space; it shrinks out before a toast or sheet uses that edge |
| Search, library and chat screens leave the lower 40–50% empty | Fill the screen top to bottom (home: cards, a "near you" row, the composer), stack chat from the composer up, or push in so the content block fills the frame |
| The answer streams at 290 characters/s: decoration, not proof | 5 words/s, ≤ 20 words, a hold, and a 1.3× push so the words read |
| Body text 32 px on a 1920 frame, captions 22 px | Floor 28 px on screen for everything, body 34 px, payoff text ≥ 44 px |
| Signal bars come and go between screens | The status bar belongs to the device: drawn once, the same on every screen, its ink following the page |
| A perfectly flat device, no material | A faint glass sheen, a two-layer shadow, and at most one shot with a small turn (≤ 25°, side walls show) |
| Only cut, punch and scale-in between shots: fine at 45 s, monotonous at 90 | Past 45 s, add a push, a crossfade, an "opening" veil or a scroll for variety |

## Build order

1. Read `VIDEO.md`'s Direction; decide the beat grid (tempo from the music, or 120 BPM as a default), the framing per aspect (the feed framing for Reels/TikTok/Shorts) and the shot list as bars, with a frame-level change every ~2 bars.
2. Copy `stage.ts`, `ease.ts` (`three-camera`), `type.ts` (`three-type`), `ui.ts` (`three-assets` drawn UI), then `phone.ts`, `appui.ts`, `flows.ts` (and `appmore.ts` if you need its parts) from this skill's references. `save-asset` Inter's woff2 into `assets/` (`three-type`).
3. Build each screen as a `page` with `put()` and `stack()`; give every moving part its own plane; put the proof in the safe rows (feed framing) and push in for anything low; check the floor at the widest framing.
4. Pose everything per frame from the frame number only; call `ph.render([...])` last in the update.
5. Capture the key frames (rest, each state change, each punch) and run the checks below.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The rig, type kit and drawn-UI base | `three-camera`, `three-type`, `three-assets` | None: the modules import them |
| Entrance, exit and spring numbers this skill deviates from | `motion-language` | The numbers in the tables above |
| Which look the film is | `launch-taste` (UI-led story film) | The stage and tokens above |
| Seeing the result | `capture-frames` | None |
| Compiling the modules | `validate` | None |

## Checks before you finish

1. `capture-frames` at rest, cropped to a corner at 400%: the ring and the edge line are smooth (no stair steps), the bezel is the same width on all four sides and round the corners (screen radius = outer radius − bezel), the pill is centred on the status bar's line.
2. On every shot's widest frame, every glyph is ≥ 28 px on screen (a capital's height ÷ 0.727 for Inter; the status bar's time is chrome and exempt), body text ≥ 34 px, and the payoff (an answer, a result) ≥ 44 px.
3. Measure the device width on a punch frame and the next five: about +3.2% on the hit frame and back at rest by +6. A bar push ends ≤ +4% and snaps back in 5 frames on the downbeat.
4. Every cut, punch and chapter card is on a bar downbeat; every UI state change (fill, press, success, toast) is on a beat or half-beat: list the frames against `beatGrid`.
5. No sticker overlaps text, a control or a toast in any frame; at most one sticker per shot; in a feed cut it is on the left edge.
6. No shot that holds ≥ 1 s leaves the lower 40% of the visible screen empty.
7. The status bar is identical on every screen and switches ink with the page; the home indicator is visible on every screen.
8. A streamed answer reveals ≤ 5 words/s and is fully on screen for its hold before the cut.
9. No maker's logo, model name, system font or copied artwork anywhere; app copy is the user's, or rebuilt UI is flagged as illustrative in `VIDEO.md`.
10. `validate` passes; nothing is redrawn inside the frame callback; no randomness or wall-clock timers.
11. **Feed cuts**: on a still of every shot at rest, the device's bottom is 150–200 px past the frame edge (not within 40 px of it), and every tap, toast, changing row and number the film argues with is inside frame x 120–840, y 270–1210 on the frame it matters (pushed there if it sits low); the message band's lines are ≥ 90 px.
12. The frame of every cut into a new page shows it ≥ 80% built (no blank or half-empty screen on the cut).
13. A mid-ramp frame of every button success (2f into the 4f ramp) shows no brown or grey-olive; a mid-fade frame of the phone shows a pale screen, not a grey slab; a lifted element is on screen on every frame of its hand-off.
14. Across the film, the frame-level layout changes at least every ~2 bars (framing, band position, a one-bar card, or a new sticker), and the claim cards, if any, never split a cause from its effect.
15. No rushing-air transition sound anywhere in the cue sheet; every UI sound is the event's own (thock, click, blip, chime) or nothing.
