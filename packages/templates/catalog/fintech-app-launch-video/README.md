# Fintech app launch video

A payments app launch for a made-up brand called LightPay. Black type on white
says "Sending money is now instant" while glossy coins tumble in, then a lime
flood turns into a Deposit button that a cursor taps, a phone rises with the
balance rolling up and coins bursting out of it, a "2% cashback" prize burst
follows, a LightScore gauge rolls to 812 and a credit line unlocks, and a 3D
LightPay mark closes on "Money at the speed of light." The audio is a music bed
with whoosh, click, coin and impact effects timed to the cuts.

Started from the [Fintech app launch video](https://genmotion.dev/templates/fintech-app-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 5 scenes, about 20s |
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
| `components/` | shared brand tokens, text, motion and 3D prop helpers (coins, phone) the scenes reuse |
| `assets/` | a music bed plus whoosh, click, coins and impact sound effects, placed on the timeline in `project.json` |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-hook.ts` (Hook): "Sending money", "is now" and "instant" in blue arrive
   one phrase at a time, coins tumble in and spiral toward the centre, and a
   lime flood fills the frame.
2. `02-deposit.ts` (Deposit): the flood shrinks into a Deposit pill, a cursor
   taps it, the pill lands in a phone's home screen, the balance rolls up, a
   +$1,250 toast appears and coins burst out of the top.
3. `03-cashback.ts` (Cashback): lime rays open behind the hero coin, notes,
   coins and sparkles blast outward, and "2% cashback" slams in with "On every
   tap. Paid out instantly." beneath.
4. `04-score.ts` (LightScore): the rays collapse into a gauge, the score rolls
   to 812 with an Excellent badge and four factor cards, then a "Credit line"
   card unlocks "$500 unlocked" and floods lime.
5. `05-outro.ts` (Outro): a glossy 3D mark drops in, the LightPay wordmark
   slides out beside it, then the tagline and URL hold to the end.

## make it yours

- Rename the brand: the name, tagline and URL come from `components/brand.ts`
  and the text in `scenes/05-outro.ts`.
- Change the palette: the lime, blue, ink and paper colours live in
  `components/brand.ts`.
- Change the numbers: the 812 score, the "2% cashback" line, the +$1,250 toast
  and the "$500 unlocked" credit line are plain strings and values in scenes 02
  to 04.
- Swap or retime the sound effects in the `audio` list of `project.json`; the
  clicks and impacts are placed on specific frames.
- Change the coin glyphs ($, euro, pound, yen, bolt) in the coin lists of scenes
  01 and 02.

```
Rebrand this video for my app Orbit: swap LightPay for Orbit, use a violet accent instead of lime, change the cashback to 5%, and roll the score to 790.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/fintech-app-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
