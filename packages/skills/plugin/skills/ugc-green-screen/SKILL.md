---
name: ugc-green-screen
description: "The commentary ad: a presenter cut out over a full-bleed source (a screenshot, an article, a tweet, a competitor's pricing page, a search result) reacting to it line by line. Covers the cutout layout and how much frame it may take, what makes a source worth reacting to, the annotation beat that turns a reaction into an argument, and how to build the whole thing with no real cutout at all, either a generated presenter with a background-removal treatment or presenter-free with a cursor and drawn marks carrying it. Load with ugc-ad-foundations."
---

# UGC green screen

A presenter stands in front of something the viewer can read and argues with it. The source does the persuading; the presenter only points.

## When to use

Pick this when the brief hands you a **thing on a screen that carries the claim**: a review, a competitor's pricing page, a thread, a Reddit answer, a search result, a chart, a support reply. The signal in the request is usually "react to this", "I saw this post", "here is what our competitor charges", "someone said X about us".

Not this format when:

- The screen *is* the product and you are showing it working. That is `ugc-screen-demo`.
- You are answering one specific comment on your own video. That is `ugc-reply-to-comment`, which has a different opening frame.
- You are putting two products next to each other. That is `ugc-comparison`.
- There is no source, only the founder talking. That is `ugc-founder-story`.

## The layout

The source is full-bleed behind. The presenter is a cutout, never a box.

| Slot | Where | Size |
| --- | --- | --- |
| Source | Fills the canvas, scaled so the line you will read is legible at phone size | 100% |
| Presenter cutout | Bottom-left or bottom-right corner, feet cropped, or a left-third standing figure | 25 to 35% of frame height |
| Caption | 62% down the frame, above the platform UI | Full width minus 8% gutters |
| Annotation | On the source, never on the presenter | One at a time |

Three rules that decide whether it reads as native:

1. **The cutout never covers the line being read.** If the source's key line sits bottom-right, the presenter goes bottom-left. Reframe the source, not the presenter.
2. **The source is never fully covered.** At every frame the viewer can see they are looking at a real page. The moment it becomes a background texture, the argument loses its evidence.
3. **The source is readable at arm's length.** Scale it so the sentence you are reacting to is at least 34 px tall on a 1080-wide canvas. If that means you only show a quarter of the page, show a quarter of the page.

## What makes a good source

The best source is **something the viewer already half-believes**. You are not introducing a claim, you are confirming a suspicion they arrived with.

| Strong source | Why it works |
| --- | --- |
| A competitor's pricing page with the annual toggle on | The viewer already suspects it is expensive |
| A one-star review that says the thing everyone thinks | Confirms, does not argue |
| A search result page full of bad answers | Frames the problem before you name it |
| A thread where someone asks exactly the user's question | Makes the ad a reply, not a pitch |
| A chart that goes the wrong way | Needs no setup |

Weak sources: a press release, your own landing page, anything the viewer has to be told to care about, anything that needs two sentences of context before the reaction makes sense.

Refuse outright: a named person's post used as if they endorsed the product, a fabricated screenshot attributed to a real company, an invented review. Read the claims section of `ugc-ad-foundations`. If the brief asks for a source you cannot source, mock a *generic* version (an unbranded pricing table, an anonymous review card) and say so in one line.

## The annotation beat

A reaction without a mark is a person talking over a picture. The mark is what turns it into an argument.

Place exactly one annotation per claim, landing on the word as it is spoken, and clear it before the next one:

| Mark | Use it for | Motion |
| --- | --- | --- |
| Hand-drawn circle | A number, a price, a single word | Draws on over 0.4s, uneven stroke, slight overshoot on the close |
| Underline | A full sentence you just read aloud | Wipes left to right over 0.3s |
| Punch-in | The line is small and the argument is on it | Scale the source 1.0 to 1.6 over 0.6s, hold, release |
| Strike-through | A claim you are rejecting | Draws on after the word, not before |
| Arrow | Pointing off to a second element | Only when a circle cannot reach |

Never two marks at once, and never a mark before the voice reaches the word. The mark is a beat, not decoration.

## Building it with no real cutout

Most briefs have no presenter footage. Both substitutes work:

**Generated presenter.** Make one still with `generate_image`: a person from the waist up, plain background, lit from one side, phone-camera framing, looking slightly off-lens. Give it a background-removal treatment so it sits on the source as a cutout with a soft 2 px edge, not a rectangle. Animate it with a 2 to 3 percent idle drift (a slow x/y float and a 1.5 percent scale breath) so it is not a dead sticker. If the fal connector is available, drive the still with a lipsync model instead of leaving it as a static cutout; a short lipsynced clip is better than a still and should be preferred when it exists.

**Presenter-free.** Drop the human entirely and let the cursor plus the annotations carry it. A cursor that moves to the price, hovers, then the circle draws, then the caption lands, reads as a person doing a screen share. This version is cheaper, safer with claims, and in a lot of tests it performs the same. Default to it when there is no avatar connector.

Either way the composite has to share a colour temperature. A warm presenter on a cold white page reads as pasted. Grade the cutout toward the source, not the other way.

## Shot list, 22 seconds, 9:16

| # | t | shot | on screen | said |
| --- | --- | --- | --- | --- |
| 1 | 0.0 to 2.5 | Source already full-bleed, presenter slides up from the bottom edge over 0.3s | The pricing page, annual toggle on, the number centred | "Four hundred dollars. A year. For this." |
| 2 | 2.5 to 5.0 | Hold. Circle draws on the number | Circle lands on 0:03.1 | "And that's the cheap tier." |
| 3 | 5.0 to 9.0 | Punch-in 1.0 to 1.5 onto the feature row | Feature list, two items greyed out | "Half of what you're paying for is greyed out until you upgrade again." |
| 4 | 9.0 to 12.0 | Release the punch, cut the source to the user's own page | New page, same framing, same scale | "So we just put all of it in one price." |
| 5 | 12.0 to 16.0 | Underline wipes across the price line | Underline, then the price, large | "Nineteen a month. Everything on." |
| 6 | 16.0 to 19.0 | Cut to the product doing one thing, presenter still corner-locked | Short interface moment | "Same job, done in about a minute." |
| 7 | 19.0 to 22.0 | Presenter fills more of frame, source dims 20% | Caption only, no logo until 21.5 | "Link's down there if you want to look." |

Stretching it: at 30s, add a second source (a review that agrees with you) between shots 3 and 4, with its own single annotation. At 12s, cut shots 3 and 6 and go straight from the circle to the price. Never add a third source; two is the ceiling before it stops being a reaction and becomes a deck.

## Script scaffold

```markdown
# Script: <ad name>

- format: ugc-green-screen
- length: 22s
- source: <what is on screen behind, and where it came from>
- presenter: <generated still | avatar clip | none, cursor-led>

## Hook (0 to 3s)
Read the source out loud, flatly. No setup, no greeting.
> <the number, the claim, the sentence, said the way you would say it to a friend>

## Reaction (3 to 9s)
One consequence of the thing you just read. Annotation lands here.
> <so what this actually means for you>

## Turn (9 to 12s)
Cut the source. Same framing, your page.
> <so we did it differently>

## Proof (12 to 19s)
One demonstrated difference. Not a list.
> <the one thing, with the one number>

## Ask (19 to 22s)
An offer to look, not a command to buy.
> <where it is>
```

## What you actually build

| Layer | How |
| --- | --- |
| Source | A still. The user's own via `save_asset`, or a mock you build as a scene and screenshot with `capture_frames`, or `generate_image` for a generic page. Never a live embed. |
| Source moves | Seek-safe scale and position keyframes on the still's wrapper, anchored on the line. Punch-in is a scale change centred on the line, never a looping animation. |
| Cutout | An image on its own layer with a soft edge mask. Idle drift is a short keyframed float that returns to its start pose. |
| Annotations | Inline vector paths with a draw-on animation driven by the timeline. Check your project's own component or asset library for circle and underline marks before hand-drawing one. |
| Cursor | A pointer sprite with eased position keyframes plus a 0.9 scale dip on click. |
| Captions | Burned-in, platform-default look, one line at a time. See `ugc-craft`. |
| Voice | `pick_voice` once, then `generate_voiceover`. Conversational, mid-pace, no announcer lift. |

Timing discipline: build the voiceover first, read its word timings, then place every annotation on the word. Annotations placed before the audio exists always land late.

## Failure modes

| It goes wrong like this | Fix |
| --- | --- |
| The cutout sits over the line being read | Move the presenter, not the source. Corner is a choice per shot, not per ad. |
| The source is unreadable on a phone | Crop harder and scale up. A quarter of a page at full size beats a whole page at a tenth. |
| Three marks on screen at once | One per claim, cleared before the next. If you need three, you have three ads. |
| A mocked screenshot carries a real company's name and a number you invented | Genericise it or put a bracketed placeholder in the script and say so. |
| Presenter and source are different colour temperatures | Grade the cutout toward the source. Add a 4% drop shadow so it sits in the page rather than on it. |
| The presenter is a motionless sticker | 2 to 3% idle drift, or drop the presenter and go cursor-led. |

## Plan skeleton

A scratch outline for the shot list above, in whatever form your project's own planning artifact takes:

```markdown
---
format: ugc-green-screen
duration: 22
message: <the one sentence the viewer should leave with>
arc: react to the source, land the consequence, cut to ours, ask
audience: <who already half-believes the source>
source: <what is behind the presenter, and where it came from>
presenter: generated-still | avatar-clip | none
---

## Frame 1: The source, read aloud
- duration: 2.5
- scene: Source full-bleed, presenter slides up from the bottom edge over 0.3s
- voiceover: <the claim, read flatly>
- annotation: none

## Frame 2: The mark
- duration: 2.5
- scene: Hold on the source, circle draws on the number
- voiceover: <the consequence>
- annotation: circle on <element>, lands at 0:03.1

## Frame 3: The punch-in
- duration: 4
- scene: Scale 1.0 to 1.5 onto <line>, hold, release
- voiceover: <what it actually costs them>
- annotation: underline on <line>

## Frame 4: The turn
- duration: 3
- scene: Hard cut to our page, identical framing and scale
- voiceover: <so we did it differently>
- annotation: none

## Frame 5: The ask
- duration: 3
- scene: Presenter grows, source dims 20%, caption only
- voiceover: <where to look>
- annotation: none
```

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The source image | `save_asset` for the user's own screenshot | Build the page as HTML, capture it with `capture_frames`, or `generate_image` a generic version |
| A presenter | `ai-presenter` plus the fal connector | A generated still with a cutout treatment, or drop the presenter and go cursor-led |
| Narration | `pick_voice` then `generate_voiceover` | Caption-led silent cut. The annotations still carry the argument |
| Annotation marks | Your project's own component or asset library | Hand-authored draw-on paths |

## Checks before you finish

1. `capture_frames` at frame 0. Is the source legible, and is the presenter already in frame or arriving within 0.3s? A frame of empty page has no hook.
2. Capture the frame of every annotation. Is exactly one mark visible, and is it on the word the voice is saying?
3. Capture four frames across the ad with the sound off. Does the argument survive on the source plus captions alone?
4. Check the cutout against every shot: it never overlaps the line being read, and it never exceeds 35% of frame height.
5. Safe zones: nothing that matters in the top 12% or bottom 20%.
6. Read every claim on the source back against what the user actually gave you. Any number you invented comes out.
7. Your project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).
