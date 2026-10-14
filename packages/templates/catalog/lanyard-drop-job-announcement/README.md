# Lanyard drop job announcement video

A 16 second single shot of a conference badge, for announcing a new job, a
speaking slot or a hire. The badge falls in from above on a printed lanyard,
snaps taut at the clip and bounces, rocking on its hook while the strap swings.
The card front carries a logo lockup, a grayscale portrait, a name, a role line
and a handle, with pixel icon tiles down the sides and a full row of them along
the bottom edge. Halfway through, the whole assembly turns a full circle so the
back passes through shot, then settles while the camera pushes in and the badge
is yanked back up out of frame.

Nothing here is footage or a mockup render. The card faces, the woven strap, the
split ring and the swivel clip are all built and drawn in Three.js at render
time, which is why the name on the badge is a string you can edit.

Started from the [Lanyard drop job announcement video](https://genmotion.dev/templates/lanyard-drop-job-announcement) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1080x1080, 30 fps |
| Length | 1 scene, about 16s |
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
| `scenes/` | one module, `01-lanyard-drop.ts`: the rig, both card faces, the lights and the whole 480 frame animation |
| `components/` | `brand.ts` holds the palette, the logo path, the dotted grid and the pixel icon tiles the card is drawn from. `rng.ts` is the seeded random the strap weave uses |
| `assets/` | one portrait photo, drawn into the card front in grayscale |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

One scene, 480 frames. The name is the one in `project.json`.

1. `01-lanyard-drop.ts` "Lanyard drop": the badge hangs from a pivot twelve
   units above the frame, so the strap behaves like a real pendulum rather than
   a short swinging stick. It drops in over the first 14 frames, bounces on a
   damped sine, and keeps a slow breathing sway that never fully stops. Between
   frames 200 and 262 the badge turns a full circle; the strap carries that
   twist through its own vertices with a cubed falloff towards the clip, so the
   printed text spirals up it instead of shearing. The camera pushes in from
   frame 120 to frame 400, and the yank out runs from frame 458.

## make it yours

- The name, role and handle are three `text()` calls near the middle of the
  scene file: `"Musthaq Ahamad"`, `"AI & PRODUCT ENGINEER"`, `"@haxzie"`.
- Swap `assets/haxzie-avatar.png` for your own photo. It is clipped to a rounded
  panel and desaturated by a canvas filter, so almost any crop works.
- `components/brand.ts` holds the whole look: the palette in `C`, the logo in
  `MARK`, the font stack, and the pixel icons as rows of `#` and `.` strings.
  Change those and both card faces follow.
- The strap print is one string in `strapTexture()`: `const unit =
  "GENMOTION  •  "`. It tiles itself to fit, so a longer or shorter phrase
  still lines up.
- Retiming is six constants at the top of the file: `FALL_END`, `SPIN_IN`,
  `SPIN_OUT`, `PUSH_IN`, `PUSH_OUT`, `YANK_IN`. The camera framing is solved
  from the canvas aspect, so changing `width` and `height` in `project.json` to
  1080x1920 reframes the shot for a vertical feed without any other edit.

Paste something like this to your coding agent:

```
Make this my new job announcement: name "Priya Nair", role "SENIOR DESIGN
ENGINEER", handle "@priyanair", and use assets/priya.png as the photo. Swap the
palette in components/brand.ts to amber and charcoal, change the strap print to
"ACME  •  ", and make it 1080x1920.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Social media video templates](https://genmotion.dev/templates/category/social-media)
- [Announcement video templates](https://genmotion.dev/templates/category/announcement)
- [This template's page](https://genmotion.dev/templates/lanyard-drop-job-announcement)
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
