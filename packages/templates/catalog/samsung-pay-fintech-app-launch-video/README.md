# Samsung Pay - Fintech app launch video

White type lands on black smoke: "The tap", "your customers", "already know by
heart". Payment tiles then rush in and settle into a ring around the line "Now
live in your checkout". A phone rises through the headline and walks a shopper
from product page to bag to payment options, then opens a pay sheet that
verifies with a fingerprint. A coin spins while the payment confirms, a green
receipt appears, and a short "fast, safe, simple" beat leads into the closing
call to action and a GenMotion and Samsung Pay lockup. It is a launch film for a
one-tap payments brand.

Started from the [Samsung Pay - Fintech app launch video](https://genmotion.dev/templates/samsung-pay-fintech-app-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 10 scenes, about 33s |
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
| `components/` | shared pieces the scenes reuse: brand colours and marks, the 3D phone and its screens, payment tiles, text and the stage |
| `assets/` | the Samsung Pay and GenMotion logos as SVG, a background track, and four short sound effects (logo hit, pop, tap, success chime) |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-hook-type.ts`, Hook type: the hook line types in word by word on black
   smoke, then cuts to black.
2. `02-icon-orbit.ts`, Icon orbit: tiles fly in from behind the camera into a
   slow ring around "Now live in your checkout".
3. `03-icon-column.ts`, Icon column: large tiles race up past the lens around
   the caption "wherever India shops" and land on a held frame.
4. `04-introducing.ts`, Introducing: "Introducing", then the Samsung Pay badge
   and "on GenMotion", which rushes the lens into white.
5. `05-phone-flow.ts`, Phone flow: "Built for every storefront and every
   screen", then a phone runs the shop, bag and payment options flow and ends on
   "One tap".
6. `06-secure-sheet.ts`, Secure sheet: on a dark violet floor, "Checkout in one
   tap" becomes "Verified on your device" beside a fingerprint.
7. `07-confirm-success.ts`, Confirm to success: a spinning coin and swoosh, then
   a green receipt, then the phone lifts out on a green glow.
8. `08-now-on.ts`, Now on: the Samsung Pay badge, "now on", and a GenMotion
   Checkout lockup, exiting into a white wipe.
9. `09-fast-safe-simple.ts`, Fast safe simple: the three words are built letter
   by letter on white.
10. `10-cta-lockups.ts`, CTA and lockups: "Bring one-tap pay to your checkout
    today", then the GenMotion and Samsung Pay lockup holds until a hard cut to
    black.

## make it yours

- Change the headline copy in the scene files, for example "wherever India
  shops" in `03-icon-column.ts` and the call to action in `10-cta-lockups.ts`.
- Edit the palette in `components/brand.ts`, including the violet and royal blue
  accents.
- Replace `assets/samsung-pay.svg` and the mark paths in `components/brand.ts`
  with your own brand.
- Change what the phone shows: the product, checkout, payment options and
  receipt screens live in `components/phone.ts`.
- Swap `assets/bgm-pop-launch.mp3` and retime the sound effects in
  `project.json`.

Example prompt for your coding agent:

```
Rebrand this launch film for "Paylane", a fintech wallet. Replace the logo
and brand colours, change the receipt currency to dollars, rewrite
"wherever India shops" to "wherever you shop", and update the closing
lockup and call to action.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/samsung-pay-fintech-app-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
