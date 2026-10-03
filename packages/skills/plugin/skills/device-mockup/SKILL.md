---
name: device-mockup
description: "A convincing generic phone and a mobile app UI rebuilt in Three.js, measured from a polished launch film: the device as ratios of its width (flat slab, thin metal ring, black bezel, camera pill, status bar, home indicator, two-layer soft shadow) with its screen a render target clipped to the rounded glass; a canvas-drawn app kit (nav, chips, image cards, lists, typing inputs, a three-state button, sheets, toasts, streaming chat, library, detail, glossy stickers); and its motion on a beat grid. Load it when a video shows an app on a phone."
---

# Device mockup: a modern phone and its app, in motion

A phone on a quiet stage with the app working inside it is the backbone of most app launch films. Done well, it reads as the real product; done badly (a black rounded rectangle, a stretched screenshot, UI text too small to read), it reads as a template. This skill is the full kit for the good version on Three.js: three tested modules, the device measured as ratios, the UI system as a type scale and tokens, and a motion vocabulary in frames, taken frame by frame from a 45 s, 115 BPM, 1080 × 1920 launch film and then corrected where that film was weak.

It builds on, and does not repeat: `three-camera` (`components/stage.ts`, `components/ease.ts`), `three-type` (`components/type.ts`: `withFonts`, `label`, `line`, `setLabel`, `onTop`), `three-assets` (`components/ui.ts` from its `references/drawn-ui.md`: `canvasPlane`, `roundRect`, the 28 px floor), `motion-language` (entrance, exit and spring numbers) and `launch-taste` (the "UI-led story film" family in its `references/style-map.md`). Copy those modules first, then the three here.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, and never putting words in a real person's mouth. The checks at the end are a quality bar to clear, not a template to reproduce.

## When to use

- The video shows an app on a phone: a launch, a feature announcement, a demo walkthrough, an app store preview, a screen demo in an ad.
- There are no usable screens yet (concept, pre-launch) and the UI must be rebuilt as illustrative chrome, or there are screenshots that need a convincing device around them.
- A flow must play out inside the device: a sheet slides up, a button saves, a toast lands, a question gets an answer.
- A phone "looks fake": hard rim, uneven bezel, corners that do not nest, a stretched screenshot, unreadable UI.

Not for: laptops and browser windows (`three-assets` device frames, `screen-capture`), real screen recordings shown full frame (`screen-capture`, `video-editing`), the film's structure and pacing (the owner skill and `direction`).

## The three modules

| File | Reference | What it gives you |
| --- | --- | --- |
| `components/phone.ts` | `references/phone-frame.md` | `phone(ctx, opts)`: the device as one SDF-shaded plane (ring, bezel, pill, screen clip all antialiased at any scale), the screen as a render target fed by `ph.ui`, status bar and home indicator, two-layer shadow, side walls for tilts, `render(a, b?, mix)` crossfades, `set({ opacity, veil })`, `attach()` for stickers, `stageBackdrop()`, and the beat moves `punch()` and `creep()` |
| `components/appui.ts` | `references/ui-kit.md` | `appKit(spec, theme)`: a type scale and spacing in % of the screen width with a legibility floor, `page()` and `put()` layout, and every component listed below; `withImages()` for real screenshots and photos; placeholder art; original glossy stickers |
| `components/flows.ts` | `references/screen-flows.md` | `beatGrid()`, `rise()`, `scaleIn()`, `sheetPose()`, `buttonPose()`, `toastPose()`, `typed()`, `streamPose()`, `staggerIn()`, `bubbleGlide()`, `stickerPose()`, `wordBuild()`, `blockGlide()`, plus a complete tested 6 s scene, a chat scene and a chapter card |

All three compile against `three` r185 with strict TypeScript and were tested by rendering with the CLI at 1080 × 1920 (SwiftShader). Look at the frames rendered from that code before building: `references/images/device-finishes.png` (black, silver turned 22°, graphite landscape), `home.png`, `sheet-rising.png`, `toast.png`, `chat.png`, `chapter-card.png` and `kit.png` (button states, chips, banner, pill toast, typing field, radios, bubble, the eight stickers).

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

**Originality.** This is a generic modern phone: no maker's logo, no named model, no system font (Inter, shipped as woff2 per `three-type`), no copied status-bar artwork or wallpaper. Never call it a specific product in copy or `VIDEO.md`. Icons and stickers in the kit are original geometry. A real brand's mark goes on screen only from the brand's own file (`three-assets`).

## Sizing in frame

| Aspect | Device | Why |
| --- | --- | --- |
| 9:16 (1080 × 1920) | **W = 765**: height 83% of the frame, 71% of the width, centred | Measured rest framing; pushes reach 795 (+3.9%) and punches 789 (+3.2%) |
| 4:5 (1080 × 1350) | W = 536 (83% of height), centred; or W = 640 with the bottom 15% bleeding off | Text floor is easier with the bleed |
| 1:1 (1080 × 1080) | W = 430 whole device beside a text column; or W = 640 cropped, top 55% of the screen visible | Whole-device UI is small: design fewer, larger rows |
| 16:9 (1920 × 1080) | W = 430 (83% of height) off-centre on a third, copy on the other two thirds; detail shots at W = 760, bleeding off the bottom | Never shrink a 9:16 layout into a 16:9 frame |

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

**Colour tokens** (`APP_LIGHT`): screen `#eff3f6`, surface `#ffffff`, sheet `#fbfbf8`, ink `#0d0f12`, muted `#62666b`, hairline `#e3e6ea` at 2 px, one accent (links, bubbles, selected states, chapter cards; default `#2e5be6`, replace with the brand's), primary button `#0f0f0f`, success `#1c7c3d` for completed steps only, frosted banner `rgba(243,241,242,.97)`, pastel tiles behind stickers. One accent, green only for success, black for the primary action: the eye goes to content, not chrome.

**Spacing and radii** (% S): side padding **5.4**; header row centre 19 below the screen top, content from about 27; gaps 2.5 (chips), 3.1 (cards), 8.4 (sections); image card radius 4.7, list card 6, sheet top 7, toast 6.7, primary button 4.5 (a rounded rectangle, not a pill), chips and inputs fully round, thumbnails 3.4. Cards that do not fit peek off the right edge so a row reads as a carousel.

## Components

`appKit` gives, all drawn once at `res` (2.2 default) into canvas planes, never redrawn per frame: `page` (a full screen, top-left origin) and `put` (place by top-left px), `navBar` (menu or back, avatar, large title), `greeting`, `section`, `chip` / `chipRow`, `imageCard` (art + bottom gradient caption), `rowCard` (thumbnail, kicker, title, meta, chevron), `listGroup` (rows with icon, sub, and radio controls as their own on/off planes), `input` (search pill or chat composer that types: a type-kit label revealed by its x mask, caret riding it, send circle idle/active), `stateButton` (idle, pressed, loading with spinner, success), `sheet` (panel + scrim, optional handle, close, title), `avatarRow`, `actions`, `toast` (notification banner), `pillToast`, `bubble`, `answer` (one label per word, for streaming), `resultRow`, `followUp`, `collection` (library card with 2 × 2 mosaic), `hero` (blurred ambient backdrop + floating card), `steps`, `textBlock`, `scrollEdge` (nothing scrolls under the status bar), and `sticker`. Art: `scenery`, `blobs`, `tile` (pastel + sticker), `photo` (a loaded image, cover-fit). Details and a full home page in `references/ui-kit.md`.

**Real screens.** When the user has screenshots, use them: `withImages(ctx, [url], ([img]) => …)` and `k.page("home", photo(img))`, with `ph.set({ status: false })` if the screenshot carries its own status bar. The screenshot's aspect must match the screen's (0.462); crop, never stretch. Rebuilt UI is illustrative: record it in `VIDEO.md` under "I assumed".

## Motion vocabulary (30 fps, measured)

| Move | Frames | Ease | Numbers and notes |
| --- | --- | --- | --- |
| Phone first entry | **12** | outExpo | Rises 0.53 × its height (840 px at W 765), opaque, no scale or fade; per-frame travel roughly halves |
| Phone after a cut | 8–10 | outCubic | Scale 0.85 → 1, opacity 0.25 → 1; the screen content is already in place |
| **Beat punch** | 6 | ×0.5 per frame | **+3.2% in one frame** on the downbeat when the UI changes and the phone stays, then 1.6, 0.8, 0.4, 0.2, 0 (765 → 789 → 778 → 772 → 769 → 767 → 765). The signature move: a silent UI gets a physical hit on the kick |
| Bar push | 1 bar + 5 | linear, then ×0.55 | **+3.9% over one bar** (2.09 s), snaps back over 5f on the next downbeat; never sits dead, and the snap is an accent. Use max(punch, push), never the sum |
| Sheet up | **10–12** | outExpo | Top from the screen bottom to its slot, no overshoot, page behind not dimmed (scrim optional at 25%) |
| Sheet down | 8 | inCubic | Off the bottom |
| Sheet to full modal | 0 | cut + punch | The modal is already open on the cut |
| "Opening" a page | 6 + 8 | fade, then veil | Screen washes to near-white over 6f, cut, the new page lifts from under a `#555` veil over 8f (`ph.set({ veil, veilColor })`) |
| Crossfade between screens | 6–8 | inOutCubic | `ph.render(a, b, mix)`: two render targets, no double-exposure of overlapping parts |
| Push (navigation) | 12–16 | inOutCubic | New page in from the right, old one moves 30% left |
| Scroll | 10 | inOutCubic | Content up about 25% of the screen; the compact nav title fades in as the large title passes under |
| Content stagger | 3–4 per block, 8 each | outCubic | Fade + 20 px rise; list items 4f apart with 10 px; grid cards 3f apart, scale 0.92 → 1 over 6f |
| Radio or check fill | 3 | linear | On a beat |
| Button | 3 + 3 + 14 + 4 | outCubic, inOutSine | Press: −4% width in 3f, release 4f; label → spinner over 3f; spinner holds **14f (0.47 s)**; colour → success over 4f with a check; the sheet title crossfades in step (3f) |
| Toast | 4 in, 30 hold, 6 out | outCubic | Drops 40 px with a fade, holds 1.0 s, dissolves (or slides up 8f inCubic); never covered by a sticker |
| Pill toast | 4 | outCubic | Scale 0.9 → 1, bottom centre about 0.31 S above the screen bottom |
| Typing | — | linear | Reference 35–45 characters/s; use **25–30** for queries under 30 characters, ending ≥ 4f before the send; a hero query at `motion-language`'s 2–3 frames per character. Caret solid while typing |
| Send | 6 + 9 | outCubic | Input clears; empty state fades 6f; the bubble appears where the empty state was and glides to its slot in 9f |
| Status line ("checking…") | 15 | | 0.5 s, then the answer |
| Answer stream | — | 4f fade per word | **5 words/s** (≈ 30 characters/s), not the reference's unreadable 290; keep the answer ≤ 20 words, hold it per `direction`'s hold formula, and push in 1.3× so it reads at ≥ 44 px |
| After the answer | +2, then 3–5 apart | outCubic | Result rows, action row, follow-ups |
| Sticker | 4 pop + 3 settle, 39 unwind | outCubic, inOutSine | Scale 0 → 1.08 → 1, from −30° and from just inside the device edge outward; unwinds 15°, bobs ±4 px at 0.35 Hz; one per shot, 0.20–0.23 W |

Every cut and every chapter card sits on a **bar downbeat** (4 beats); inside a shot, UI state changes land on beats or half-beats. Snap them with `beatGrid(bpm, fps, firstDownbeat)`; the frame tables and recipes are in `references/screen-flows.md`.

## Structure patterns

- **One shot = one bar** (2.09 s at 115 BPM). A strict metre lets a dense demo (16 screens in 30 s) read as rhythm instead of chaos. Vary the shot length only on purpose (a 2-bar hold for the payoff).
- **Claim, then proof.** A full-bleed card in the app's accent, three lines built word by word on half-beats, then the phone shot that proves the verb. The reference used "[Product] that / [icon] [verb phrase] / for you"; adapt the shape, never the words: "[Product] / [icon] [does the thing] / [for whom or when]". Only the middle line changes between cards, so the repetition becomes a hook; a final card can rotate its middle line once per beat to list four features in one bar.
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

1. Read `VIDEO.md`'s Direction; decide the beat grid (tempo from the music, or 115 BPM as a default) and the shot list as bars.
2. Copy `stage.ts`, `ease.ts` (`three-camera`), `type.ts` (`three-type`), `ui.ts` (`three-assets` drawn UI), then `phone.ts`, `appui.ts`, `flows.ts` from this skill's references. `save-asset` Inter's woff2 into `assets/` (`three-type`).
3. Build each screen as a `page` with `put()`; give every moving part its own plane; check the floor at the widest framing.
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
5. No sticker overlaps text, a control or a toast in any frame; at most one sticker per shot.
6. No shot that holds ≥ 1 s leaves the lower 40% of the visible screen empty.
7. The status bar is identical on every screen and switches ink with the page; the home indicator is visible on every screen.
8. A streamed answer reveals ≤ 5 words/s and is fully on screen for its hold before the cut.
9. No maker's logo, model name, system font or copied artwork anywhere; app copy is the user's, or rebuilt UI is flagged as illustrative in `VIDEO.md`.
10. `validate` passes; nothing is redrawn inside the frame callback; no randomness or wall-clock timers.
