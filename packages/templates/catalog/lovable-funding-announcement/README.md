# Lovable funding announcement video

A prompt box types "Build me a booking site for my bakery" and a click sends it,
turning the idea into a card. That card folds into a wall of builder cards under
"Since November 2024: Millions of people built their own websites." Three stats
count up, then "$400M" counts up under "Series C, led by Menlo Ventures and the
Scaleup Europe Fund", followed by the valuation and a line of investor names.
The video ends on the Lovable mark, "Idea to app in seconds" and lovable.dev. It
is a funding announcement built from a brand story.

Started from the [Lovable funding announcement video](https://genmotion.dev/templates/lovable-funding-announcement) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 6 scenes, about 25s |
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
| `components/` | `AppCard`, `CardGrid` and `Backdrop` for the builder wall, and `brand.ts` for the cream, ink and rainbow gradient tokens |
| `assets/` | the Lovable mark as SVG and the mouse-click sound used when the prompt is sent |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. Idea to app (`01-idea.tsx`): the prompt types out, a click sends it, and the
   result becomes the hero card.
2. Millions of builders (`02-millions.tsx`): the card folds into a drifting wall
   of app cards with the headline over it.
3. Scale (`03-scale.tsx`): three stats count up, 60M projects built, 900M
   monthly visits and 65% of the Fortune 500, then a gradient band wipes across.
4. $400M Series C (`04-series-c.tsx`): the amount counts up beneath the round
   name and the lead investors.
5. Valuation & investors (`05-valuation.tsx`): the valuation figure, then two
   lines of backers, with the mark rising.
6. Lovable (`06-lovable.tsx`): the mark, the wordmark, the tagline and the URL.

## make it yours

- Change the typed prompt in `scenes/01-idea.tsx` to a request that fits your
  product.
- Update the three entries in the stats list in `scenes/03-scale.tsx`: the
  target number, suffix and label.
- Change the `to` value of the count-up in `scenes/04-series-c.tsx` and the
  investor names in scene 05.
- Replace `assets/lovable-mark.svg` with your own mark and edit the colours in
  `components/brand.ts`.
- Edit the closing tagline and URL in `scenes/06-lovable.tsx`.

Try this prompt with your coding agent:

```
Make this a seed round announcement for my company, Fernwood. Count up to $8M,
lead investor "Northfield Capital", stats of 12K teams, 3M tasks and 40
countries, and end on our logo with "fernwood.app". Keep the card wall and
gradient wipes.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Announcement video templates](https://genmotion.dev/templates/category/announcement)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/lovable-funding-announcement)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
