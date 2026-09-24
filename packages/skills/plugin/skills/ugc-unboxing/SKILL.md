---
name: ugc-unboxing
description: "The first-impression ad: a box opened on camera, hands in frame, the product revealed in stages. Covers the reveal choreography beat by beat, why the hands carry the shot and the face is optional, scale and packaging as the actual subject, the ASMR-adjacent sound design that holds retention, and what to do when there is no physical product (a software unboxing is the onboarding, and the script has to say so). Load with ugc-ad-foundations."
---

# UGC unboxing

A box, two hands, and a product that arrives in pieces. The format sells anticipation: the viewer stays because something is still covered.

## When to use

Pick this when the request names an unboxing, a first impression, a "what's in the box", a haul, or a packaging reveal, and when the thing being sold has a physical form (or a first-run experience that behaves like one). The tell in the brief is a noun you could put on a table.

Do not pick it when:

- The product is a workflow and the interesting part is the interface. That is `ugc-screen-demo`.
- The point is the sound rather than the reveal. That is `ugc-asmr-product`.
- Someone is telling you it changed their life. That is `ugc-testimonial`.
- You have a before state and an after state. That is `ugc-before-after`.

Load `ugc-ad-foundations` alongside this, always.

## The reveal choreography

An unboxing is a strip tease with a return policy. Every beat removes exactly one layer, and the layer that is left is what buys the next three seconds.

| Beat | Lands by | What comes off | Why it holds |
| --- | --- | --- | --- |
| Box in frame | 0.0s | Nothing | The sealed object is the hook. It is a question with a lid. |
| Seal broken | 3.0s | Tape, sticker, shrink | The first irreversible act. Sound does most of the work. |
| Lid off | 6.0s | The outer box | Reveals arrangement, not product. Tissue, foam, a card. |
| Product lifted | 9.0s | The wrap | The first time the thing exists. Hold it against a hand. |
| Turned and handled | 12.0s | Nothing, this is texture | Weight, finish, one detail nobody photographs. |
| First use | 15.0s | The protective film | The product doing its one job for the first time. |
| Verdict | 17.5s | Nothing | Two sentences, flat, looking at the product and not the lens. |

Never remove two layers in one cut. The moment a viewer can see everything, the ad is over, and every second after that is a different ad you did not plan.

**Stretching it.** At 15s, drop "turned and handled" and merge the verdict into the first use. At 45s, split "first use" into three separate uses and put a real beat of silence between them; that silence is where an unboxing gets its texture, and a 45s cut without one feels like a 20s cut read slowly.

## The hands matter more than the face

Cut the face if you have to choose. Three reasons, in order of how much they matter:

1. **The hands are the viewer's proxy.** A first-person pair of hands is the closest a feed gets to the viewer holding the thing. A face is someone else holding it.
2. **There is no casting problem.** Hands have no age, no accent and no implied endorsement. A generated pair of hands opening a box is not a person claiming anything.
3. **There is no lipsync problem.** The narration is voiceover over hands, which means you can write the script last and change it without re-rendering a presenter.

If a face does appear, it appears once, at the verdict, and it is reacting rather than presenting. Never open on a face in this format: a face on frame 0 with a box in the background is a product video, and the viewer sorts it as an ad before the seal breaks.

## Scale and packaging are the subject

The product is not the subject for the first nine seconds. The packaging is. Shoot it that way:

- **Give a scale reference in every shot that contains the product.** A hand, a thumb, a desk edge, a coffee cup. A product photographed alone at an unknown size is a render, and renders read as ads.
- **Shoot the unglamorous layers.** The tissue paper, the foam cutout, the little card. Those are the frames that convince, because a fake unboxing skips them.
- **One detail nobody markets.** The weight of the lid. The magnet. The way the cable is coiled. Say one specific true thing about it: "it is heavier than it looks" outperforms "the build quality is incredible" every time, because the first one is an observation and the second one is copy.
- **Keep the surface honest.** A bare desk, a rug, a kitchen counter with something else on it. A seamless white sweep is a studio, and a studio is an ad.

## Sound is the retention device

This format is ASMR-adjacent whether you intend it or not, and the sound is half of why people finish it. Build the sound first and cut the picture to it.

| Moment | Sound | Note |
| --- | --- | --- |
| Seal broken | Tape tearing, one long pull | Generate it with `generate_sfx`. This is the single most important cue in the ad. |
| Lid off | Cardboard sliding on cardboard | Low, dry, short. |
| Tissue | Paper crinkle | Quiet. If it is loud it reads as a foley library. |
| Product lifted | Nothing, then a soft set-down | Silence under a reveal is a choice, and it works. |
| Magnet or click | A single click | Cut the picture exactly on the transient. |

Every hard cut lands on a transient. If a cut has no sound under it, either move the cut or add the sound. A music bed, if you use one at all, sits low enough that the tape tear reads over it, and it must not be doing anything interesting at the reveal.

**Design for mute anyway.** The captions carry the verdict. The sound is a bonus for the half of the audience who have it on.

## When there is no box

Most software has no box, and the wrong instinct is to invent one. A fabricated package for a product that does not ship in a package is a lie the viewer catches in the first frame, because nothing about it looks handled.

**A software unboxing is the onboarding.** Say that out loud in the script, in the hook, in the first five words. "This doesn't come in a box, so here's the next best thing" is a legitimate hook and it earns the format instead of borrowing it.

The layers map cleanly:

| Physical layer | Software equivalent |
| --- | --- |
| The sealed box | The install button, or the sign-up screen |
| Breaking the seal | The first launch, the splash, the permission prompt |
| Lid off | The empty state, before any data |
| Product lifted | The first real thing you make in it |
| First use | The moment it does the thing you came for |
| Verdict | Two flat sentences over the finished artifact |

Shoot that as a screen recording and keep the hands: a real hand entering frame to tap a phone or push a trackpad puts the physical-reveal grammar back over a digital reveal, and that is why it works.

Merch, hardware peripherals and a printed onboarding kit are all genuinely physical. Use the real thing when the user has one.

## The script scaffold

```markdown
# Script

## Hook (0.0 to 3.0s)
[One sentence about the box, said flatly. Never "look what came in the mail today".]
[If software: the line that admits there is no box.]

## Seal (3.0 to 6.0s)
[Nothing, or one half-sentence. Let the tape carry it.]

## Arrangement (6.0 to 9.0s)
[One observation about how it is packed.]

## Reveal (9.0 to 12.0s)
[The product named, once. This is the only time the name is spoken mid-ad.]

## Texture (12.0 to 15.0s)
[The one specific true detail. Concrete noun, no adjective stack.]

## First use (15.0 to 17.5s)
[What it does, demonstrated. Do not narrate over the demonstration.]

## Verdict + CTA (17.5 to 20.0s)
[Two sentences. The second one is the CTA, said as a recommendation.]
```

Twenty seconds is roughly 50 spoken words at 2.5 words a second, and an unboxing should come in under that: leave room for the tape.

## What you actually build

You almost never have footage. Build it out of stills and moves.

- **Product stills at three reveal stages.** `generate_image` for a sealed box, an open box with the product still wrapped, and the product in a hand on the same surface. Prompt the same surface, the same light and the same hand in all three so they cut together. If the user supplied photos, `save_asset` them and use those instead; real beats generated every time here.
- **Fake the hand move with a camera move.** You do not need a hand to animate. A slow push-in on a still, with a slight off-axis drift, reads as a hand-held reveal. Keyframe scale and position, eased out over the move.
- **Cut on the SFX.** Place the `generate_sfx` clips on the timeline first, note their transient times, then set each still's start time to land on one. This is the whole trick of the format.
- **A layer mask for the reveal.** A wipe or a scale-up of the product still over the box still, timed to 0.4s, is the cheapest convincing "lid off" you can build. Hard, not dissolved.
- **For software:** a screen recording of the real onboarding is the asset. Put it in a device frame, push in on the empty state, and cut to the filled state. `ugc-screen-demo` has the device-frame grammar; borrow it by name, do not load it as a second format skill.
- **Captions in the platform default look.** Read `ugc-craft` for the caption treatment.

Nothing in the composition may be random or clock-driven. The reveal timing is authored, not sampled.

## Failure modes

| It goes wrong like this | Fix |
| --- | --- |
| The product is visible in frame 0, next to the box | Reshoot the first still with the box only. A visible product deletes the entire premise. |
| The reveal is held too long, and the viewer leaves mid-anticipation | Anticipation decays after about four seconds. If a layer is on screen longer than that with nothing changing, cut a beat out. |
| No scale reference, so the product reads as a render | Put a hand, a thumb or a known object in every product frame. |
| Sound effects drift half a beat off the cuts | Place the SFX first and cut to them, never the reverse. Check with `capture_frames` at each transient. |
| A fabricated box for a product that ships as a download | Switch to the onboarding mapping above and say the line about there being no box. |
| Two layers come off in one cut | Split the cut. One layer per beat, always. |

## Plan skeleton

A scratch outline for the shot list above, in whatever form your project's own planning artifact takes:

```markdown
---
format: ugc-unboxing
duration: 20s
message: [The one thing the viewer should believe at 20s.]
arc: sealed object > first irreversible act > arrangement > product > texture > use > verdict
audience: [Who is scrolling. Be specific: not "everyone", not "gen z".]
aspect: 9:16
hook_family: object-in-hand
sound_first: true
---

## Frame 1: Sealed

- duration: 3.0s
- scene: The closed box on a real surface, hand entering frame at 1.2s. Available light.
- voiceover: [The flat opening line.]
- sfx: none until 2.6s, then the tape pull begins
- caption: [The hook, burned in, five words or fewer.]

## Frame 2: Seal

- duration: 3.0s
- scene: Close on the tape. Push in slightly. Cut on the tear transient.
- voiceover: [Half a sentence, or nothing.]
- sfx: tape tear, one long pull

## Frame 3: Arrangement

- duration: 3.0s
- scene: Lid off. Tissue and foam, product still covered.
- voiceover: [One observation about how it is packed.]
- sfx: cardboard slide

## Frame 4: Reveal

- duration: 3.0s
- scene: Product lifted against a hand for scale. Hold still.
- voiceover: [The product named, once.]
- sfx: silence, then a soft set-down

## Frame 5: Texture

- duration: 3.0s
- scene: The one detail nobody markets. Macro, off-centre.
- voiceover: [The specific true observation.]

## Frame 6: First use

- duration: 2.5s
- scene: The product doing its one job. No narration over the action.
- sfx: whatever the product actually sounds like

## Frame 7: Verdict

- duration: 2.5s
- scene: Product at rest, hand withdrawing. End card or bare.
- voiceover: [Two sentences. The second is the CTA, said as a recommendation.]
- caption: [CTA text, above the bottom 20 percent.]
```

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Product imagery | `save_asset` for the user's photos, `generate_image` for the rest | Build the whole reveal in typography and a silhouette. It is weaker but it ships. |
| Reveal sound design | `generate_sfx` | A music bed with hard cuts on its own transients. Never silence under a cut. |
| Narration | `pick_voice` then `generate_voiceover` | Caption-led and silent. This format survives mute better than most. |
| A screen recording, for a software unboxing | The user's own capture, via `save_asset` | Generated UI stills, stated as mockups if they are not the real product. |

## Checks before you finish

1. **Frame 0 test.** `capture_frames` at frame 0. Is the product visible? If yes, the premise is dead. Reshoot the frame.
2. **Layer test.** Capture one frame per beat. Exactly one thing came off between each pair. If two did, split the cut.
3. **Scale test.** Every frame containing the product has a scale reference in it.
4. **Transient test.** Capture the frame immediately before and after each cut. Each cut sits on a sound, not near one.
5. **Mute test.** Read only the captions, start to finish. Does the reveal still make sense and does the CTA still land?
6. **Honesty test.** If there is no physical product, the script says so in the first five words. No invented packaging, anywhere.

Then your project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three), and only then say it is done.
