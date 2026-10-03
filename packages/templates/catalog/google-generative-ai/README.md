# Google generative AI launch video

A ring of photo tiles spins in around a headline that reads "The best ideas,
starts with a plan", then the whole frame slides across to "Same goes when
building" and "Generative media applications". A blue field sweeps in, and a
deck of square art cards labelled Gemini, Omni, Veo and Lyria lands one after
another before the last card opens out to fill the screen. Over that art, "One
model. Every medium." appears, and the video closes on the white Gemini mark
above "Google generative AI". It is a product launch piece for a family of
generative models.

Started from the [Google generative AI launch video](https://genmotion.dev/templates/google-generative-ai) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 4 scenes, about 24s |
| Engine | React scenes |

## open it

Install [GenMotion](https://genmotion.dev/download), then from this folder:

```sh
genmotion .
```

That opens the project, plays it frame by frame, and gives your coding agent the
context to edit it. Export to MP4 from the editor.

## what's in here

| Path | |
| --- | --- |
| `scenes/` | one React component per scene |
| `components/` | `brand.ts`, the shared blue gradient, hero-frame geometry, Gemini mark size and font |
| `assets/` | seven stock-style tile photos, four generative art images (Gemini, Omni, Veo, Lyria) and the white Gemini mark as SVG |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. Intro (`01-intro.tsx`): seven tiles ride a big ellipse around the centre
   while four headline lines come and go, then a blue field wipes across.
2. Generative (`02-generative.tsx`): square art cards stack like books pulled
   off a shelf, each with its model name, and the hero card opens to full frame.
3. Omni (`03-omni.tsx`): the hero art holds the screen under "One model. Every
   medium." and the Gemini mark fades in.
4. Lockup (`04-lockup.tsx`): the mark settles at its resting spot with "Google
   generative AI" beneath it.

## make it yours

- Swap the four lines in `scenes/01-intro.tsx` for your own launch headline.
- Replace the seven tile photos in `assets/` with shots from your product or
  customers.
- Change the model names in the card list in `scenes/02-generative.tsx` and the
  four art images to match.
- Edit `BLUE_RADIAL` in `components/brand.ts` to move the whole video to your
  brand colour.
- Replace `gemini-mark-white.svg` with your own white logo.

Try this prompt with your coding agent:

```
Rework this launch video for my product, Acme Studio. Change the intro headlines
to "Great teams / start with a brief", swap the four art cards for my own
screenshots named Draft, Review, Ship and Archive, and set the final lockup to
"Acme Studio". Keep the timing and the blue-to-black gradient.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/google-generative-ai)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
