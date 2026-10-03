# GitHub star count announcement video

A twelve second star count announcement for firecrawl/firecrawl, drawn like a
blueprint. A header gives the repo name and "Stargazers", a "Total stars" label
sits over measurement brackets, and the counter rolls from 0 to 176,599 while a
growth chart climbs along the bottom. When the count lands, two party poppers
fire confetti from the lower corners, and the frame fades out. There is no
audio.

Started from the [GitHub star count announcement video](https://genmotion.dev/templates/github-star-count-announcement) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 1 scene, about 12s |
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
| `components/` | `brand.ts` with the colours and the repo name and star count, a grid backdrop, and the star history chart |
| `assets/` | the Firecrawl mark and a dark GitHub mark, both SVG |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-stars.tsx` (Star count): the header and brackets appear on a gridded
   paper background, the star history chart grows while the counter climbs to
   176,599, confetti fires on the landing frame, and the counter fades out.

## make it yours

- Set `repo.name` and `repo.stars` in `components/brand.ts` to your repo and its
  current star count.
- Replace `assets/firecrawl-mark.svg` with your logo and keep the size set in
  the header image.
- Reshape the growth curve in `components/StarHistoryChart.tsx`, which is a
  short list of control points from launch to today.
- Change the confetti colours in `POPPER_COLORS`, or the number of pieces and
  `power` on the two `Confetti` blocks.
- Retime the count with `COUNT_FROM` and `COUNT_DUR` at the top of
  `scenes/01-stars.tsx`, and update `durationInFrames` in `project.json` to
  match.

```
Update this for my repo acme/widgets at 12,400 stars: change the name and number, reshape the chart to a steady climb, and use my logo from assets/logo.svg.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Announcement video templates](https://genmotion.dev/templates/category/announcement)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/github-star-count-announcement)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
