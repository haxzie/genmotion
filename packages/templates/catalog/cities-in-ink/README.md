# Cities in ink concept video

A 36 second flight across four cities, drawn as an indigo ink engraving on
paper white. It opens inside a thin ruled panel with a serif caption beneath it,
"A letter left Paris", and the panel opens out to full bleed as the camera drops
down the Champ de Mars and through the Eiffel arch behind a letter folded into a
paper plane. The plane runs the Golden Gate span and climbs over the north
tower, crosses the Thames past Big Ben's dial, then spirals up the Burj Khalifa
through a deck of hatched cumulus. Every cut is masked by a plain stone surface
that sweeps the lens, so the four cities read as one continuous shot, and the
closing line settles over the spire: "Some words travel far."

Started from the [Cities in ink concept video](https://genmotion.dev/templates/cities-in-ink) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 4 scenes, about 36s |
| Engine | Three.js scenes |

## open it

Install [GenMotion](https://genmotion.dev/download), then from this folder:

```sh
genmotion .
```

That opens the project, plays it frame by frame, and gives your coding agent the
context to edit it. Export to MP4 from the editor.

## or stay in the terminal

```sh
npm install
npm run dev       # studio at http://localhost:4200, reloads on save
npm run check     # compile, determinism and a headless render of every scene
npm run render    # exports/<name>.mp4
```

## what's in here

| Path | |
| --- | --- |
| `scenes/` | one module per scene, drawing into a Three.js canvas. Each one builds its own city from scratch: a tower profile as a function of height, a street grid, a terrain field |
| `components/` | the engraving shader and its geometry builders in `ink.ts` (hatched boxes with window grids, contour shaded solids, broken water strokes, line beams, a city block generator), the ruled panel and caption card in `frame.ts`, the camera rig in `camera.ts`, the paper plane and its dashed route in `plane.ts`, serif type as a texture in `text.ts`, the palette in `brand.ts`, and the seeded noise in `rand.ts` |
| `assets/` | a 36 second score as an mp3 |
| `project.json` | the timeline: scene order, durations, resolution, frame rate, and the score |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

Four scenes, 270 frames each. Names are the ones in `project.json`.

1. `01-paris.ts` "Paris": the film opens on paper. The picture inks in inside a
   ruled panel, the caption "A letter left Paris" sets word by word in the box
   below it with "letter" in periwinkle, and at frame 78 the panel opens to full
   bleed while the camera is already moving. The Eiffel Tower is built from its
   real profile, four lattice legs converging at the second level, a shaft of
   corner girders and X braces, four great arches, the antenna. Haussmann blocks
   fill the city around a cleared Champ de Mars, the Seine runs in broken
   horizontal strokes, and the camera finishes trucking right past a leg pedestal
   that fills the lens.
2. `02-san-francisco.ts` "San Francisco": out from behind the south tower leg,
   caption "It crossed the fog". The Golden Gate deck, towers, main cables,
   suspenders and stiffening truss are all solved from a parabolic cable curve.
   The Marin headlands and the Presidio are contour hatched terrain from value
   noise, downtown sits on the same height field, and fog banks drift across the
   strait. The camera rises along the span and past the north tower crown strut.
3. `03-london.ts` "London": rising over the south parapet, caption "It outran
   every clock". The Palace of Westminster, Victoria Tower, Elizabeth Tower and
   Westminster Bridge arches, plus the London Eye as a rim, spokes and 32
   capsules, turning slowly. Four clock dials are drawn ring by ring with 60
   minute marks and hands that tick on from ten past ten. The camera flies the
   Thames and pushes into the blank lower half of the dial.
4. `04-dubai.ts` "Dubai": a whip pan off a podium wall, caption "It climbed past
   the clouds". The Burj Khalifa is 24 tiers of a Y shaped plan whose three wings
   step back in a spiral, a hex core, a 196 metre spire. 400 downtown towers are
   scattered with the opening sight line kept clear, palms line the lake, and the
   camera spirals up through 46 cloud puffs to circle the spire while "Some words
   travel far." sets in the upper third.

## make it yours

- The four captions are plain word arrays at the bottom of each scene file:
  `words: [{ t: "A" }, { t: "letter", accent: true }, ...]`. Change the line,
  and the accent flag moves the one periwinkle word.
- `components/brand.ts` holds the whole look in five values: `PAPER`, `INK`,
  `RULE`, `TEXT`, `ACCENT`, plus the serif stack. Swap the ink for sepia or
  graphite and every hatched surface in all four cities follows.
- Each scene's `CAM` array is a list of camera keys, and `FLY` is the plane's
  own path. Both are frame numbers with positions, so retiming a flight is
  editing numbers in one place.
- Replace `assets/score-cities-in-ink.mp3` and update the clip in
  `project.json`. The handoffs are cut to the scene length, not to the music, so
  a new track does not break them.
- A city is swappable. The geometry builders in `components/ink.ts` are generic:
  `city()` lays out a street grid, `boxes()` instances hatched buildings,
  `blobs()` makes contour shaded solids, `lines()` and `beams()` draw ink
  structure. A new landmark is a new profile function.

Paste something like this to your coding agent:

```
Replace the London scene with Tokyo: Tokyo Tower instead of the Elizabeth
Tower, the Sumida instead of the Thames, caption "It passed the harbour" with
"harbour" as the accent word. Keep the masked cut at both ends so the handoffs
still work.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Social media video templates](https://genmotion.dev/templates/category/social-media)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/cities-in-ink)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio.
Browse more [video templates](https://genmotion.dev/templates) or
[download the studio](https://genmotion.dev/download).
