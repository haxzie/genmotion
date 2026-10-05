---
term: "Headless Browser"
description: "A web browser that runs without a visible window, used by code-to-video tools to draw each frame of a page so it can be captured and encoded into video."
faqs:
  - q: "Why do video tools use a headless browser?"
    a: "Because a web page already is a layout and animation engine. A tool opens your composition in a browser with no window, draws or seeks to each frame, captures it as an image, and hands the frames to an encoder such as ffmpeg."
  - q: "Why do headless renders sometimes go black or hang?"
    a: "Usually because of the page, not the browser: an animation that was never registered, an asset that did not load, or a script that threw. Occasionally it is the browser itself. Remotion's docs note that newer Chrome versions removed the old headless mode and advise using Chrome Headless Shell instead."
  - q: "Is a headless render the same as what I see in a browser tab?"
    a: "It should be, but fonts, browser versions and the order frames are visited can differ. Rendering in a pinned environment such as Docker rules out the machine."
---

A **headless browser** is a web browser that runs without a visible window. Code-to-video tools use one as their renderer: it loads your composition, moves it to a specific moment, draws the frame, and a screenshot of that frame is captured. The frames are joined into a video by an encoder.

That is the model behind HyperFrames, Remotion and GenMotion's own renderer. The differences between tools are mostly about who owns that pipeline and what you author on top of it.

## When it goes wrong

A black or frozen render is almost always something in the page: an animation the renderer cannot seek, a missing asset, or a script that threw before the timeline was built. The tools differ in how loudly they report it. See [why a HyperFrames render is black](/answers/hyperframes-render-is-black), and [what to check when a Remotion render is stuck](/answers/remotion-render-stuck).

See also: [Deterministic Rendering](/glossary/deterministic-rendering), [Render](/glossary/render).
