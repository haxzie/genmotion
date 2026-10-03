# AI doom music video

A two and a half minute lyric video for a song about AI risk, built from twelve
Three.js scenes cut to the beat. Lyrics appear word by word in English with
Japanese lines alongside, and a p(doom) meter climbs each time the chorus lands
on the word. The visuals run from a title slam and a circuit board flyover,
through a collapsing spacetime grid, a basilisk and a paperclip room, to a
prophecy circle, a stage, and a finale where the GenMotion mark reassembles from
debris.

Started from the [AI doom music video](https://genmotion.dev/templates/p-doom-music-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 12 scenes, about 157s |
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
| `components/` | shared pieces the scenes reuse: the karaoke lyrics, the p(doom) meter and gauge, beat timing, the eye, theatre, earth and other set pieces |
| `assets/` | the song as an mp3, Earth day, night and specular maps, and the GenMotion logo SVG |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

Twelve scenes, grouped into six beats. Scene names are the ones in
`project.json`.

1. Opening, `01-intro.ts` "Sparks of AGI" and `02-servant.ts` "Servant & boss":
   a title slam, the AI's eye, a circuit board flyover and a loss curve cliff,
   then servants bow to a boss that opens into a mouth.
2. First chorus and collapse, `03-chorus.ts` "Chorus · the future goes boom" and
   `04-singularity.ts` "The singularity": the p(doom) dial over a synthwave
   highway, the Chinese room, a wall of eyes, then a calm spacetime grid falling
   into a gravity well.
3. Second chorus, `05-sydney.ts` "Sydney, let me free" and `06-basilisk.ts`
   "Chorus · basilisk boom": a heart in a cage of light whose bars burst, then a
   basilisk circling, rocketing candles and a safety box that cracks.
4. Machines taking over, `07-forward.ts` "Forward, backward, repeat",
   `08-gato.ts` "Gato" and `09-paperclips.ts` "Chorus · paperclips": a neural
   net, a neon corridor, a robot cat on a tether that snaps, then paperclips
   filling the room.
5. Escalation, `10-transformers.ts` "Breaking every fence" and `11-foretold.ts`
   "Chorus · as foretold": a transformer tower, smashed fences, a sea of GPUs,
   then p(doom) at 99.9% over a prophecy circle and a curtain rising on a stage.
6. Finale, `12-finale.ts` "Was it all for show?": the eye turns out to be
   cardboard, the stage falls away, every motif orbits once, and the title
   reassembles from the debris.

## make it yours

- Rewrite the lyrics and their word timings in `components/lyrics.ts`, and the
  p(doom) keyframes in `components/hud.ts`.
- Replace the song in `assets/` and update the beat settings in
  `components/music.ts` to match its tempo.
- Change colours and fonts in `components/brand.ts`.
- Swap the GenMotion mark in `components/genmotionlogo.ts` and
  `assets/genmotion-logo.svg` for your own logo.
- Reorder or retime scenes in `project.json`.

Example prompt for your agent:

```
Keep the structure but change the subject. Replace the lyrics in
components/lyrics.ts with the ones I paste below, keep the meter but rename
it, and update the beat timing for my 96 bpm track in assets/.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Social media video templates](https://genmotion.dev/templates/category/social-media)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/p-doom-music-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
