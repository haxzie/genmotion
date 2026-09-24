---
name: ugc-problem-solution
description: "The PAS demo: open on the failure state with the product absent, agitate for no more than five seconds, turn, then demonstrate honestly and land on relief. The most reliable starting point for ecommerce and SaaS, and the format to default to when the brief does not name one. Covers the failure-state opening, how long agitation may run, the turn, the demonstration that has to be truthful, and the relief shot. Load with ugc-ad-foundations."
---

# UGC problem solution

Problem, agitation, solution. The oldest shape in direct response and still the highest floor in UGC: it rarely produces the best ad in a test, and it almost never produces the worst.

## When to use

Default to this when the brief names a pain, a frustration, a "people struggle with", or a competitor's shortcoming. Default to it also when the brief names no format at all and the product solves something specific.

Do not pick it when:

- There is no real problem, only a preference. Manufactured pain is the most transparent thing in advertising. Use `ugc-listicle` or `ugc-screen-demo`.
- The change is visual and the proof is the change itself. Use `ugc-before-after`.
- The credibility has to come from a person rather than a demonstration. Use `ugc-testimonial`.
- The problem is the entire joke. Use `ugc-skit`.

## Open on the failure state, product absent

Frame 0 is the problem happening. Not a person describing the problem, not a title card naming it: the thing going wrong, on screen, with the product nowhere in shot.

| Weak opening | Strong opening |
| --- | --- |
| A person saying "Do you struggle with tangled cables?" | A hand pulling a knot of cables out of a bag |
| A title card: "Editing takes too long" | A timeline with 47 clips and a render bar at 6 percent |
| A stock shot of someone looking stressed | A phone screen at 2 percent battery, at 4:12pm |

The product being absent is load-bearing. If it is in the first frame, the viewer has classified the video as an ad before you have shown them anything.

Say the problem flatly. Not performed, not bright. The way you would say it to someone in the room: "This happens every single time."

## Agitation, and its five-second ceiling

Agitation is the second consequence. The problem is the tangle; the agitation is missing the flight. It exists to move the viewer from "yes that happens" to "and it costs me something".

**Never more than five seconds.** Past five seconds of dwelling on a problem the viewer has already agreed with, you are no longer building tension, you are being unpleasant, and the thumb moves. At a 15-second total, agitation gets two seconds. At 30 seconds it gets four. There is no length at which it gets more than five.

One consequence, not three. "So I missed the deadline" is agitation. "So I missed the deadline and my boss was annoyed and I had to work the weekend" is a complaint.

## The turn

The turn is one cut and one sentence, and it is the hinge the whole ad swings on.

- **It is a hard cut.** No dissolve, no wipe. The visual grammar of a turn is abruptness.
- **The energy changes, once.** Slightly brighter, slightly faster, but still the same person in the same room. If the turn sounds like a different video, it reads as the ad starting.
- **The product enters the frame physically.** A hand places it down, a tab opens, a box appears. Entering beats already being there.
- **The line is short.** "Then someone showed me this." "So I tried the other thing." Under seven words.

Never let the turn land on a brand name. The name comes later, once the thing has earned it.

## The demonstration has to be honest

This is where the format is won or lost, and where most agents cheat.

Show the product doing the **actual** thing, in real time or in a cut that a viewer can reconstruct. If the process takes four minutes, show the start, mark the cut visibly, and show the end. A jump cut the viewer can see is trustworthy; a jump cut disguised as continuity is not.

Rules that are not negotiable:

- Do not state a number, a timeframe, a rating or a result the user has not given you. Bracket it in the script and say so in a line.
- Do not show an outcome the product cannot produce.
- If the demonstration needs a caveat ("takes about a week"), put the caveat on screen. It reads as confidence, and it converts better than the claim alone.
- A synthetic presenter is fine. A synthetic presenter named as a specific real customer is not.

## The relief shot

The last visual is the problem's absence. Same frame as shot 1, same angle, same lighting, now resolved: the cables coiled, the timeline empty, the battery full. The rhyme is what makes the ad feel finished.

Hold it for at least a second before the CTA text arrives. Relief needs a beat of nothing.

## The shot list

Thirty seconds, 1080x1920, one person, one room, hand-held.

| # | t | shot | on screen | said |
| --- | --- | --- | --- | --- |
| 1 | 0.0 to 2.0 | The failure, mid-action, hand already in frame | The knot of cables, pulled out of the bag | "Every single time." |
| 2 | 2.0 to 3.5 | Cut wider, the person, off-centre, flat delivery | Their face, unbothered, a little tired | "Every bag I have ever owned." |
| 3 | 3.5 to 7.0 | Agitation: the consequence, not the problem | Digging through the bag at a gate, boarding sign behind | "Spent four minutes on this at security once." |
| 4 | 7.0 to 8.0 | **The turn.** Hard cut. A hand places the product down | The product entering frame, no logo shot | "Then I got this." |
| 5 | 8.0 to 13.0 | The mechanism, close, unbroken | Hands using it, one continuous action | "Everything has a slot. That is the whole idea." |
| 6 | 13.0 to 19.0 | The demonstration, real time, no cheating | Packing it, cable by cable, in one take | "Charger, dongle, the little one nobody has a name for." |
| 7 | 19.0 to 23.0 | The proof, the bit that could fail, not failing | Zipping shut, turning it over, nothing moves | "Shake it. Nothing." |
| 8 | 23.0 to 26.5 | **Relief.** Shot 1's frame, resolved | The same bag, the same angle, one clean pull | "Four seconds." |
| 9 | 26.5 to 30.0 | Direct to camera, product held loosely | Their face, the product in hand, no end card | "It's the [name] one. Link's in my bio." |

**Compressing to 15s.** Keep 1, 4, 6, 8, 9. Agitation becomes a single clause inside shot 1. **Stretching to 45s.** Extend shot 6 with a second use case and add a four-second objection beat between 7 and 8 ("I thought it would be bulky").

## The script scaffold

At 2.5 words a second, a 30-second ad is 70 to 75 words. Write to the number.

```markdown
# SCRIPT

## Problem (0 to 3.5s, <= 12 words)
[The failure, stated flatly, as a fact about your life. Present tense.]

## Agitation (3.5 to 7s, <= 10 words, NEVER past 5 seconds of runtime)
[One consequence. What it cost. Not a second problem.]

## Turn (7 to 8s, <= 7 words)
["Then I found this." No brand name yet.]

## Mechanism (8 to 13s, <= 14 words)
[Why it works, in one clause. The idea, not the feature list.]

## Demonstration (13 to 23s, <= 25 words)
[Narrate only what is not visible. The footage carries the rest.]
[Any number, timeframe or rating the user has not supplied goes in
 [brackets] and is flagged to the user, never invented.]

## Relief (23 to 26.5s, <= 6 words)
[The result, understated. Understatement is the tell of a real person.]

## CTA (26.5 to 30s, <= 10 words)
[Recommendation-shaped. Name the product here, for the first time.]
```

## What you build

**With the user's footage.** `save_asset` each clip, trim with `ffmpeg` into `assets/`, and lay them out as timed clips on one track. Time the wrapper or the clip, never both.

**With no footage at all**, which is the normal case, build the failure state as a designed frame rather than a fake photograph:

| Beat | Build it as |
| --- | --- |
| A software failure | The real interface, rebuilt in HTML, in its broken state. Error toast, spinner at 6 percent, 47 unread. |
| A physical failure | `generate_image` a still of the failure state, then a slow Ken Burns push (scale and drift over the hold). Generate the relief shot in the same prompt family so the two frames rhyme. |
| The turn | A hard cut plus a 120ms brightness and scale step on the incoming clip. Nothing longer. |
| The demonstration | A screen rebuild, or a sequence of three generated stills cut on the narration. Three honest stills beat one dishonest video. |
| The relief | The same generated frame as the failure, re-prompted with the problem resolved. Match aspect, crop and light direction. |

**Sound.** The problem beat wants a small unpleasant sound (a zip, a buzz, a notification). The turn wants silence for 200ms, then the bed. Cutting the audio entirely at the turn is the cheapest and strongest trick this format has.

## Failure modes

**The invented statistic.** "Saves you 4 hours a week" appearing from nowhere. Fix: bracket it in the script and tell the user you need the real number.

**Agitation that will not stop.** Eight seconds of problem before anything happens. Fix: cut to one consequence and move the turn earlier. Check the timestamp of the turn: it should be at roughly 25 percent of total runtime.

**The product in frame 0.** Usually because the generated failure image was prompted with the product in it. Fix: re-prompt without it.

**A turn that dissolves.** A crossfade at the hinge, which drains all the energy from it. Fix: hard cut, and change the audio on the same frame.

**The dishonest demo.** A speed-ramped process presented as real time. Fix: show the cut. A visible "3 hours later" card is more persuasive than a seamless lie.

**Relief that does not rhyme.** The last shot is a new angle, so the change does not read. Fix: reuse the exact framing of shot 1.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Failure and relief stills | `generate_image`, prompted as a matched pair | Build both beats as typography and rebuilt UI. |
| The user's own footage | `save_asset`, then `ffmpeg` to trim | Generated stills with camera moves, which this format tolerates well. |
| Narration | `pick_voice` then `generate_voiceover` | Captions only. The turn still reads visually. |
| The audio drop at the turn | `generate_sfx` plus a silent beat | A hard cut alone, which is weaker but honest. |
| Camera moves on stills | A slow push/drift (Ken Burns) on the still | Static frames, cut faster to compensate. |

## Checks before you finish

1. `capture_frames` at t=0. Is the product visible? If yes, rebuild the shot without it.
2. Find the turn's timestamp. Is it at or before 30 percent of the runtime? Is agitation under five seconds?
3. Capture the frame either side of the turn. Is it a hard cut, with a visible energy change?
4. Read the script and list every number, timeframe and claim. Can each one be sourced to the user? If not, bracket it.
5. Capture the relief shot and shot 1 side by side. Do they share framing?
6. Mute it and watch. Does problem, turn, solution still read?
7. Your project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).

## Plan skeleton

A scratch outline for the shot list above, in whatever form your project's own planning artifact takes:

```markdown
---
format: 1080x1920
duration: 30s
message: [the problem, and the one thing that ends it]
arc: Problem → Agitation → Turn → Mechanism → Demo → Relief → CTA
audience: [who has this problem]
turn_at: 7s
---

## Frame 1: The failure
- duration: 3.5s
- scene: The problem happening, hand already in frame, product absent
- voiceover: Every single time.
- product_present: false

## Frame 2: The cost
- duration: 3.5s
- scene: One consequence of the problem, not a second problem
- voiceover: Spent four minutes on this at security once.
- agitation_seconds: 3.5

## Frame 3: The turn
- duration: 1s
- scene: Hard cut. A hand places the product into frame.
- voiceover: Then I got this.
- transition_in: cut
- audio: drop to silence for 200ms

## Frame 4: Mechanism and demo
- duration: 11s
- scene: The product working, real time, the cut visible if there is one
- voiceover: Everything has a slot. That is the whole idea.
- claims: [any number here must be sourced to the user]

## Frame 5: Proof
- duration: 4s
- scene: The bit that could fail, not failing
- voiceover: Shake it. Nothing.

## Frame 6: Relief
- duration: 3.5s
- scene: Frame 1's exact framing, resolved
- voiceover: Four seconds.
- rhymes_with: Frame 1

## Frame 7: CTA
- duration: 3.5s
- scene: Direct to camera, product held loosely, no end card
- voiceover: It's the [name] one. Link's in my bio.
```
