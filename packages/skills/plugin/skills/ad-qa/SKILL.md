---
name: ad-qa
description: "The pre-ship review gate for a short-form ad: six tests run with capture_frames (first frame, mute, safe zone, caption, ad-code and claims), the exact timestamps to capture at, what a failure looks like for each one and the fix, and the short report to hand the user at the end. Every ugc-* format skill's final checklist points here. Load it before telling anyone an ad is finished."
---

# Ad QA

An ad that lints clean can still be unwatchable. This is the pass between "it renders" and "it is done".

## When to use

Load this at the end of any short-form ad, before you tell the user it is finished. Every `ugc-*` format skill's checklist ends by pointing here.

Run it in order. Test 1 fails most often and is cheapest to fix; test 6 is the one that matters most if it fails.

## The captures to take

Before testing anything, take this set. For an ad of duration D:

| At | Why |
| --- | --- |
| `0` | Frame zero, the thumbnail and the autoplay still |
| `0.5s` | Has anything moved yet |
| `1.5s` | Is the hook line settled and legible |
| The midpoint of each scene | The mute and safe-zone tests |
| Two caption cards, mid-word | The caption test |
| `D - 2s` | The CTA, held |

```
capture_frames({ at: "0" })
capture_frames({ at: "0.5s" })
capture_frames({ scene: "02-problem" })
```

A scene without `at` captures 60 percent in, which is usually the moment the scene is doing its job.

## Test 1: the first frame

**Look at the frame-zero capture. Cover the text with your attention and ask whether the image alone would stop you.**

| Fails when | Fix |
| --- | --- |
| It is a logo, a wordmark or a brand colour field | Replace the scene's plate entirely. The brand belongs on the end card. |
| It is a title card: text on a flat field with nothing else | Put something behind the text. A plate, a screen, a hand. |
| It is black, or nearly black | The first scene starts mid-shot. Trim the clip so frame one is already in motion. |
| The person is about to speak but has not | Trim into the middle of the first word. |
| The largest element on screen is not the hook | Resize. The hook line is the biggest thing in the frame. |

## Test 2: mute

**Read only what is on screen across the scene captures. Does the pitch survive?**

Most of the audience never turns the sound on, so a mute failure is a failure for the majority of viewers.

| Fails when | Fix |
| --- | --- |
| A beat's meaning is only in the narration | Add the line as a caption or an on-screen element at that beat. |
| The turn is audible but not visible | Give the turn a visual: a cut, a state change, a mark landing. |
| The CTA is spoken only | On-screen text and a visual cue, both, in the same two seconds. |

## Test 3: safe zones

**Check every capture against the platform's reserved areas.**

For a 1080x1920 canvas: nothing that carries meaning above y 230 or below y 1540, and nothing important in the right 14 percent where the action rail sits.

| Fails when | Fix |
| --- | --- |
| A caption sits in the bottom fifth | Move it to 60 to 70 percent down. |
| A headline runs under the top chrome | Move it into the middle 60 percent. |
| The subject's face is behind the action rail | Reframe. Offset the crop left. |

## Test 4: captions

| Fails when | Fix |
| --- | --- |
| A spoken line has no caption | Caption every spoken line. No exceptions. |
| It is unreadable against a busy frame | Add a 6 to 10px stroke, or a solid block behind. A drop shadow is not enough. |
| More than three words land at once, in a word-by-word style | Re-split the timing. |
| The caption is the script verbatim, filler and all | Trim the filler out of the caption even when it is spoken. |
| It is legible on a laptop but not at arm's length | Increase the size. This is the actual viewing distance. |

## Test 5: the ad code

**Look at the first second again and name the thing that says "advertisement".** There is almost always one.

| The code | The fix |
| --- | --- |
| Even, directionless light | Grade it. Let one end clip. |
| Dead-centre composition | Offset the subject a few percent. |
| A dissolve or a graphic wipe | Hard cut. |
| A logo bug or watermark running throughout | Remove it. The brand lands on the end card. |
| A lower third with a name and title | Remove it or make it a caption. |
| Every shot the same length | Vary them. Hook shots under 1.2s, body 1.5 to 2.5s. |
| Narration performed rather than spoken | Regenerate with a flatter delivery direction. |

## Test 6: claims

**Read every line of the script and every piece of on-screen text, and ask where each fact came from.**

This is the one that matters. A UGC ad is a person saying something, which is exactly what makes a false claim in one worse than a false claim in a banner.

| Fails when | Fix |
| --- | --- |
| A number, rating, timeframe or user count nobody supplied | Remove it, or replace it with a bracketed placeholder and tell the user. |
| A testimonial attributed to a named person who did not say it | Remove the name, or remove the line. |
| A synthetic presenter implied to be a real customer, employee or expert | Rewrite the line so it does not claim an identity. |
| A before-and-after implying a typical result the user has not claimed | Remove the implication, or ask the user to confirm. |
| A rebuilt UI showing a feature that does not exist | Rebuild what exists. |
| A competitor named alongside a claim about them nobody sourced | Remove the claim. Comparing on your own product's facts is fine. |

Never resolve a claims failure by guessing. Ask, or leave the placeholder in and say so in one line.

## The report

After the six tests, give the user one short paragraph, not a checklist:

> Ran the six checks. Frame zero is the failure-state shot with the hook line over it, which reads at thumbnail size. It plays muted: every spoken line is captioned and the turn is a hard cut, so the pitch survives with no sound. Captions sit at 63 percent down, clear of the action rail. Two things for you: the "eleven minutes" figure is a placeholder because I did not have a real number, and the presenter is generated, so the script does not claim they are a customer.

Name what you changed, and name what only they can answer. Do not list the tests that passed.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Every test | `capture_frames` | There is no fallback. An ad nobody looked at is not finished. |
| The composition or scene compiling at all | Your project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three) | None. Run it first; a failing composition or scene captures nothing useful. |
| The timeline as the editor sees it | `project_overview` | Read the scene timing by hand. |

## Checks before you finish

1. All six tests above, in order, with the captures actually taken.
2. This project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three) passes with no findings.
3. The report is written and includes anything only the user can resolve.
4. Nothing is described to the user as verified that was not looked at.
