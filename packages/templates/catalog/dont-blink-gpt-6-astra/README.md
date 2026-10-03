# GPT-6 Astra AI model launch video

White words on black, one centred phrase at a time, cut on the beat. The film
opens "Your computer has a new user", counts down 3, 2, 1 in screen-filling
digits, and names the model. Four short chapters follow: it uses your computer,
it works for forty minutes unattended, it codes and builds in 3D from a photo,
and it does math and security work. It ends on "GPT-6 Astra", "Don't blink" and
the logo mark.

Started from the [GPT-6 Astra AI model launch video](https://genmotion.dev/templates/dont-blink-gpt-6-astra) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 6 scenes, about 20s |
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
| `scenes/` | one React component per scene, each a short script of text cards |
| `components/` | `kinetic.tsx`, the card player that holds each phrase and hard-cuts on a 10-frame beat |
| `assets/` | the blossom logo as SVG and a fast, rhythmic music track |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-ready.tsx` Ready?: "Your computer / has a new user.", then 3, 2 and 1 as
   screen-filling digits, then "Don't blink" and "Meet Astra."
2. `02-computer-use.tsx` Computer use: "It uses your computer. Clicks. Types.
   Scrolls. Any app. No API needed. Just a cursor."
3. `03-long-horizon.tsx` Long horizon: "Give it a task. Walk away. Forty minutes
   later: Done." then "It doesn't forget."
4. `04-builds.tsx` Builds: "It codes. It tests. It ships. It builds in 3D. From
   a photo. One shot."
5. `05-math-cyber.tsx` Math & cyber: "Math. Primes. Untouched since the 1930s.",
   then "It finds flaws nobody knew existed. OpenAI's rating:" and "Critical."
   filling the frame.
6. `06-astra.tsx` Astra: "1.9× faster", "Their most aligned", the model name,
   "Don't blink" once more, and the logo mark.

## make it yours

- Each scene is an array of cards: `t` is the text, `u` is how many 10-frame
  units it holds, and `size`, `invert` and `flash` change its look. Rewrite the
  arrays to rewrite the film.
- Keep the total units per scene equal to its length in `project.json` (160
  frames is 16 units), or retime the scene there.
- Replace `openai-blossom.svg` in `assets/` with your own mark; `06-astra.tsx`
  places it with `MarkCard`.
- Change the claims. The capability lines in scenes 2 to 5 describe one model;
  swap in your own product's features and numbers.
- Replace the music track and adjust its length in `project.json`.

Example prompt for your coding agent:

```
Rewrite this as a launch for a camera app called Lumen. Keep the 3, 2, 1
countdown, replace the four chapters with low light, video stabilisation,
RAW export and battery life, and end on the Lumen name.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/dont-blink-gpt-6-astra)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
