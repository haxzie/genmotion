# Gojiberry launch video

A B2B SaaS launch for Gojiberry, a tool that finds buyers who are already
showing intent. It opens on a cold LinkedIn message being typed and sent, then a
hundred reach-outs and a rude reply make the case that cold outreach fails. A
voiceover then carries the pitch: it detects high-intent people, shows a website
being analysed, targets leads, monitors buying signals, scores prospects,
launches campaigns, and ends on the wordmark with a "Try now" button being
clicked. Twenty-one scenes, about 71 seconds, with 13 voiceover lines and a
percussion music bed.

Started from the [Gojiberry launch video](https://genmotion.dev/templates/gojiberry-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 21 scenes, about 71s |
| Engine | React scenes |

## open it

Install [GenMotion](https://genmotion.dev/download), then from this folder:

```sh
genmotion .
```

That opens the project, plays it frame by frame, and gives your coding agent the
context to edit it. Export to MP4 from the editor.

## what's in here

| Path | |
| --- | --- |
| `scenes/` | one React component per scene |
| `components/` | browser window, LinkedIn-style cards, radar, table, cursor and text-typing pieces reused across scenes, plus brand tokens and embedded fonts |
| `assets/` | 13 voiceover clips, a music bed, one sound effect, the strawberry mark, six avatars, a profile banner, an office photo and a cursor icon |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

The 21 scenes fall into six beats, in `project.json` order.

1. The cold DM, `01-cold-dm.tsx` to `04-reply.tsx` (Cold DM, Sent, A hundred
   reach-outs, The reply): a LinkedIn composer, the cursor clicking Send, "After
   a hundred reach-outs today", then a notification opens a reply thread and
   "Let's be honest" types out.
2. The problem, `05-problem.tsx` to `08-volume.tsx` (Your problem, Building
   lists, Not interested, Volume): "Your problem isn't what you sell", "It's
   spending hours building lists", a pile of blunt replies such as "I couldn't
   care less.", and volume that does not fix it.
3. The turn, `09-change.tsx` to `11-engages.tsx` (Time to change, Detects,
   Engages): "It's time to change", radar rings with prospects popping up, and
   one prospect getting an invitation and a message step.
4. How it works, `12-website.tsx` to `15-intent.tsx` (Enter website, Target,
   Monitors, Intent signals): a URL typed into a website field, lead cards
   around the mark, an analytics panel with an AI Agent card, and signal cards
   for job changes, competitor interactions and meaningful engagement.
5. Act on it, `16-prioritize.tsx` to `20-autopilot.tsx` (Prioritize, Campaigns,
   Cold prospects, 3-5x more, Autopilot): a scored prospect table, outreach
   campaign step cards with an AI personalized message, "cold prospects" crossed
   out, floating "replies" and "demos" pills, and "autopilot".
6. The close, `21-outro.tsx` (Outro): "Reach buyers when they are ready", the
   strawberry mark and wordmark, and a "Try now" button the cursor clicks, held
   to the last frame.

## make it yours

- Rename the product: the wordmark is the `WORD` constant in
  `scenes/21-outro.tsx` and the mark is `assets/strawberry-mark.png`.
- Change the voiceover: each `assets/vo-*.mp3` is placed by frame in the `audio`
  list of `project.json`, so replace a clip and keep its start frame, or retime
  it.
- Rewrite the on-screen lines, such as "Your problem isn't what you sell", in
  the matching scene files.
- Swap the prospect names, titles and avatars in scenes 13 and 16 and the images
  in `assets/`.
- Recolour from `components/brand.ts`; the fonts are embedded in
  `components/fontData.ts`.

```
Rebrand this launch video for my product Lumen, a tool for finding sales leads: change the wordmark and mark, rewrite the on-screen lines to match, and keep the scene timing.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/gojiberry-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
