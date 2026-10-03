# GitHub star milestone announcement video

A milestone clip for an open-source repo, set up for Firecrawl at 180,598 stars.
The firecrawl/firecrawl lockup drops in at the top, a big orange star and a
counter tally up from zero over about four seconds, and the words "GitHub stars"
blur up beneath. Round contributor avatars float up from the bottom of the frame
the whole time, mostly along the sides, and the number blurs out near the end.
It is a single eight second scene with no audio.

Started from the [GitHub star milestone announcement video](https://genmotion.dev/templates/github-star-announcement) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 1 scene, about 8s |
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
| `components/` | `brand.ts` with the colours, font, star count and repo, and `avatars.ts` listing the avatar images |
| `assets/` | the flame logo and a `stargazers/` folder of 64 avatar photos |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-stars.tsx` (Star count): the repo lockup fades in, the star count rolls
   up while stargazer avatars drift upward in bubbles, the number punches as it
   lands, then everything blurs out.

## make it yours

- Change `STAR_COUNT` and `REPO` in `components/brand.ts` to your repo's number
  and name.
- Edit the `firecrawl/firecrawl` text in the lockup in `scenes/01-stars.tsx`,
  and replace `assets/firecrawl-flame.png` with your logo.
- Swap the photos in `assets/stargazers/` for your own contributors and keep
  `components/avatars.ts` in step.
- Recolour the star and background with the `brand` tokens in
  `components/brand.ts`.
- Change the "GitHub stars" caption to "stars" or a milestone line such as
  "thank you".

```
Make this announce 25,000 stars for my repo acme/widgets: update the count, the repo name, use the logo in assets/logo.png, and use an indigo accent.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Announcement video templates](https://genmotion.dev/templates/category/announcement)
- [Social media video templates](https://genmotion.dev/templates/category/social-media)
- [This template's page](https://genmotion.dev/templates/github-star-announcement)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
