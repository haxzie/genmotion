---
title: "Eight free tools for developers who need a video, and none of them ask you to sign up"
description: "Turn a GitHub star count, a star history curve, npm downloads or a YouTube subscriber count into an animated MP4 — plus four calculators for aspect ratio, timecode, file size and social dimensions. All free, all in your browser."
date: "2026-08-09"
author: "The GenMotion Team"
tags: ["announcements", "free tools"]
faqs:
  - q: "Are GenMotion's free tools really free?"
    a: "Yes. Every tool is free, needs no account, and has no limit on how many videos you make. The videos carry a small GenMotion badge, and that's the whole business model behind them."
  - q: "Where is the video generated?"
    a: "Entirely in your browser. The frames are rendered and encoded on your own machine using WebCodecs, so nothing is uploaded, there's no queue to wait in, and a six-second 1080p clip takes a few seconds."
  - q: "What format do I get?"
    a: "An H.264 MP4 at 1920×1080, 1080×1080 or 1080×1920, which every social platform accepts. Browsers without an H.264 encoder — Firefox, mainly — get a VP9 WebM instead."
  - q: "Do I need an account to download?"
    a: "No. The download is never gated. You type a repository, package or channel, pick a style, and the file saves to your machine."
  - q: "Which browsers work?"
    a: "Chrome, Edge and Safari 16.4 or later can export MP4. Firefox exports WebM. Any modern browser can use the preview and the calculators."
  - q: "Can I use the videos commercially?"
    a: "Yes. The data comes from public APIs and the video is yours to post anywhere."
---

We kept watching the same small task eat an afternoon. A project crosses 10,000 stars, or a package clears a million weekly downloads, and somebody wants a short clip for a launch thread. It is thirty seconds of actual motion design and two hours of everything else — opening an editor, matching a brand colour, exporting, discovering the file is 40MB.

So we built the tools we wanted. Eight of them, free, no account, and nothing to install. Four turn a live number into an animated MP4; four are the calculators we reach for constantly and always end up googling.

Everything renders **in your browser**. Nothing is uploaded, there is no queue, and a six-second 1080p clip takes about five seconds.

---

## GitHub Star Count Video Generator

Type `owner/repo` and get an animated count-up of its live star count. The number rolls into place one digit at a time, so it reads as counting rather than as text being swapped.

::video /blog/free-tools/star-count.mp4 "react/react — Count up, 16:9" /blog/free-tools/star-count.jpg

Every generator offers three sizes: 16:9 for YouTube and slides, 1:1 for the feed, 9:16 for Reels, Shorts and Stories. The Stat card style is tighter, and works well square:

::video /blog/free-tools/star-count-square.mp4 "vercel/next.js — Stat card, 1:1" /blog/free-tools/star-count-square.jpg

**[Make a star count video →](/tools/github-star-count)**

---

## GitHub Star History Video Generator

A star count is a number. A star *history* is a story — the flat year before anyone noticed, the launch that bent the curve, the steady climb after.

::video /blog/free-tools/star-history.mp4 "react/react — 160 months of star history, drawn in six seconds" /blog/free-tools/star-history.jpg

The chart draws month by month while the number counts alongside it, so the curve and the total land together.

One technical note we're mildly proud of. GitHub's own stargazers API stops paginating after 400 pages — about 40,000 stars — so any tool built on it simply cannot see the recent half of a popular repository's timeline. Ours reads GH Archive's public event stream instead, which has no such ceiling. That clip above is react/react's **full** history, all 247,144 stars back to 2013, not a sample that flatlines at 40k.

**[Chart a repository's history →](/tools/github-star-history)**

---

## NPM Downloads Video Generator

Weekly downloads for any package on npm, including scoped ones. The chart style plots the last 52 weeks, so the trend shows up alongside the headline figure — including the dip every package takes over the winter holidays.

::video /blog/free-tools/npm-downloads.mp4 "react — 52 weeks of weekly downloads, 16:9" /blog/free-tools/npm-downloads.jpg

And vertical, for Stories and Shorts:

::video /blog/free-tools/npm-downloads-vertical.mp4 "typescript — Stat card, 9:16" /blog/free-tools/npm-downloads-vertical.jpg

**[Make an npm downloads video →](/tools/npm-downloads)**

---

## YouTube Subscriber Count Video Generator

A channel handle, a channel URL or a `UC…` ID, and you get an animated subscriber count.

::video /blog/free-tools/youtube-subscribers.mp4 "@mkbhd — Count up, 16:9" /blog/free-tools/youtube-subscribers.jpg

Worth knowing: YouTube's API only returns subscriber counts rounded to three significant figures, so you get 21.1M rather than an exact number. That's a platform limit — every tool built on the official API shows the same rounded figure.

**[Make a subscriber count video →](/tools/youtube-subscribers)**

---

## And four calculators

No videos here, just the arithmetic we were tired of redoing.

- **[Aspect Ratio Calculator](/tools/aspect-ratio-calculator)** — pick a ratio, lock a width or height, get the exact matching dimension. For when a landscape edit has to become vertical and you'd rather not guess at the crop.
- **[Timecode ↔ Frames Converter](/tools/timecode-frames-converter)** — `HH:MM:SS:FF` to a raw frame count and back, at any frame rate. The same frame count is a different duration at 24 and 60fps, which is exactly the mistake this prevents.
- **[Video File Size Estimator](/tools/video-file-size-estimator)** — size an export from its bitrate and duration, or work backwards to the bitrate that fits a platform's limit. Better to find out before a long render than after.
- **[Social Video Size Guide](/tools/social-video-size-guide)** — recommended dimensions and ratios for every major placement, so nothing gets auto-cropped on upload.

---

## Why they're free

No trick, and no email wall. These tools do one small thing well, and the videos carry a small GenMotion badge — that's the entire arrangement.

They also share their engine with the product. The same deterministic motion runtime that renders these clips renders the videos GenMotion's agent makes: motion is a pure function of the frame number, which is why the preview and the downloaded file match exactly. The free tools are that engine with the prompt taken out and a single number put in its place.

If you want the version where you describe a whole video instead of typing a repository name, that's [GenMotion](/) — and there's a free plan there too.

**[Browse all eight free tools →](/tools)**
