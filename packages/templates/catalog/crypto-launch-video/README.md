# Crypto launch video

A 35-second Three.js film for a crypto referral program, played straight as a
parody. As shipped, the referral link is a "losses.trade" URL, and the button
that copies it reads "Panic sell". The link fans out to Telegram, X and Discord
under the line "TELL NO ONE", a red balance ticks downward, and a referral tree
of "Paper hands" and "Bagholder" hangs off a pill labelled "You". The camera
then glides over a tilted dashboard and the film ends on the word "losses" typed
beside a mark.

Started from the [Crypto launch video](https://genmotion.dev/templates/crypto-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 6 scenes, about 35s |
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
| `components/` | shared pieces: `copy.ts` (all on-screen words), `brand.ts` (palette), and the dashboard, network, backdrop, camera rig and effects builders |
| `assets/` | the outro mark, Telegram, X and Discord icons, and a soundtrack |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-link.ts` Link: a URL bar with a lock and a REGRETS heads-up display. The
   lock opens, the code types in, "Panic sell" is clicked and flies off as a
   capsule.
2. `02-share.ts` Share: the capsule collapses into an orb, spokes reach
   Telegram, X and Discord, packets flow back, and the camera tilts into 3D as a
   loss counter ticks down.
3. `03-tree.ts` Tree: the "You" pill draws on, "Paper hands" and "Bagholder"
   hang beneath it, commission packets run back up, and the camera punches into
   the number.
4. `04-bound.ts` Bound: the two tiers multiply into a scrolling wall, then
   compress into one block with a padlock and "Haunts you for life".
5. `05-dashboard.ts` Dashboard: the card swings up from the dark, the view
   glides down it tilted while the numbers count, then cuts to flat close-ups of
   the rewards panel and a table stamping its type badges.
6. `06-outro.ts` Outro: a dark mark ignites inside a flickering pixel frame,
   "losses" types on with a block caret, and the URL types beneath.

## make it yours

- All words live in `components/copy.ts`. `ORIGINAL` is a straight referral
  launch for gains.trade and `INVERTED` is the parody. Set `ACTIVE` to either
  one, or write your own object of the same shape.
- Put your product's name, rates and fake wallet rows into the copy object; the
  dashboard table and the outro read from it.
- Recolour the film in `components/brand.ts`: yellow is the main accent and red
  marks every number going the wrong way.
- Replace `gains-mark-loss.png` in `assets/` with your logo for the outro.
- Swap `soundtrack.mp3` and set its length and fade in `project.json`.

Example prompt for your coding agent:

```
Switch this to the straight version for a referral program called Orbit.
Use the ORIGINAL copy shape with Orbit's name and orbit.xyz in the URL,
turn the red loss counters green, and use my logo in the outro.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/crypto-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
