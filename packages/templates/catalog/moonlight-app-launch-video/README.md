# Moonlight app launch video

A square video for Moonlight, an assistant for people with a day job and a side
hustle. It opens on a phone inbox full of client messages with the boss pinned
at the top, then the Moonlight icon drops in and the phone rises with the
assistant pinned. "For a very active double life" is ringed by little pink
moons, then a cluster of client avatars shows who Moonlight keeps track of. It
drafts a polite refusal to the boss's Saturday request, untangles a calendar
clash, orbits Upwork, Fiverr and Uber tiles, and hands Dev's final build over
once the boss logs off. The end card reads "The most personal moonlighting
assistant yet".

Started from the [Moonlight app launch video](https://genmotion.dev/templates/moonlight-app-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1080x1080, 30 fps |
| Length | 9 scenes, about 32s |
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
| `components/` | shared helpers: `kit.ts` for text and drawing, `ui.ts` for the iOS-style pieces, `fx.ts` for the chat phone, bubbles and cursor, and `people.ts` for the avatars |
| `assets/` | six contact avatars, Upwork, Fiverr and Uber logos, eight voiceover clips, a music bed, and whoosh and click sounds |
| `project.json` | the timeline: scene order, durations, resolution, frame rate, and the audio cues |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. Inbox (`01-inbox.ts`): the message list scrolls, with the boss pinned and a
   "Need you Saturday" note.
2. Meet Moonlight (`02-meet.ts`): the app icon and name appear, then the phone
   rises under "Your personal assistant".
3. Double life (`03-double-life.ts`): "For a very active double life" with pink
   moons popping around it.
4. Clients (`04-clients.ts`): a blob of client avatars, then the boss, Priya and
   Dev with a quirk each.
5. Say no to the boss (`05-boss-chat.ts`): the boss asks for Saturday, Moonlight
   suggests a decline, and a cursor presses Send.
6. Calendar (`06-calendar.ts`): a day-job standup and a DJ set clash, and the
   cursor drags the gig into its own slot.
7. Gig apps (`07-apps.ts`): calendar, Upwork, Fiverr and Uber tiles orbit in
   depth.
8. After hours (`08-after-hours.ts`): Moonlight books Priya's logo job for 9pm
   and offers to send Dev the final build.
9. End card (`09-end-card.ts`): the icon, the closing line, and a fade to black.

## make it yours

- Rename the product and change the closing line in `scenes/02-meet.ts` and
  `scenes/09-end-card.ts`.
- Edit the inbox rows in `scenes/01-inbox.ts` and the quirks in
  `scenes/04-clients.ts`.
- Change the chat bubbles in `scenes/05-boss-chat.ts` and
  `scenes/08-after-hours.ts`.
- Replace the contact avatars and the gig app logos in `assets/`.
- Regenerate the eight `vo-*.mp3` voiceover clips if you change the wording, and
  keep them at the same start frames in `project.json`.

Try this prompt with your coding agent:

```
Adapt this launch video to Tidewell, an assistant for freelance translators.
The pinned contact is a client who wants a rush job on Saturday, the assistant
drafts a polite "I'm booked", and the app tiles become three translation
marketplaces. Keep the pacing and update the end card to "The most reliable
translation assistant yet".
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [Social media video templates](https://genmotion.dev/templates/category/social-media)
- [This template's page](https://genmotion.dev/templates/moonlight-app-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
