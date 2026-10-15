# Fomo crypto app launch video

A 33-second Three.js launch film for a crypto trading app. It opens on a coin
with eyes spinning into a frosted search pill while "search" types in a letter
a frame, cuts to "easier" focusing in on white beside a swooping feather, then
flips the coin flat into a train of token coins riding one circle through
black. From there the film is a phone: the tab row "All Tokens Traders Clans"
scrolls in, the camera glides up a token list, a trader leaderboard and a clan
page, and the line "try smarter search on fomo" resolves into the wordmark.

Started from the [Fomo crypto app launch video](https://genmotion.dev/templates/fomo-crypto-app-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1280x720, 30 fps |
| Length | 8 scenes, about 33s |
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
| `components/` | shared pieces: `brand.ts` (palette and type), `logo.ts` and `wordmark.ts` (the coin and the logotype built in geometry), `phone.ts` (the phone shell and the canvas painters its screen is drawn with), `train.ts` (the coin wheel), `tokens.ts`, and the backdrop, text, shape and keyframe helpers every scene animates with |
| `assets/` | the Aeonik woff2 faces, the feather, a soundtrack, and `ui/` holding the token, trader and clan artwork the phone screens paint |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-search.ts` Search just got: the coin spins in at centre, a frosted pill
   grows around it as it slides left and "search" types in, then the coin
   sweeps up along an S-curve trailing a blue ribbon that uncovers "just got".
2. `02-easier.ts` Easier: on white, "easier" focuses from blur to sharp while a
   feather swoops up from the lower left, hangs beside the word, and drifts
   back down to become the coin.
3. `03-coin-flip.ts` Coin flip: the coin tips past edge-on, falls onto its face
   and swells to fill the frame over concentric sonar discs.
4. `04-coin-train.ts` Coin train: the coin flies off right and a train of token
   coins sweeps through on black, all of them riding one circle at their own
   depth under a shared phase.
5. `05-tokens.ts` Tokens and find others: the train carries on over the
   gradient, the tab row scrolls in word by word, the phone rises showing the
   token list with SOL, CASHCAT, ANSEM and UNI, then "search" resolves into "to
   find others" among avatars.
6. `06-traders.ts` Traders: a cursor taps Traders, five avatars fly into their
   rows, and the phone glides up the leaderboard with a Paste toast and a glass
   tab bar riding along before Clans rises into the row.
7. `07-clans.ts` Clans: three clan rows arrive as big frosted cards and shrink
   into the list, a purple glow sweeps the first one as it is tapped, the clan
   page pushes in from the right, and the phone rides up past the banner, PnL
   and chips to the member list.
8. `08-outro.ts` Try smarter search: "try smarter" rises and focuses in, a
   faint magnifier blinks into a white search pill, the line recentres as "on"
   and the wordmark arrive, then blurs away and cuts to the full fomo wordmark.

## make it yours

- The palette and the type live in `components/brand.ts`: `bgTop` and
  `bgBottom` are the gradient, `blue` is the coin face. Drop your own woff2
  faces into `assets/` and point `FONTS` at them.
- The headline is split across scenes 1, 2 and 8, so change it in all three:
  "search", "just got", "easier" and "try smarter search on fomo".
- `components/logo.ts` and `components/wordmark.ts` build the coin and the
  logotype in geometry, not from an image. Both are worth handing to your agent
  with your own mark rather than editing by hand.
- The phone screens are painted on a canvas by the `Painter` helpers in
  `components/phone.ts`. Token names, prices, trader handles, PnL figures and
  clan names are plain arrays at the top of scenes 5, 6 and 7.
- Avatars and clan art are ordinary files in `assets/ui/`. Keep the same names
  and sizes and nothing else needs touching.
- Swap `fomo-soundtrack.mp3` and set its length and fades in `project.json`.

Example prompt for your coding agent:

```
Rebrand this for a stock trading app called Tidal. Use #0b7d6b and #4fd8bf for
the gradient, put my logo from assets/ in place of the coin, and change the
headline to "charts just got clearer" and the outro to "trade smarter on
tidal". Replace the token rows with AAPL, NVDA, TSLA and MSFT.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/fomo-crypto-app-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
