---
title: Make your first video
seoTitle: "Make your first video with a coding agent"
description: "Brief your coding agent, pick the right skill, review frames and export an MP4. A step-by-step guide to your first AI-made video with GenMotion."
group: Guides
order: 2
keywords: [make a video with AI, AI launch video, Claude Code video tutorial, prompt for video generation, AI motion graphics]
updated: 2026-10-01
---

This guide takes you from an empty project to an exported MP4. It works the same in the Studio and from a terminal.

::: steps
### Describe the video

Tell the agent what the video is for, how long it is and where it will run. Leave out anything you don't care about; the agent asks only what it needs.

```text
A 20-second launch video for Moonlight, our notes app. 16:9 for the website
hero, dark and confident. End on the logo and "Available today".
```

Attach what you have: a logo, screenshots, a screen recording, brand colors. The agent saves them into `assets/`.

### Let the agent pick a skill

The agent searches GenMotion's skills for the one that owns this kind of video (here, `launch-playbook`), asks any missing questions, and writes the brief and the choice to `VIDEO.md`. The next session reads that file and picks up where this one left off.

### Watch it build

Open the preview: `npm run dev`, or the Studio's preview panel. Scenes appear as the agent writes them, and the preview reloads at the frame you were on.

### Give notes on frames

Be specific about time and place:

- "At 0:04 the headline is too small on a phone."
- "Make the logo land one beat later."
- "Swap scenes 2 and 3."

The agent runs `genmotion check` and looks at stills after each change, so a broken or blank scene is caught before you see it.

### Export

```sh
npm run render
```

Or press Export in the Studio. The file lands in `exports/`. Need a different format or size? See [Rendering](/docs/rendering).
:::

## Tips for a better result

- **One message, one goal.** A focused note gets a focused change.
- **Name the destination.** "Instagram Reel" implies 9:16, captions and a strong first second; "website hero" implies a loop.
- **Give real copy.** Headlines, product names and numbers you provide beat placeholders the agent invents.
- **Start from a template** when one is close: `npx @genmotion/cli init my-video --template <id>`, or Remix in the Studio. The agent edits a finished video instead of starting from zero.
