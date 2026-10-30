# Allo Grok Bot launch video

A 20 second launch film for an AI phone agent. A bot drops in and catches its
headset, the headline builds word by word to "Give your bot a phone", a handset
rises and a call comes in, and the bot hops into the Dynamic Island to forward
it. Then it texts a customer a quote, reads the reply, and hands back a callback
list on a desktop app. The last beat is the brand: the icon pops, the wordmark
builds letter by letter, and the lockup resolves into "Connect Allo to Grok Bot".

Remixed from the [Allo Grok Bot launch video](https://genmotion.dev/templates/allo-grok-bot-launch-video) template in the
[GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 3 scenes, about 20s |
| Engine | Three.js scenes |

## open it

Install [GenMotion](https://genmotion.dev/download), then from this folder:

```sh
genmotion .
```

That opens the project, plays it frame by frame, and gives your coding agent
the context to edit it. Export to MP4 from the editor.

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
| `components/` | the bot rig, the rounded rect primitive, text and word builders, canvas glyphs, the UI panels and the palette |
| `assets/` | the Allo app icon and the soundtrack |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-intro.ts`, "Give your bot a phone". The bot lands, catches a headset,
   and the headline swaps a word at a time into "Its own number" while a green
   pill counts out ten digits. A phone rises, a call arrives, the bot jumps
   into the Dynamic Island and forwards it, and the line settles on
   "Answers your calls".
2. `02-texting.ts`, "Text your customers". The camera pushes into a thread as
   the bot types "Hi Gonzalo! Here's your quote:", a project quote card slides
   in, and the customer replies "Thanks, that was fast!". The scene then irises
   to a desktop app under "Prepares your call-back list", where "14 missed
   calls today. Your callback list is ready." is answered with "Let's go, I'll
   call them now."
3. `03-outro.ts`, "Connect Allo to Grok Bot". On a dark field the app icon
   pops in, the wordmark assembles letter by letter, then the lockup shrinks
   and the bold "allo" dissolves in place into the closing line.

## make it yours

- The product name is in `scenes/03-outro.ts`: the wordmark string and the
  closing "Connect Allo to Grok Bot" line.
- Every colour lives in `components/brand.ts`, which is a single token object.
  The greens drive the pill, the phone screen and the call accept button.
- Swap `assets/allo-icon.png` for your own mark. It is drawn as a plane in the
  outro, so a square PNG under 512KB keeps it inlined in the bundle.
- The three headlines are built from `wordLine` in `scenes/01-intro.ts`. Keep
  them to two or three words so the per-word animation stays legible.
- The chat copy and the callback line are string literals in
  `scenes/02-texting.ts`.

```
Re-skin this for my product: change the brand colours in components/brand.ts
to my palette, swap assets/allo-icon.png for my logo, and rewrite the three
headlines and the chat copy for what my agent actually does.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/allo-grok-bot-launch-video)
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
