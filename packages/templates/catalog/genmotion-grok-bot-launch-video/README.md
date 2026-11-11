# GenMotion x Grok Bot launch video

A black smiley bot drops onto a pale blue field and catches a green beret while
the headline builds to "Give your bot a studio", then "Its own timeline". A
phone rises with a chat thread open, "Make 10 sale ads" is typed into the
composer a character at a time, the bot hops onto the send button, and the
answer comes back as a card reading "10 videos ready" over a grid of ten ads.
The film then shows the same thing at volume on a desktop thread, lets a hand
cursor drag a stack of brand files into the chat so every ad comes back on
brand, and closes on a dark green field where the wordmark builds itself letter
by letter into "Connect GenMotion to Grok Bot". It is a launch video for a
chat agent integration: ask in the thread, get finished videos back.

Remixed from the [GenMotion x Grok Bot launch video](https://genmotion.dev/templates/genmotion-grok-bot-launch-video) template in the
[GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 4 scenes, about 26s |
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
| `components/` | shared pieces the scenes reuse: the bot rig, the brand tokens, a rounded rectangle mesh, word by word type, the chat and brand kit drawings, and the dark shader background |
| `assets/` | two hand cursor SVGs, a music bed, nine sound effects, a mouse click track, two typing tracks with the timing files that drive the caret, and one voiceover line |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |
| `CREDITS.md` | what to credit when you publish the video |

## the scenes

1. `01-intro.ts`, Give your bot a studio: the bot lands and catches its beret,
   the headline swaps through "Its own timeline" with a green play pill, and a
   phone rises where "Make 10 sale ads" is typed and sent, answering with ten
   rendered ad thumbnails.
2. `02-texting.ts`, Just ask in chat: the bot sends "All done! Here's your
   video:" with a video card under it, the customer replies, and the camera
   pushes in on a desktop thread where ten ads become twenty captioned
   vertical cuts.
3. `03-brand-assets.ts`, Drop in your brand: a hand cursor grabs a stack of
   brand files, drops them into the composer, types "Here are our brand
   assets", and the ads come back in that brand's colours under "Every video
   on brand".
4. `04-outro.ts`, Connect GenMotion to Grok Bot: the mark pops on a dark green
   field, the wordmark builds letter by letter, then shrinks and dissolves in
   place into the closing line.

## make it yours

- The headlines are plain strings in the `wordLine` calls at the top of each
  scene: "Give your a studio", "Its own timeline", "Makes your videos", "Just
  ask in chat", "Or ten at once", "Drop in your brand", "Every video on brand".
- The brand colours live in `components/brand.ts`, and the dark closing field
  is a shader in `components/darkbg.ts`.
- The chat copy is in the scene files: the prompt "Make 10 sale ads", the reply
  "All done! Here's your video:", the video card title "Spring sale is live"
  and the desktop thread about 9:16 cuts.
- The ten ad thumbnails and the dropped brand files are drawn in code, in
  `components/brandkit.ts`, so swapping the palette and the marks there
  rebrands every card at once with no new image files.
- If you change a typed line, regenerate its typing sound and paste the new
  timing table into the scene's `TYPED` constant, otherwise the key clicks
  drift away from the caret.

```text
Replace the bot with our own mascot, change the greens to our brand colours,
and make the prompt read "Make 10 ads for the autumn sale".
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/genmotion-grok-bot-launch-video)
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
