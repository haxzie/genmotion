# Notion launch video

A close-up of a macOS dock in liquid glass, with the Notion icon fixed dead
centre. Every 13 frames the wallpaper and the six app icons around it hard-cut
to a new set, twelve in all: AI assistants, design tools, terminals, chat apps,
browsers and more. Then a cursor glides in and clicks Notion, it bounces out of
the dock, the desktop flashes to white, and two lines slide through: "Any
workspace." and "One way to do it".

Started from the [Notion launch video](https://genmotion.dev/templates/notion-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 2 scenes, about 12.5s |
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
| `components/` | `assets.ts`, which maps app names and wallpaper names to the files in `assets/` |
| `assets/` | 73 app icons in `app-icons/` and 12 wallpaper photos in `wallpapers/`; there is no audio |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-notion-dock.tsx`, Notion dock: the dock builds centre out, the desktop
   and six surrounding icons cut every 13 frames through twelve sets, then the
   cursor clicks Notion, it bounces, and everything else flashes to white.
2. `02-any-workspace.tsx`, Any workspace: the Notion mark on white slides out to
   the left and the two lines slide through right to left.

## make it yours

- Edit the `SETS` array in `scenes/01-notion-dock.tsx`: each entry is a
  wallpaper and six app names, so you can retheme the twelve workflows.
- Add icons to `assets/app-icons/` and register them in `components/assets.ts`.
- Change the two lines in `scenes/02-any-workspace.tsx`.
- Replace the centre icon with your own app, since scene 2 imports its size from
  scene 1 to keep the cut invisible.
- Add a track and place it in the `audio` list in `project.json`, since the
  template has none.

Example prompt for your agent:

```
Rebuild this for my note-taking app. Put my icon in the centre of the dock,
change the twelve sets to a writer's workflow (editors, research tools,
calendars), and change the closing lines to "Write anywhere." and
"One place to keep it".
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/notion-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
