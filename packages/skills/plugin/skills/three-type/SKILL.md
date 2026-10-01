---
name: three-type
description: "Typography in Three.js scenes: a shared label component, sizes that stay readable in every aspect ratio, word-by-word and line-by-line reveals, counters that tick to a number, highlight sweeps, captions, and a headline that survives a camera move. Load it whenever a Three.js scene puts words on screen: titles, taglines, stats, captions, calls to action."
---

# Type in Three.js scenes

There is no DOM: every word is a canvas texture on a plane (the project's authoring guide has the `label()` helper). This skill is what to do with those planes so type reads, moves well and stays consistent across a whole video.

## When to use

- A scene shows a headline, a tagline, a stat, a caption or a call to action.
- Copy has to animate in word by word, or a number has to count up.
- Text that looked fine at 16:9 is too small or overflowing at 9:16.

## One type system per video

Put the label helper in `components/type.ts` the first time any scene needs text, and give it named styles instead of raw sizes:

```ts
export const TYPE = {
  display: { size: 140, weight: 800 },
  title: { size: 96, weight: 700 },
  body: { size: 48, weight: 500 },
  caption: { size: 40, weight: 600 },
} as const;
```

Every scene imports `TYPE` and the helper. Two scenes choosing their own sizes is how a video ends up with five typefaces' worth of inconsistency in one font.

## Sizes that read

- The floor for anything the viewer must read is 28 composition pixels tall as captured; headlines want 80–160.
- On-screen size depends on the plane's distance from the camera. Compute it once: pixels per world unit at distance `d` is `height / (2 * Math.tan(fov / 2) * d)`. A plane 0.4 units tall where one unit is 260 pixels reads at 104 pixels.
- In 9:16 the frame is narrow: break headlines into 2–4 words a line and stack them, rather than shrinking one long line.
- Keep text planes facing the camera. Tilted type is decoration, not information.

## Reveals

Animate the meshes, never the canvas. Build every word or line as its own plane in the builder, then stagger:

```ts
words.forEach((mesh, i) => {
  const t = interpolate(frame, [i * 3, i * 3 + 12], [0, 1], Easing.easeOut);
  (mesh.material as THREE.MeshBasicMaterial).opacity = t;
  mesh.position.y = baseY[i] - (1 - t) * 0.15;
});
```

| Reveal | Stagger | When |
| --- | --- | --- |
| Word by word | 2–4 frames | Taglines, short punchy lines |
| Line by line | 6–10 frames | Two- or three-line statements |
| Whole block | none | Body copy, anything longer than a line |
| Typewriter | 1–2 frames per character, one plane per character | Code, URLs, search queries. Only where typing is the point |

Exits are faster than entrances and leave along the axis they arrived on. Finish every exit about six frames before the scene ends.

## Counters

A number counting up is a sequence of textures, not one texture redrawn every frame. Pre-render the digits 0–9 (plus separators like `,`, `.`, `%`, `$`) once as textures, lay out one plane per digit position, and swap each plane's `map` per frame from the interpolated value:

```ts
const value = Math.round(interpolate(frame, [0, 45], [0, 12480], Easing.easeOut));
```

Ease out so the count slows as it lands, and hold the final number for at least a second.

## Highlight and emphasis

- A highlight is a plane *behind* the word, scaled on x from 0 to 1 with its origin on the left (shift the geometry with `translate(w / 2, 0, 0)` in the builder).
- Colour emphasis: one word in the accent colour, the rest neutral. Never more than one emphasised word per line.
- A punch-in on the key line (see `three-camera`) does more than making the type bigger.

## Captions

For narrated videos, captions are short phrases (2–5 words) timed to the audio, positioned in the lower third and kept clear of platform UI in 9:16 (stay above the bottom 20% and away from the right edge). One caption plane visible at a time, swapped on the beat.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Checking legibility | `capture-frames` mid-reveal and on the held line | None |

## Checks before you finish

1. `capture-frames` on every held headline: crisp, not soft (raise the drawn `size` rather than scaling the plane up), and at least 28 pixels tall.
2. One frame in each aspect ratio the video ships in: no line runs off the edge.
3. Every text mesh is named after its words (`headline`, `cta-line`).
4. `validate` passes.
