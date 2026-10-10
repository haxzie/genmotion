---
title: "Claude Motion: What It Is and How to Make Videos With It (2026)"
description: "Anthropic shipped Claude Motion in beta on 8 October 2026: type /motion and Claude writes code that animates your text, charts and images into an MP4. Here is how to actually make a video with it, what it will not do, and what to use when you need more than thirty seconds."
date: "2026-10-10"
updated: "2026-10-10"
author: "The GenMotion Team"
tags: ["guides", "comparisons"]
faqs:
  - q: "What is Claude Motion?"
    a: "Claude Motion is an artifact type inside Claude that turns your text, charts, shapes and images into a short animation you can export as an MP4. It is not a video generation model. Claude writes code that animates the elements, which is why every word, number and timing value stays editable afterwards. Anthropic put it into beta on 8 October 2026, alongside Claude Dashboards."
  - q: "How do I use Claude Motion?"
    a: "Type /motion in Claude's message box and describe the video, or pick Motion under the Output selector, or start from a Motion template in the Artifacts tab. Attach the source material you want animated, say who it is for and roughly how long it should run, then refine the first pass by asking for changes in chat or by editing the animation directly. Export is an MP4 download."
  - q: "Which Claude plans include Motion?"
    a: "Team and Enterprise only, as of 10 October 2026. It is on by default for Team seats and off by default on Enterprise until an owner enables it in Organization settings under Artifacts. Free, Pro and Max do not have it, so an individual subscriber cannot use Motion without joining a Team workspace. Team seats are $25 per member per month billed monthly, or $20 billed annually, with a two member minimum."
  - q: "Does Claude Motion generate footage or AI people?"
    a: "No, and that is deliberate. In Anthropic's words, it does not use a video generation model, so there is no generated footage and no AI-generated people. What you get is motion graphics: typography, charts, shapes and the images you supplied, animated by code."
  - q: "How long can a Claude Motion video be?"
    a: "Anthropic has not published a maximum duration, resolution or frame rate for the beta. The examples it gives are short-form, in the region of thirty seconds: a quarterly report explainer, an animated chart for a board deck, a product walkthrough. Animations also draw on your plan's normal usage limits, and longer or more complex ones consume more. Treat it as a tool for short units, not for a five minute narrated explainer."
  - q: "Can I export a Claude Motion video to After Effects or Premiere?"
    a: "You can export an MP4 and open your project in Adobe, Descript, HeyGen, Higgsfield, invideo, Luma AI or Runway, with Canva and Captions listed as coming soon. Be careful about what that promises: an integration listing is not the same thing as a layered After Effects project with editable keyframes and expressions, and Anthropic has not claimed it is."
  - q: "What are the alternatives to Claude Motion?"
    a: "If you are locked out by the plan requirement or you need more than a short clip, there are three honest paths. Drive a code video framework like Remotion or HyperFrames from Claude Code yourself, which gives you full control and a toolchain to maintain. Use a template-driven cloud tool if you need many variants of one layout. Or use a studio like GenMotion, which runs on your existing Claude Code or Codex subscription and adds a frame-precise timeline, generated voiceover and local MP4 rendering on top of agent-written scenes."
---

Anthropic put **Claude Motion** into beta on 8 October 2026, next to Claude Dashboards, and on the same day moved Docs, Slides and Design out of beta onto every plan including Free.

Motion is the interesting one, because it is Anthropic taking a position on how an AI should make video. It does not generate footage. It writes code.

In Anthropic's own words: "Claude writes code that animates your text, charts, shapes, and images, so you can change any word, number, or timing." And then, plainly: "It doesn't use a video generation model, so there's no generated footage and no AI-generated people."

This guide covers what it is, how to make a video with it step by step, where it stops, and what to reach for when it does. Facts checked on 10 October 2026.

## TL;DR

| | What it is | Who gets it | Best at |
| --- | --- | --- | --- |
| **Claude Motion** | A code-written animation artifact inside Claude chat | Team and Enterprise, beta | Short explainers built from content you already have in the conversation |
| **Claude Code plus a framework** | Remotion or HyperFrames, driven by an agent you already pay for | Anyone with a terminal | Full control, if you want to own a toolchain |
| **GenMotion** | A desktop motion studio where an agent writes the scenes | Anyone on macOS with Apple silicon | Longer multi-scene videos, timeline edits, voiceover, local 4K export |

- Motion is **not** a text to video model. Nothing in the output is a frame of invented footage, which is why it can be edited precisely instead of regenerated and hoped over.
- It is **plan gated**: Team and Enterprise only. Pro and Max subscribers, including most solo founders and freelancers, cannot use it at all.
- It is aimed at **short, structured content**: a chart reveal, a pricing comparison, a setup sequence, a monthly recap.
- Anthropic has **not published** duration, resolution, frame rate, audio or transparent export specs for the beta. Assume short and assume silent until you have tested it yourself.

## What Claude Motion actually is

Claude Motion is an artifact type, in the same family as Docs, Slides, Design and Dashboards. You ask for an animation in chat, Claude writes a timed, code-driven composition from the material you gave it, and the result plays back inside the conversation like a short video. You can then change it by talking to it, or by editing it directly, and download an MP4.

The thing worth understanding is the deliberate absence. Every consumer AI video tool of the last two years has been a diffusion model that invents pixels, which is wonderful for a dreamy B-roll shot and useless for a chart where the number has to say 18%. Motion goes the other way: the animation is a program, your content is data inside it, and so a revision is a targeted edit rather than a new roll of the dice. Ask for "change the Q3 number to 18%" and the rest of the video is supposed to stay exactly as it was.

That is the same argument behind every serious programmatic video tool, and it is the right one. It is also why the failure modes are different from what people expect from AI video, as we will get to.

## Who can use it, and what it costs

As of 10 October 2026:

- **Free, Pro, Max:** no Motion.
- **Team, standard and premium seats:** included, on by default. Standard seats are $25 per member per month billed monthly, or $20 billed annually, with a minimum of two members. Premium seats are $125 monthly or $100 annually.
- **Enterprise:** included but **off by default**. An owner has to switch it on in Organization settings under Artifacts, and can scope access to specific groups with custom roles.

There is no separate charge per animation. Motion draws on your plan's existing usage limits, and Anthropic notes that longer or more complex animations use more of them.

Two practical consequences. First, the cheapest legitimate way for one person to touch Motion is a two seat Team plan at $40 to $50 a month, which is a strange entry price for a feature you are evaluating. Second, if you are an Enterprise user reading announcements and wondering why /motion does nothing, it is almost certainly the admin toggle rather than a rollout queue.

Beta also means beta. Anthropic's own beta labelling says not every feature graduates. Build habits on it, not compliance critical processes.

## How to make a video with Claude Motion, step by step

### 1. Open a Motion three ways

- Type `/motion` in the message box and describe what you want.
- Choose **Output** in the message box, then **Motion**.
- Go to the **Artifacts** tab and start from a Motion template.

The slash command is the one to learn. The template route is useful when you want to see the shapes the feature is good at before you have an idea of your own.

### 2. Give it your content, not a topic

This is the single biggest difference between a usable first pass and a generic one. Motion is built to animate material you already have, so attach it: the report, the spreadsheet, the chart, the screenshots, the brand image. A conversation that already contains your Q3 numbers or a Dashboard you just built is the ideal starting point, because the data is right there and the animation is being written against it.

"Make a video about our growth" gets you a plausible nothing. "Turn the attached quarterly report into a 30 second explainer" gets you your report, animated.

### 3. Say who it is for, where it will play, and how long

Anthropic's own prompting guidance is to specify audience, venue and target duration, and it matters more than it sounds. Those three facts decide type size, pacing and how much copy survives per scene. A clip for an all-hands on a projector and a clip embedded in a customer onboarding email are different videos even with identical content.

A brief that works looks roughly like this:

> /motion Turn the attached Q3 report into a 30 second explainer for an all-hands. Three beats: revenue up 18%, churn down, the two launches that drove it. Big numbers, minimal copy, our brand palette from the deck. Plays on a projector in a bright room.

### 4. Read the first pass critically, not gratefully

The known weakness of generated layout is not that it looks broken. It is that it looks plausible while having poor hierarchy, too much copy, or brand treatment that drifts between scenes. A first draft that saves twenty minutes and creates forty minutes of repair work has cost you money.

So review it as a director: is there one idea per scene, does the eye know where to go, is the number the biggest thing on screen when the number is the point, does anything sit on screen too briefly to read.

### 5. Revise by conversation

This is where the code-written approach earns its keep. Revisions are specific and local:

- "Slow down the second scene."
- "Change the Q3 number to 18%."
- "Drop the third bullet and give that time to the chart."
- "Use the brand blue from the attached logo for every accent."

Anthropic's docs list exactly this kind of instruction, and the editability claim is the one to stress-test first in your own evaluation: after a targeted change, is everything you did not mention still identical.

### 6. Edit directly when chat is the slow path

You can adjust the animation in the editor rather than asking, and you can get at the code. For a one word fix or a timing nudge, that is faster than a round trip through the model, and it is the escape hatch that makes the feature trustworthy: nothing is locked inside a generation you cannot reach.

### 7. Export, share, or hand off

Download is an MP4. Artifacts stay private until you open one and press Share. For finishing elsewhere, Anthropic lists opening your project in Adobe, Descript, HeyGen, Higgsfield, invideo, Luma AI or Runway, with Canva and Captions coming soon.

Read that list for what it is. It establishes that handoff paths exist. It does not establish a native After Effects project with editable layers, expressions and keyframes, and nobody has claimed it does. If your pipeline ends in a compositor, test the actual handoff before you promise anyone a workflow.

## Prompts that tend to work

Motion is strongest on structured content and repeatable layouts, so bias your prompts toward structure:

- "Animate how our three pricing plans compare, one plan at a time, ending on all three side by side."
- "Turn these five onboarding steps into a 20 second walkthrough, one step per beat."
- "Reveal this chart line by line, then hold on the final figure with a caption."
- "Take the monthly performance recap in this doc and make a 30 second recap with the three headline numbers."

And bias away from things that need acting: character work, lip sync, narrative sequences, anything with a performer in it. Those need rigging, continuity and expressive timing, and this beta is not that tool.

## Where Claude Motion is strong, and where it stops

**Pros**

- Content you already have in the conversation becomes a video without leaving it, which is a genuinely short path from analysis to artifact.
- Code-written animation means precise edits: a word, a number, a duration, not a re-roll.
- No generated footage and no synthetic people, which removes a whole category of brand and compliance risk.
- Direct editor and code access, so you are never stuck with a black box.
- No per-animation fee on top of the plan.
- Handoff routes into several video tools, plus a plain MP4.

**Cons**

- Team or Enterprise only, so most individual subscribers are locked out, and Enterprise needs an admin to turn it on.
- Short form by design: the published examples sit around thirty seconds, and Anthropic has not documented a maximum length.
- No published resolution, frame rate, audio, caption or transparent export specification in the beta.
- No voiceover story in the documentation, which matters because narration is what turns a motion graphic into an explainer.
- Chat is the workspace: there is no scene timeline to drag, so pacing is negotiated in sentences.
- Generated layout still needs a human to tell a usable draft from an approved asset.
- Beta, with the reliability and the no-guarantees that implies.

Nothing in that second list is a scandal. It is what a version one looks like, and the architectural choice underneath it is the right one.

## If you are locked out, or you need more than thirty seconds

Three honest options, in order of how much machinery you want to own.

**1. Drive a framework from Claude Code yourself.** Remotion and HyperFrames both turn code into deterministic MP4s, and an agent is good at writing them. You get total control, and you also get the toolchain: Node, FFmpeg, headless Chrome, a render pipeline, and in Remotion's case a licence once you are past three employees. We wrote up the trade-offs in [Remotion alternatives](/blog/remotion-alternatives) and [HyperFrames alternatives](/blog/hyperframes-alternatives), including what Remotion's licence actually costs.

**2. Use a template cloud API** if your real problem is a thousand variants of one layout. That is a different job from making one good video, and the tools built for it are in the same comparison posts.

**3. Use a studio.** Which is the thing we build, so here it is with its limits stated.

## GenMotion, and why we built it differently

**What it is:** a macOS desktop studio for motion video. You describe the video; an agent writes each scene as a real animated composition against a deterministic runtime; you refine it by talking to it **and** by dragging things on a timeline; you export an MP4 rendered locally on your own machine.

It runs on **your** Claude Code or Codex subscription. That is the part worth noticing in this context: if you already pay Anthropic for Claude Code, the model work is already bought, and there is no second seat price and no per-render fee between you and a finished video.

The three places it goes further than a chat artifact:

**A timeline that is an actual timeline.** [The timeline editor](/features/timeline-editor) lets you drag scene blocks to reorder them and grab an edge to retime a scene, in frames at the project's frame rate. Audio waveforms render under the scenes that have sound, so you can land a beat by eye. "The intro drags" is a drag, not a paragraph.

**Voiceover, and the timings to animate against.** [AI voiceover](/features/ai-voiceover) generates per-scene narration, extends scenes to fit it, and hands back per-sentence beat timings so motion can cue to the words. This is what separates a thirty second motion graphic from a two minute explainer that holds attention.

**Local, deterministic export.** The export runs on your machine off the same runtime as the preview, so the MP4 is [pixel-identical](/features/pixel-identical-export) to the frames you reviewed, at 1080p or 4K, with no queue and nothing uploaded. Projects are plain folders on disk, so they version in git and stay yours.

Also useful in the same shape as Motion's best trick: point the agent at a URL and [brand extraction](/features/brand-extraction) pulls the logo, palette and fonts so the first draft is already on brand.

**Pros**

- Built for the second, third and tenth version of a video, not the first.
- Frame-precise timeline with drag to reorder, trim and waveforms.
- Generates narration and the beat timings to sync motion to it.
- Local 1080p and 4K rendering, no queue, no per-render fee.
- Scenes are real code you can read and edit, on a deterministic runtime.
- Runs on the agent subscription you already have, with a seven day trial of the whole studio and no card.

**Cons**

- macOS on Apple silicon only today.
- Not a library and not an API: no npm package, no CI integration, no rendering per user from your backend.
- Needs your own Claude Code or Codex subscription, which is a second thing to have.
- Younger and smaller than Remotion's ecosystem.

**Trade-off, stated plainly:** if what you want is a thirty second chart animation built from a report that is already in a Claude conversation, and your company is on Team or Enterprise, Claude Motion is fewer steps than installing anything. Use it. GenMotion is for the video that has eight scenes, a voiceover, a brand, a deadline and four rounds of notes from someone who was not in the room.

## How to choose

- **A short animated chart or explainer from content already in a Claude chat, on Team or Enterprise:** Claude Motion.
- **On Pro or Max, or at a company where the admin toggle is not happening:** Motion is not an option. Pick one of the other three paths.
- **Video as a feature of your product, rendered per user from your own backend:** Remotion. Not Motion, and not us.
- **A launch video, a feature announcement, an onboarding explainer with narration, iterated with feedback:** a studio with a timeline, which is what we built.
- **Thousands of variants of one layout:** a template cloud API.

## The honest summary

Claude Motion is the most consequential thing that has happened to code-written video in a while, and not because the beta is deep. It is because Anthropic looked at AI video and chose programs over pixels, in the default tool that millions of people already have open. That argument, that an animation should be editable rather than regenerated, is the one this whole category has been making to an empty room.

What the beta is: a fast, precise way to turn structured content you already have into a short motion graphic, for people on Team and Enterprise, with the specs still unpublished and the creative direction still yours to supply.

What it is not: a tool for a narrated multi-scene video, a timeline, a sound stage, or anything with a performer in it. If that is your deliverable, the extra machinery is not vendor padding. It is the job.

## Where to go next

- [Remotion alternatives](/blog/remotion-alternatives), including what the licence actually costs.
- [HyperFrames alternatives](/blog/hyperframes-alternatives), for the framework end of this category.
- [Motion graphics without After Effects](/blog/motion-graphics-without-after-effects), if the question underneath all of this is how to make a good animated video at all.
- [How to make a product launch video](/blog/how-to-make-a-product-launch-video), for the deliverable most people are actually chasing.
- [Download GenMotion](/download) and try it for seven days on your own agent subscription.
