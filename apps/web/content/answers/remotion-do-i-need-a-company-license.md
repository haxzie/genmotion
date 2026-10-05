---
title: "Do I need a Remotion Company License, and what counts as a render?"
description: "Free for teams of up to three people. At four or more you need a Company License, and if you automate rendering you need the per-render Automators plan, with a $100 monthly minimum. Stills count as renders. Studio previews do not."
tool: remotion
kind: decision
date: "2026-10-05"
updated: "2026-10-05"
tags: ["license", "pricing", "automators", "creators"]
related:
  - is-remotion-worth-it-for-saas-feature-videos
  - remotion-lambda-toomanyrequestsexception
  - remotion-render-is-slow
sources:
  - label: "Remotion: License"
    url: "https://www.remotion.pro/license"
  - label: "Remotion: License FAQ"
    url: "https://www.remotion.dev/docs/license/faq"
genmotion:
  heading: "No per-render fee to model"
  body: |-
    GenMotion exports are not charged per render: the free plan includes a monthly allowance, and Pro is a flat monthly price for unlimited exports. Details are on the [pricing page](/pricing). GenMotion does not render Remotion projects: it builds Three.js and HyperFrames videos. If the licence is what brought you here, [Remotion alternatives, compared honestly](/blog/remotion-alternatives) covers when to simply pay for Remotion.
faqs:
  - q: "Who can use Remotion for free?"
    a: "An organisation or team of individuals with up to 3 people qualifies for the Free License. A Company License applies to collaborations and companies of 4 or more people. The cutoff is headcount, not revenue or usage."
  - q: "Do still images count as renders?"
    a: "Yes. Per the license FAQ, one render is the successful generation of a video, audio, GIF, still image or PDF. If you generate stills as well as video, both are billable renders. Previews in the Remotion Studio or the Remotion Player do not count."
  - q: "What counts as an automation?"
    a: "The license FAQ defines it as code that programmatically calls rendering APIs such as renderMedia() or renderStill(), or the CLI commands npx remotion render and npx remotion still. An organisation that builds automations needs the matching license."
  - q: "How does it work for agencies?"
    a: "If your client owns or operates the Remotion project, both companies' headcounts are aggregated for the 4-person threshold. Read the FAQ before assuming a small agency is free."
---

The licence is public and specific, so here it is stated plainly. Prices and terms change, so check [the current licence](https://www.remotion.pro/license) before you decide. What follows is accurate as of October 2026.

## The short version

- **Up to 3 people:** the Free License covers an organisation or team of that size.
- **4 or more people:** you need a Company License. The page words it as "collaborations and companies of 4+ people".
- **The cutoff is headcount.** A three-person startup pays nothing. Hire a fourth person and you are licensed. Revenue and usage do not enter into it.

## The plans

| Plan | Price | Notes |
| --- | --- | --- |
| Remotion for Creators | $25 per seat per month | No minimum when bought alone |
| Remotion for Automators | $0.01 per render, $100 per month minimum | For code that renders programmatically |
| Both together | A combined $100 per month minimum applies | Seat spending counts toward the minimum |
| Enterprise | Starting at $500 per month | Same per-render pricing |

## What counts as a render

From the license FAQ, verbatim: *"1 render is the successful generation of a video, audio, GIF, still image or PDF."* And: *"Previews in the Remotion Studio or Remotion Player do not count as Renders."*

Note the **still image**. If your pipeline renders a thumbnail for every video, that is two renders, not one. Cost modelling that counts only videos will undercount.

## What counts as an automation

You need the Automators plan if you build automations, which the FAQ defines as code that programmatically calls rendering APIs such as `renderMedia()` or `renderStill()`, or the CLI commands `npx remotion render` and `npx remotion still`.

## What it means at different volumes

The $100 monthly minimum is the number that surprises people.

| Monthly renders | Automators cost | Effective cost per render |
| --- | --- | --- |
| 1,000 | $100 (minimum applies) | $0.10 |
| 10,000 | $100 (minimum applies) | $0.01 |
| 100,000 | $1,000 | $0.01 |
| 1,000,000 | $10,000 | $0.01 |

At high volume the per-render fee is cheap for what it does. The friction is at the low end: a four person company rendering fifty videos a month pays the same $100 minimum as one rendering ten thousand, which is $2 per video.

## Agencies

If you deliver work to clients, the headcount rule depends on who owns the project. If your client owns or operates the Remotion project, both companies' headcounts are aggregated for the 4-person threshold. Read the FAQ's agency section before you decide a small studio is free.

## This is not legal advice, and it is not a reason to leave

If Remotion is working for you at volume, none of this is a reason to switch. Remotion's licence is the price of a mature, well-documented tool, and for per-user video inside a product it is hard to beat. If the minimum is what is hurting, see [whether Remotion is worth it for your kind of video](/answers/is-remotion-worth-it-for-saas-feature-videos), or the [full comparison of alternatives](/blog/remotion-alternatives).

## Check it worked

Count your rendering code paths before you estimate: every `renderMedia()`, `renderStill()`, Lambda render and CLI render in your pipeline, including stills. Multiply by your monthly volume, apply the $100 floor, and add seats for anyone who authors compositions.
