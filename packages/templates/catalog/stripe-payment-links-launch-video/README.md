# Stripe Payment Links launch video

A 30 second product launch film, shot in light mode. "Global payments are a"
builds word by word, the cut completes it with "a pain" printed on a pale grid
floor, and the camera tilts down as a red tile morphs into a blurple puck and
drops through a glass column. A link mark turns out of a coin into "Payment
Links", a streak carries "No code" into a circuit board that spells "Global", a
phone runs checkout and payment-success screens, and a dashboard builds a
payment link. A wheel turns through Products, Recurring and Donations, the coin
returns under "Powered by Stripe", and the end card lands on "Create a link.
Sell anywhere."

Remixed from the [Stripe Payment Links launch video](https://genmotion.dev/templates/stripe-payment-links-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 11 scenes, about 30s |
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
| `components/` | the palette and wordmark, the glass column, the link and infinity marks, the phone in two lightings, blur and glow effects, measured type, UI panels, and the stage |
| `assets/` | two web fonts and the score |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `CREDITS.md` | the music and trademark notes |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-intro.ts` Global payments are a: a faint grid and a horizon glow, the
   line building one word at a time.
2. `02-pain.ts` A pain to puck: "a pain" on a grid floor seen from above, the
   camera tilting to the horizon, a red tile morphing into a blurple puck.
3. `03-coin.ts` Coin in the column: inside the glass column as the link coin
   lands.
4. `04-meet.ts` Meet Payment Links: the mark turns out of the coin's edge-on
   pose into the lockup, then whips into a streak.
5. `05-fast.ts` No code: the streak cools from white to violet and accelerates
   right.
6. `06-circuit.ts` Global: one circuit board and one slow camera, the streak
   running the input trace.
7. `07-phone.ts` Checkout in seconds: the phone rises with the checkout screen,
   then payment success, under "Get Paid Anywhere".
8. `08-business.ts` Built for every business: a dashboard window settles in and
   builds a payment link, with tax and shipping options.
9. `09-wheel.ts` Products, Recurring, Donations: a mark on a dark disc ringed by
   three glassy segments, each with its own glow.
10. `10-coin-stablecoins.ts` Powered by Stripe: the column returns, the coin
    flips in edge-on, and the wordmark rises.
11. `12-endcard.ts` End card: the app icon glides left, "Payment Links" and
    "Create a link. Sell anywhere." resolve, and the CTA lands.

## make it yours

- The spine of the film is five lines: the opener in `01-intro.ts` and
  `02-pain.ts`, the product name in `04-meet.ts`, the three benefit beats in
  `05-fast.ts`, `06-circuit.ts` and `07-phone.ts`, and the end card in
  `12-endcard.ts`.
- Retune the palette in `components/brand.ts`, which also holds the wordmark as
  path data. Replace that function with your own mark.
- Swap the link mark itself in `components/linkmark.ts`. It is the object the
  coin, the lockup and the app icon all reuse, so one change carries through.
- Rewrite the three wheel segments in `09-wheel.ts` for your own use cases, and
  the dashboard copy in `08-business.ts`.
- Replace `assets/music-atlas-edit.m4a` with your own track and set its length
  in `project.json`. The cut grid is built around 161.5 BPM, so a track at a
  different tempo will want the scene durations adjusted.

Example prompt for your coding agent:

```
Re-skin this for a payouts product called Current. Open on "Paying contractors
is a pain", make the mark a banknote rather than a chain link, change the wheel
to Invoices, Payroll and Bonuses, and end on "Current. Pay anyone, anywhere."
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## credits

The music is "Background Music" by AtlasAudio, supplied with the original
project. Check the source licence for attribution requirements before you
publish a version of this video. See `CREDITS.md`.

The Stripe name, wordmark and brand are trademarks of Stripe, Inc. This
template is an unaffiliated motion-design exercise. The product copy, the
checkout and dashboard screens and the use cases on the wheel are illustrative.
Re-skin it for your own product rather than shipping it as is.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/stripe-payment-links-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
