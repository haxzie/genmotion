# Another candidate animated short film

A 38 second animated short film about the job hunt, shot like a thriller. A
cursor clicks Apply across six job boards, each button the only sharp thing in a
dark, defocused screen, and the cuts accelerate until a counter in the letterbox
bar reads 247. A phone lying on a table wakes in the dark with an email from
Halcyon Labs Recruiting. An inbox opens it, the focus narrows to one sentence,
and the cursor drags a red selection across "we have decided to move forward
with another candidate." Then eight rejection emails flick past behind that same
locked line, the camera pulls back to reveal a wall of them, and the film cuts
to black and starts again at 248.

Started from the [Another candidate animated short film](https://genmotion.dev/templates/another-candidate-short-film) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1080x1080, 30 fps |
| Length | 4 scenes, about 38s |
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
| `components/` | shared pieces the scenes reuse: the stage and easing in `core.ts`, the letterbox, vignette, grain and camera locked type in `film.ts`, the page painter and focus lens in `page.ts`, every fictional job board and rejection email in `sites.ts`, and every timed event in `timeline.ts` |
| `assets/` | the Inter variable font, the Gmail mark for the phone notification, a 38 second score as an mp3, and 24 sound effects under `sfx/` |
| `project.json` | the timeline: scene order, durations, resolution, frame rate, and one audio clip per effect |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

Four scenes. Names are the ones in `project.json`.

1. `01-apply.ts` "Apply", 330 frames: six applications in a row, Easy Apply,
   Submit application, Apply now, Submit your application, Submit, Submit
   Application, each on a different fictional job board, the camera racking
   focus onto the button as the cursor arrives. Then 23 accelerating cuts while
   the counter runs to 247, one "Application sent", and the screen dies.
2. `02-notification.ts` "Notification", 105 frames: a real 3D phone, an extruded
   bevelled slab with a metal frame and black glass, lying on a table in the
   dark. Its screen wakes, a notification rises in, and the camera leans over it
   until the subject line can be read.
3. `03-inbox.ts` "The email", 280 frames: the inbox wakes, the cursor hesitates
   and opens the mail, a slow scroll and a slower push narrow the focus from the
   page to a paragraph to one line, and the I-beam drags a red selection across
   it word by word. A glitch shudders through the line on the cut out.
4. `04-montage.ts` "Montage", 422 frames: the red line never moves while the
   email underneath it changes, Gmail, Outlook, an ATS no reply, dark mode, each
   one saying the same thing differently, for 24 accelerating cuts. The camera
   pulls back into a 15 by 15 wall of identical red selections, then black, then
   a job page wakes and the cursor finds Easy Apply again.

## make it yours

- Rewrite the eight rejection lines in `MAILS` in `components/sites.ts`. The
  `punch` field of each is the sentence the selection sweeps across, so it is
  the line the whole film is built around.
- Change the applicant in `ME` at the top of `components/sites.ts`, and the
  inbox rows in `INBOX` just below it.
- Swap the accent: the selection red `#a3201c` lives in `HILITE` in
  `components/page.ts`, and the film's ink, muted grey and background are `INK`,
  `MUTED` and `BG` in `components/film.ts`.
- Retime any beat in `components/timeline.ts`, then move the matching audio clip
  in `project.json` so the score stays with the picture.
- Point the film at something other than job applications. The job boards in
  `components/sites.ts` are drawn with the `Kit` painter in `components/page.ts`,
  so a different screen is a different draw call, not a new engine.

Example prompt for your agent:

```
Keep the structure and the look, but make this about rejected pull requests
instead of job applications. Rewrite the eight lines in MAILS in
components/sites.ts, redraw the job boards as code review pages, and change
the counter label from APPLICATIONS SENT to PRS OPENED.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

Every employer in the film is fictional, and the job boards borrow the
aesthetic only, with no real logos.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Social media video templates](https://genmotion.dev/templates/category/social-media)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/another-candidate-short-film)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
