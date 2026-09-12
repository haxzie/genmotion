---
title: "GenMotion now builds HyperFrames videos. No CLI, no toolchain, just a prompt."
description: "Every new GenMotion project is now a HyperFrames composition. Describe the video, watch it take shape in the studio, and export the MP4 from your own machine. The HyperFrames skills, compiler and linter are built in."
date: "2026-09-12"
updated: "2026-09-12"
author: "The GenMotion Team"
tags: ["announcements", "product", "hyperframes"]
faqs:
  - q: "What is the HyperFrames engine in GenMotion?"
    a: "It is a second way for GenMotion to make a video. Instead of React scenes on GenMotion's own motion runtime, the agent writes a HyperFrames composition. That is an HTML document with timing attributes and a GSAP timeline. GenMotion compiles it, previews it and exports it. It is the default for new projects as of desktop 0.0.9. Existing projects keep working exactly as before."
  - q: "Do I need to install HyperFrames or its CLI?"
    a: "No. GenMotion ships the HyperFrames compiler, linter and runtime, plus the full set of HyperFrames authoring skills for the agent. When you create a project, it also installs the newest HyperFrames release into that project's folder in the background. Each project pins the version it was made with. There is nothing to run and nothing to configure."
  - q: "Is the project a real HyperFrames project?"
    a: "Yes. The folder is a standard HyperFrames layout: index.html, scenes/, assets/, hyperframes.json and a package.json with @hyperframes/core installed. GenMotion adds an AGENTS.md and its own project.json alongside. There is no lock-in. It is HTML, CSS and GSAP in a folder you own."
  - q: "Which engine should I pick?"
    a: "HyperFrames for most videos. It is the default, the agent has the most guidance for it, and the output is portable HTML. The GenMotion engine (React scenes) is still in the picker for projects that want a component-based codebase or already use it."
  - q: "Does the export match the preview?"
    a: "Yes. The export drives the same compiled page the preview shows. It seeks frame by frame in an offscreen window and captures each frame into ffmpeg on your machine. Audio elements are mixed in, including volume fades animated on the timeline."
  - q: "Which AI agent writes the video?"
    a: "Your own Claude Code or Codex CLI, signed in with your own credentials, the same as before. GenMotion hands it the HyperFrames skill pack and a small set of tools: validate the composition, look at a frame, save an asset. That is how it checks its own work."
---

HyperFrames is a good way to make video. You write an HTML document. You give elements a start and a duration. You animate them with GSAP. A renderer turns it into an MP4, with the same frames every time. It is open source under Apache 2.0, and there is nothing to pay per render.

We [compared it to the alternatives](/blog/hyperframes-alternatives) a couple of weeks ago. We said the honest thing: it is a framework, not an app, and most people would rather have the app.

So we built the app around it. As of GenMotion desktop 0.0.9, every new project is a HyperFrames composition.

## What you actually do

The same thing you did before. Open GenMotion, describe the video, press enter.

The agent writes the composition. `index.html` is the timeline, and each scene is its own HTML file under `scenes/`. The preview updates the moment a file is saved. You scrub it and play it. You click a scene chip to talk about that scene. You drop a logo or a clip into the chat. You ask for changes in plain language. When it looks right, you press Export, and an MP4 lands in the project folder.

You never open a terminal. You never run `npx hyperframes` anything.

## What GenMotion does for you

**It carries the whole toolchain.** The HyperFrames compiler, linter and runtime ship inside the app. When you create a project, GenMotion also installs the newest `@hyperframes/core` into that project's folder in the background. You see a short setup screen while it lands. Each project pins the exact version it was made with, so a new release upstream never changes a video you finished last month.

**The agent knows HyperFrames properly.** GenMotion bundles the complete HyperFrames skill pack: the composition contract, animation blueprints, design guidance, audio and media. It hands the pack to the agent for every HyperFrames project. Where those skills say "run this CLI command", GenMotion gives the agent a tool instead. `validate_composition` runs the same lint and load check the editor does. `capture_frames` renders a frame, so the agent can look at what it wrote before telling you it is right. Lint findings show in the editor too, with a "Fix with AI" button.

**Preview and export agree.** The studio shows the compiled composition in a live frame wired to the transport. The playhead, the timeline and the picture are one clock. Export drives that same page frame by frame in an offscreen window on your machine and hands the frames to ffmpeg. No upload, no queue. Audio elements are mixed in. A fade you animate on the timeline, like `tl.to("#music", { volume: 0 })`, is in the file, not just the preview.

**It is your agent.** Nothing changed here. The chat is your own Claude Code or Codex CLI, on your own subscription. The prompt does not leave for a server we run.

**It is a plain folder.** `index.html`, `scenes/`, `assets/`, `hyperframes.json`, and a `package.json` with HyperFrames installed. Open it in your editor. Commit it. Hand it to someone who has never heard of GenMotion. It is HTML.

## The engine picker

Next to the model picker on the start screen, there is now an engine picker. Choose **HyperFrames** (the default) or **GenMotion**, our original React-based engine. Projects you already have open as whatever they were built with. The editor is the same for both: scenes on the timeline, audio underneath, code view on the right.

If you are not sure, leave it on HyperFrames. It is where the agent has the most guidance, and the output is the most portable.

## What's next

The timeline for HyperFrames projects is read-only in this release. You can scrub and select, but reordering and retiming go through the agent for now. Writing those edits back into the HTML is the next thing we are doing. The HyperFrames component registry (`hyperframes add`) is not wired up yet either. The agent writes effects by hand from the blueprints in the meantime.

[Download GenMotion](/download) for macOS on Apple silicon. If you already have it, the update is waiting in the app.
