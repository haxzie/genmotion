# X Numbers launch video

A feature announcement for X Numbers that runs at 60 fps. Dashed orbit rings
draw on with small app icons riding them while "Introducing" types out and turns
into "X Numbers". The rings collapse into a grid of dots and a number card whose
digits roll into place. A phone then shows a chat list and a menu that gains a
"Number" row, and lifts out a "Your X Number" sheet. The video cuts to a dark
direct message with Benji Taylor and an "Enter X Number" keypad, and a "Love
your work" bubble. It closes on the X mark inside a planet with orbits, then the
X alone, then a diagonal wipe.

Started from the [X Numbers launch video](https://genmotion.dev/templates/x-numbers-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 60 fps |
| Length | 5 scenes, about 31s |
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
| `scenes/` | one module per scene, drawing into a Three.js canvas |
| `components/` | shared pieces the scenes reuse: `film.ts` holds the whole film as one function of time, with `phone.ts` for the phone screens and `draw.ts` and `core.ts` for drawing helpers |
| `assets/` | the Inter variable font, six avatar images for the chat list and the direct message, and the soundtrack |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

The five scene files are short windows onto one continuous timeline in
`components/film.ts`, so the cuts between them are seamless. Timings below are
film time.

1. `01-intro.ts`, Intro (0s to 4.5s): orbit rings with riding icons, and
   "Introducing" turning into "X Numbers".
2. `02-number.ts`, Number (4.5s to 8.5s): the rings become dots and a card, then
   the number digits roll into place.
3. `03-menu.ts`, Menu & sheet (8.5s to 15.4s): a light phone shows a chat list
   and a menu with a new "Number" row, then lifts out the "Your X Number" sheet.
4. `04-dark.ts`, Enter number (15.4s to 27.1s): a circle burst opens a dark
   direct message with a keypad and an "Enter X Number" sheet.
5. `05-outro.ts`, Outro (27.1s to 31.25s): the X inside a planet with orbits,
   then the X alone and a diagonal wipe.

## make it yours

- Change the contact and chat list names, messages and times in the list at the
  top of the chat code in `components/phone.ts`.
- Replace the avatar images in `assets/avatars/` with your own people or brand
  marks.
- Change the "Introducing" line and the product name in the intro code in
  `components/film.ts`.
- Change the number that rolls into place and the "Love your work" bubble text.
- Swap `assets/soundtrack.mp3`, which runs the full length of the film.

Example prompt for your coding agent:

```
Rework this film as a launch for "Pulse Lines", a second phone line feature
in a chat app. Change the title text, the chat list names, the avatar
images and the closing mark, and keep the 60 fps timing.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Announcement video templates](https://genmotion.dev/templates/category/announcement)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/x-numbers-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
