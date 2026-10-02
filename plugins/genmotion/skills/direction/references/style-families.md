# Style families

The ten looks GenMotion's own templates are built in, measured from their source. Each entry gives what the family is, when to pick it, and its palette, type, motion, pacing, transition and sound signature with numbers (frames at 30 fps). Pick one per film and copy its signature into the Direction block; borrow a single device from a second family only when the idea needs it, and say so.

Moves named here (blurUp, pop, flood, iris, persisting element…) are defined with exact timings in `motion-language`.

Contents: A Beat-cut kinetic type · B Soft-light SaaS · C 3D product hero · D One-shot camera film · E Chat-UI social · F Whiteboard explainer · G Textured tactile · H Music video · I Brand guide / identity loop · J Milestone / stat · Mixing families · Engine notes

---

## A. Beat-cut kinetic type

**What it is**: one idea per card, dead centre, cut on a musical grid. Apple's "Don't Blink" is the archetype. Stillness is the style: cards do not tween.

**Pick it when**: you have copy and a logo and nothing else; the brief is hype; the track has a clear pulse (90–132 BPM).

| Signature | Numbers |
| --- | --- |
| Palette | Pure #000 / #fff. At most one accent (a violet like #9b9cff on dark, a royal blue like #1f3fd1 on white). Emphasis cards invert (white ground, black type) |
| Type | One grotesque at 600–700. Sizes in steps: 68 / 112 / 176 / 268 px, plus a "bleed" size of 580–960 px for the punch word. Tracking tightens with size: −0.012em under 100 px, −0.025em above 100, −0.035em above 200. Line height 0.78 for bleed type, 1.05 otherwise. Tabular figures |
| Motion | No easing at all, or a micro-settle (scale 1.06 → 1 over 12f). Accent cards open with a 2-frame strobe of solid foreground colour. Letters or words can build 2f apart. Two-pass ink: words appear grey, ink 5f later |
| Pacing | Card holds are multiples of an eighth note: at 90 BPM one eighth is 10f, so holds of 5, 7.5, 10, 12.5, 15f; countdown digits 30f. Average about 8f per card. Scenes 70–160f |
| Transitions | The hard cut on the beat *is* the grammar. Chapter separators: cut to black, an 8f fade to black, or an 8f white wipe |
| Sound | One driving track at full level, every cut on its grid. Optional pop per word (−6 dB, 6f clips) and a logo hit |
| Logo hold | Short by design: 10–30f |

**Goes wrong when**: cards don't land on the grid (it feels random instead of musical), or the punch word is not the biggest thing in the film.

## B. Soft-light SaaS

**What it is**: the product's real UI, rebuilt at true proportions and magnified, on a white or creme stage. A cursor drives the story. Shared elements cross cuts. Something always drifts.

**Pick it when**: the material is app or SaaS screens; launch, feature or demo; audience wants to see it working.

| Signature | Numbers |
| --- | --- |
| Palette | Bg #fff, #fafafb, #fdfdfd or a creme #F7F4ED. Ink #0a0a0b–#1b1b1b. Muted around #5c5a55–#6b6b73, kept at ≥5:1 contrast. One brand gradient used on one element at a time (a band, the mark, an underline, an emphasis word) |
| Type | A neutral grotesque 400–600. Hero 96–220 px at −0.025 to −0.04em; body 36–38; eyebrow 26–30 uppercase at +0.14 to +0.2em |
| Motion | blurUp / riseMask by word (12–14f, stagger 3–4), sometimes with a colour sweep from light to ink. Word-slot flips. Typing at 2–3 frames per character with a real caret. Click = 4f press + 6f release + an 8–14f ring. Camera pushes to 1.7–3.8×. Marks arrive on a gentle spring with no overshoot. Counters 40–120f |
| Pacing | New information every 14–50f; scenes 30–310f, mean about 5 s |
| Transitions | Persisting element, card → full-bleed morph, colour-field push, button flood, iris from the clicked button or the logo, gradient band wipe, scale-matched cut, exit-then-cut |
| Sound | Either a music bed at full level and no effects, or VO at full level over a bed at about −17 dB with clicks on every press |
| Logo hold | 75–120f |

**Goes wrong when**: the UI is a screenshot pasted flat (rebuild and magnify the part that matters), the cursor teleports, or the drift is still running at a matched cut.

## C. 3D product hero

**What it is**: everything is a real 3D object (glossy coins, extruded type, phones, light rays). Objects fly out of the lens and slam. Floods of brand colour carry every cut.

**Pick it when**: consumer or fintech product, a physical-feeling object, a Three.js project that should look like Three.js.

| Signature | Numbers |
| --- | --- |
| Palette | White or near-black stage + one electric brand colour (a lime like #c8f31d) used only as fills, rays and glows, never small text + one punch colour (an electric blue like #1d2bf0) for exactly one word. Extruded type in three tones of the brand colour (face, bevel, side) |
| Type | Grotesque 600, 150–190 px at −0.03 to −0.035em; eyebrow 26 px at +0.22em |
| Motion | Pop: keys [0 → 1.08 at 60% → 1] over 14f. Slam: z 6 → 0 with scale 0.7 → 1.04 → 1 over 14f. Burst: 25 objects staggered 1–2f, 22–26f ease-out. Rays spin 0.006 rad/frame continuously. Kinetic words 3f apart, entrance 9f, exit 6f |
| Pacing | 18–25f between beats; scenes 33–180f |
| Transitions | Radial colour flood (10–13f, ease-in) that the next scene contracts into an object (a pill, a button); rush into the lens; push into a ring; white wipe; hard cut to black at the very end |
| Sound | Music at −5 dB (0.55). Whoosh (−3 dB) 3f before each flood starts; impact (−3 to −1.4 dB) on slams and the logo; click on taps; coin or pop clusters on bursts |
| Logo hold | 28–90f |

**Goes wrong when**: the brand colour lands on small text, two colours punch in one frame, or 3D is used as decoration around flat content.

## D. One-shot camera film

**What it is**: a single world and no cuts. Scenes are windows onto one continuous time; the camera moves and circle reveals do the work of transitions.

**Pick it when**: the story is a journey through one space (a desktop, a phone, a map); premium, calm-confident tone.

| Signature | Numbers |
| --- | --- |
| Palette | Monochrome (#f2f2f2 and black, hairlines #bdbdbd) or a real wallpaper plus one orange (#ff6a1a) |
| Type | Grotesque 420–500 at −0.025em, about 95 px. Text sits in screen space and shrinks into the world when the camera pulls back |
| Motion | Keyed camera, every move a 1.5–3 s ease-in-out, zoom interpolated in log space so a push feels even. Words arrive 3.6f apart, 24f each, from 170 px right. Real motion blur from sub-frame samples. Film grain |
| Pacing | A big beat every 45–90f; inner text every 3–4f |
| Transitions | None. Circle bursts (white disk to full frame in 11–16f), pull-back / push-in, dashed orbit rings |
| Sound | Either one soundtrack, or literal effects on every event (up to about one per second) over music at −4.4 dB (0.6) |
| Logo hold | 75–120f |

**Goes wrong when**: a move stops dead at an interior key (use a monotone spline through camera keys), or the camera moves in two directions at once.

## E. Chat-UI social

**What it is**: a real chat app, pixel-faithful to the platform's theme, telling a story in messages. Vertical or square.

**Pick it when**: the story is a conversation (a friend's problem, a group chat, an assistant); feed placement; ads.

| Signature | Numbers |
| --- | --- |
| Palette | The platform's own (dark: wallpaper #0b141a, incoming #202c33, outgoing #005c4b; light: #fff, incoming #efefef, outgoing a blue-violet gradient). Do not invent chat colours |
| Type | The system UI face, 46/62 px at 1080 wide (36/46 inside a phone frame) |
| Motion | The slot opens 12f before the bubble (ease-out) so nothing reflows. Bubble spring mass 0.8, stiffness 165, damping 17 over 16f, scale 0.8 → 1 from the tail corner. Typing dots run 30–40f before an incoming message. Composer types 2–3 frames per character. Reactions on a bouncier spring (0.6 / 200 / 14, 18f) |
| Pacing | 40–58f between messages (each is read before the next), 20–22f for a "frantic group chat" beat |
| Transitions | None inside the chat, or a camera push through the phone screen (45f, ease-in-out) and a pull back out (52f) |
| Sound | One message sound per bubble on its first visible pixel (−1.4 to −0.9 dB); bed at about −17 dB, or full level with no VO |
| Logo hold | 60–90f end card |

**Goes wrong when**: the bubble's sound fires before it is visible, text sits under the platform's own UI, or messages arrive faster than they can be read.

## F. Whiteboard explainer

**What it is**: hand-drawn strokes on white paper, narrated. Every element draws on along its stroke and erases back at the end of its idea.

**Pick it when**: teaching a concept to a general audience with VO; 30–180 s.

| Signature | Numbers |
| --- | --- |
| Palette | Paper #fff, ink #1e1e1e, grey #495057, one red #e03131 for the pen underline and emphasis, a light hatch #ff8787 |
| Type | A hand font scale: 112 / 96 / 48 / 42 / 40 / 32 px + a mono at 34. Single left column at a 140 px margin |
| Motion | Text draws in over clamp(width / 45, 8, 18) frames; strokes 8–20f, ease-out along the path. Text rises 6 px and floats ±1.2 px. Dots overshoot 35% while drawing. Examples 5f apart. A red underline draws 12f after its phrase |
| Pacing | Per scene: tag at 0–2, title at 6, subtitle at 16, diagram 24–60, takeaway 76–124. Scenes 200–240f (about 7 s) |
| Transitions | Board erase: every element reverses its stroke over 10f starting 18f before the end, leaving 8f of blank paper, then a cut onto identical paper |
| Sound | VO starts exactly 6f after each cut; bed at about −13 dB (0.22) |
| Logo hold | 60–90f |

**Goes wrong when**: the camera drift doesn't return to rest at both ends (the cut onto blank paper jumps), or the whole diagram appears before the VO names its parts.

## G. Textured tactile

**What it is**: a textured world (paper grain, dither, HUD brackets, pixel grids) with pixel-built transitions and a pulse in the ambience. Two variants: dark retro-tech HUD and warm paper collage.

**Pick it when**: crypto, security, developer tools with attitude, editorial or voice products; a brand that wants grain instead of gloss.

| Signature | Numbers |
| --- | --- |
| Palette | HUD: near-black #070605, yellow #ffd23f, loss red #ff4d4f, panel #0d0e10. Paper: #efeeea, ink #111, a dither gradient from blue #1f6db5 to olive #8f9a4a, an orange gradient #e8462b → #f38a2c |
| Type | A tech display face for HUD, or a grotesque 400 at −0.02em for paper (scatter words 96 px) |
| Motion | Pixel-block wipe (12 × 7 cells, 18–24f). Pixel-glitch dissolves 15–21f. Scatter words pop 6f apart in 2-frame pops. Linear paper drift so words are carried off, not faded. Heartbeat halos at 75 BPM (lub, dub 8f later at 0.6 strength). Badges stamp: a 1-frame flash, settle over 4–5f. Block-caret typing at about 12 characters per second |
| Pacing | 25–30f between beats; scenes about 75f median when VO-led |
| Transitions | Block wipe (incoming beat already 12f in when the wipe starts), iris to an object, shrink to an avatar, frame → card collapse, fall into dark |
| Sound | A soundtrack with visuals locked to its pulses, or VO at full level + bed at −11 dB (0.28) + a wipe sound at −6 dB starting on the wipe's first frame + rings on the cut |
| Logo hold | 60–105f |

**Goes wrong when**: texture is so heavy that text loses contrast, or glitch effects appear on every cut instead of as the signature.

## H. Music video

**What it is**: the music clock drives everything: tempo, first downbeat, beat, eighth and bar pulses, and a per-bar loudness table that drives intensity. Word-timed lyrics.

**Pick it when**: the user's track is the brief (lyric video, visualiser, music-led brand film).

| Signature | Numbers |
| --- | --- |
| Palette | Night violet #0b0620 / #150a33 with neon pink #ff3d9a, cyan #3df2ff and yellow #ffe14d; text #f4f1ff |
| Type | Grotesque for lyrics at 60–92 px; a second script for subtitles at 30–34 px, +0.08em |
| Motion | Beat pulse = exp(−fraction of beat × sharpness). Lines groove by pulse × 6 px. The sung word flashes accent pink, pops to 1.16 with a decaying wobble, fades to white. Impacts: FOV punch of −5 to −10°, camera shake decaying over 3–6f, a 2-frame colour-invert "impact frame" |
| Pacing | Lyric words about 7.5f apart; shots about 3.9 s; every scene starts on a bar line (at 132 BPM a beat is 13.6f, a bar 54.5f) |
| Transitions | Flash-to-white straddling every cut: ramp in over 4–8f (ease-in), cut, decay over 6–9f |
| Sound | The song at full level, nothing else. Video length equals track length |
| Logo hold | Through the track's last hit and tail |

**Goes wrong when**: cuts follow a beat grid on a track that has no steady beat (cut on phrases instead), or scenes start mid-bar.

## I. Brand guide / identity loop

**What it is**: the brand system as the content: mark, palette strip, type specimen, applications, lockup. Grids and rules are visible.

**Pick it when**: a brand reveal, a guidelines film, a looping identity piece for a site or event screen.

| Signature | Numbers |
| --- | --- |
| Palette | The brand's own hex values, shown on screen as content. Dotted rules (3 px every 16 px at about 16% opacity) |
| Type | The brand's display face at a measured cap height; labels small, uppercase, +0.08em |
| Motion | Clip-draw the mark over 16f with a 26 px lift. Palette sheets slide 16f ease-out at staggers of 4–20f. Typewriter specimen with a colour trail 4 characters long. Slot-machine tiles (one face every 24f, an 11f roll, cells staggered 3f). Glitch text with a 2-frame stutter |
| Pacing | About 22f between beats; scenes 74–155f |
| Transitions | Ink panel wipe (8f), the last sheet keeps travelling and floods the frame (16f), the held word recedes on Z, photos morph into lockup blocks (18f) |
| Sound | One bed at full level, or a single quiet source boosted up to +6 dB |
| Logo hold | 19–150f; a loop holds the settled lockup for most of its length |

**Goes wrong when**: the mark is redrawn instead of using the real file (slightly wrong is worse than absent), or the specimen shows type the brand doesn't use.

## J. Milestone / stat

**What it is**: one big number tallies, lands with a punch, celebrates within two frames of landing, then breathes.

**Pick it when**: a count to celebrate (stars, users, revenue, a funding round).

| Signature | Numbers |
| --- | --- |
| Palette | Warm paper #FBFAF8 or #FAFAFA, ink #111114–#1C1917, muted #66666E (≥5.3:1 for small text), one brand orange like #FA5D19 |
| Type | Grotesque 500 at 250–264 px, −0.04 to −0.045em, tabular figures; caps labels 28 px at +0.2em |
| Motion | Hero number enters 12f (rise 50 px, blur 10, scale 0.94 → 1). Count 120–210f with ease-out cubic; any chart or bar draws on the **same** eased progress so the line and the digits settle together. Land punch 1 → 1.06 → 1 over 5f up and 13f down. Confetti or poppers fire within ±2f of the land. Afterwards the number breathes 0.4–1.5% |
| Pacing | Entrance inside 30f, the long count, a 90–120f payoff hold |
| Transitions | Usually a single scene; exit with a blur-out (12–16 px) |
| Sound | The catalog has none; add a soft tick per visible digit change (−9 dB or lower, thinned so it is not a buzz), a riser into the land and an impact on the land frame |
| Logo hold | The payoff hold is the lockup |

**Goes wrong when**: the count is linear (it should decelerate into the landing), or the celebration lands a few frames off the number.

---

## Mixing families

- One family per film. A launch may open in A (three cards of kinetic type) before settling into B or C; say so in the Direction block and keep each passage pure.
- Never mix two palettes. If a second family's device is borrowed, it takes this film's palette.
- The owner skill's default family wins ties.

## Engine notes

- **Three.js** (the default engine): every family is buildable. Text is a canvas texture on a plane (`three-type`), UI is rebuilt as planes with canvas-drawn content, floods and wipes are planes parented to the camera, and the camera is a real camera (`three-camera`). Families C and D are native here. For B and E, use an orthographic camera or a perspective camera at a fixed distance so pixel sizes stay exact.
- **HyperFrames / React**: everything maps to DOM elements and transforms; keep the same numbers.
