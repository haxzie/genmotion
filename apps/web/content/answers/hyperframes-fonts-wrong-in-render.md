---
title: "Why do my fonts look wrong in a HyperFrames render, and what is FONT_FETCH_FAILED?"
description: "A font that looks right in preview can fall back, change weight or fail the render outright. Embed the font with @font-face, understand what the compiler does with a named Google Font, and know why Arial and Segoe UI behave differently from Helvetica."
tool: hyperframes
kind: error
errors:
  - "FONT_FETCH_FAILED"
  - "font_family_without_font_face"
  - "google_fonts_import"
date: "2026-10-05"
updated: "2026-10-05"
tags: ["fonts", "render", "cloud"]
related:
  - hyperframes-render-looks-different-from-preview
  - hyperframes-render-is-slow
  - hyperframes-determinism-rules
sources:
  - label: "HyperFrames error codes: a font cannot be resolved"
    url: "https://developers.heygen.com/docs/error-codes"
  - label: "hyperframes#957: treat 4xx from Google Fonts as deterministic, not as fail-closed"
    url: "https://github.com/heygen-com/hyperframes/pull/957"
  - label: "hyperframes#4569: embed the Google font the page linked instead of a wider cut"
    url: "https://github.com/heygen-com/hyperframes/pull/4569"
  - label: "hyperframes#3583: Google Fonts and the lint rule disagree about named fonts"
    url: "https://github.com/heygen-com/hyperframes/issues/3583"
  - label: "HyperFrames: Deterministic Rendering"
    url: "https://hyperframes.heygen.com/concepts/determinism"
genmotion:
  heading: "Fonts that live in the project"
  body: |-
    A GenMotion project is a folder you own, with fonts kept in its assets and declared in the composition, and the HyperFrames skills the agent follows say never to name a font that has no file. The preview and the exported MP4 are built from that one folder. Tell the agent which brand font to use and where the file is.
faqs:
  - q: "What is the safest way to use a custom font?"
    a: "Ship the font file in the project and declare it with @font-face. HeyGen's own render error guidance for an unresolved font is the same: embed the font with @font-face, or use a Google Fonts family."
  - q: "Why does Arial or Segoe UI break my render when Helvetica works?"
    a: "The compiler supplement-fetches named families from Google Fonts. Google serves Helvetica and Helvetica Neue but answers Arial and Segoe UI with an HTTP 400, because it does not host them. Distributed renders fail closed by default, and before a May 2026 fix they treated that 400 as a fatal font fetch failure. The fix treats a 4xx as a deterministic answer (not served) and falls back to the embedded faces or your font-family chain."
  - q: "What does fail closed mean for fonts?"
    a: "On cloud and distributed renders, a font fetch that might succeed on retry with different bytes would break the guarantee that a retry produces the same pixels. So those renders refuse to continue when a font cannot be fetched for a non-deterministic reason, such as a 5xx or a network error."
---

Fonts are where the preview-to-render gap shows up most, because a browser on your laptop quietly substitutes a font that a headless render on another machine will not.

## Three different symptoms

1. **The wrong font appears.** The render uses a fallback or a different cut than the preview.
2. **The render fails with `FONT_FETCH_FAILED`.** Seen on distributed and cloud renders.
3. **A lint warning** such as `font_family_without_font_face` or `google_fonts_import`.

They have one root: the renderer has to resolve every font before the first frame, with no network surprises, so that the same input gives the same pixels.

## Fix: embed the font

Ship the font file in the project and declare it:

```css
@font-face {
  font-family: "Brand Sans";
  src: url("./assets/fonts/BrandSans-Regular.woff2") format("woff2");
  font-weight: 400;
}
```

That removes the network, the machine and the Chrome version from the equation. It is also what HeyGen's own error guidance says to do when a font cannot be resolved: embed it with `@font-face`, or use a Google Fonts family.

## The Google Fonts story, because it is confusing

There are three sources that appear to disagree, and it helps to know all three.

- According to the project's typography reference, the compiler can fetch a real Google Font at build time when you name a family without a matching `@font-face`. On local renders that works, and it triggers the `font_family_without_font_face` warning. `google_fonts_import` is the sibling rule: it flags an `@import` of a Google Fonts URL, which is another way of depending on the network at render time.
- On distributed and cloud (Lambda) renders, the same fetch is **fail-closed**, so a family that cannot be fetched is a hard error rather than a quiet fallback.
- One of the project's own skill references states the stricter rule: never name a font that has no file.

An issue filed in September 2026 points out that these do not agree with each other, and was closed on September 23. The practical reading is simple: for anything you care about, ship the file.

## Why Arial and Segoe UI behave differently from Helvetica

A real example from the fix. After a change added a Google Fonts supplement fetch, distributed renders of any composition naming a non-Google family started failing with `FONT_FETCH_FAILED`. Checked against Google directly:

| Family | HTTP status from Google Fonts |
| --- | --- |
| Inter | 200 |
| Helvetica Neue | 200 |
| Helvetica | 200 |
| Arial | 400 |
| Segoe UI | 400 |

Google does not host Arial or Segoe UI, so it answers 400. A 400 is a deterministic answer: it is the same on every retry, so it cannot break reproducibility. The fix, merged May 19, 2026, treats any 4xx as "not served" and falls back, and keeps failing closed only for 5xx responses and network errors, where a retry might change the result.

## A subtler version, fixed in September 2026

Rendered text could use a different Google font file than the preview did, because the renderer reconstructed a request by weight rather than using what the page actually linked. A fix merged on September 28, 2026 embeds the Google font the page linked instead of a wider cut. If you saw a weight mismatch or a different cut on an older version, upgrade.

## Check it worked

```bash
npx hyperframes lint
npx hyperframes render --docker --output output.mp4
```

`lint` shows the font warnings. A Docker render pins the Chromium version, the font set and the FFmpeg encoder, so if the text matches in Docker, the font is resolving deterministically.
