/**
 * What an agent needs to know about a HyperFrames project *inside GenMotion*.
 *
 * The HyperFrames skills carry the authoring knowledge — the composition
 * contract, animation, design, media — and are handed to the harness with the
 * project. What they cannot know is that here there is no CLI: this app is
 * the preview, the linter, the renderer and the registry, and each of those
 * reaches the agent as a tool instead of a command. This text is the bridge,
 * rendered into the project's AGENTS.md and into the desktop system prompt so
 * there is exactly one copy of it.
 *
 * Kept stable between turns: the desktop prompt is cached by the harness.
 */
export const HYPERFRAMES_AUTHORING_GUIDE = `# This is a HyperFrames project

HyperFrames renders video from HTML. \`index.html\` is the **timeline**: a root \`<div data-composition-id="main" data-width data-height data-duration>\` with one slot per scene — \`<div class="clip" data-composition-src="scenes/02-hero.html" data-composition-id="hero" data-start="…" data-duration="…" data-track-index="0">\` — and one paused GSAP timeline registered on \`window.__timelines["main"]\`. **Every scene is its own file under \`scenes/\`**, wrapped in \`<template>\`, with its own sized root, styles and paused timeline registered under the slot's \`data-composition-id\`. Media and images live in \`assets/\`.

The editor shows the scenes as chips on its timeline, in slot order, and the user talks about "the intro scene" or "scene 2" — so:

- **Adding a scene is two steps**: write \`scenes/<nn>-<slug>.html\`, then add its slot to \`index.html\` with \`data-start\` equal to the previous slot's end. A file nothing mounts is not in the video.
- **Reordering, retiming, removing** are edits to the slots in \`index.html\` (and the root's \`data-duration\`, which is the video's length). Keep file number prefixes matching slot order.
- **Visuals live in scenes, not in the root.** The root holds what spans the video: an \`<audio>\` bed, a persistent watermark, transitions between slots. A \`<section>\` with content directly under the root does not appear as a scene in the editor.
- Scene ids are per composition: a slot's \`data-composition-id\` matches its file's root and its \`window.__timelines[...]\` key. Prefix element ids inside a scene with its name (\`#hero-title\`) so every id in the assembled page is unique.

**Read the \`hyperframes-core\` skill before writing or editing composition HTML.** It is the contract; the other \`hyperframes-*\` skills cover animation, design, keyframes, audio and media, and the workflow skills (\`general-video\`, \`motion-graphics\`, \`product-launch-video\`, \`faceless-explainer\`, …) cover how to plan a whole video. \`/hyperframes\` is the entry point that routes between them.

## There is no HyperFrames CLI here

The skills say \`npx hyperframes <command>\` in many places. **Never run it** — it is not installed, and this app does each of those jobs itself. Use the equivalent:

| The skill says | Do this instead |
|---|---|
| \`hyperframes lint\`, \`check\`, \`validate\`, \`inspect\`, \`layout\` | Call the \`validate_composition\` tool. It runs the same linter and then loads the composition for real, seeking three frames. |
| \`hyperframes snapshot\`, \`preview\`, \`play\` | Call \`capture_frames\` to see a frame. The preview is already on the user's screen, updating as you save. |
| \`hyperframes render\` | Don't. The user exports from the Export button when they are happy; never try to render a file yourself. |
| \`hyperframes init\`, \`upgrade\`, \`skills\`, \`doctor\`, \`info\` | Already done. The project is scaffolded and the skills are installed. |
| \`hyperframes add\`, \`catalog\` (registry blocks and components) | Not available yet. Write the effect by hand, following the \`hyperframes-animation\` blueprints. |
| \`hyperframes tts\` | Call \`generate_voiceover\`. |
| \`hyperframes transcribe\`, \`remove-background\`, \`bgm\`, \`sfx\`, \`auth\`, \`cloud\`, \`lambda\`, \`publish\`, \`capture\`, \`figma\` | Not available. Say so in a sentence if the task needs one, and continue without it. |
| A skill's bundled script (\`scripts/*.mjs\`, \`*.py\`) | Don't run it — they shell out to the CLI or need API keys this app doesn't hold. |

The project's \`package.json\` lists \`@hyperframes/core\` and \`gsap\`; they are there so your editor and the app agree on versions. You do not import from them in composition HTML.

## How this app runs the composition

- **Preview** compiles \`index.html\` with the HyperFrames compiler on every save (sub-compositions inlined, timing resolved) and shows it in the editor. The Preview reports lint findings in the same place; the user sees them too.
- **GSAP** — load it the way the skills show, \`<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>\`. The app swaps that for a local copy, so the preview and the export work offline. Plugins from a CDN are not swapped; avoid them unless the user has network.
- **Assets are local.** \`src="assets/logo.png"\` from \`index.html\`, \`src="../assets/logo.png"\` from a file in \`scenes/\` — paths are relative to the file they are written in, and the compiler rewrites them. Never hot-link a remote URL: the link rots, the export machine may be offline, and the video gets a hole. Use \`save_asset\` to copy a remote file in, \`generate_image\` to make one.
- **Fonts** — a Google Fonts \`<link>\` works in the preview, but the safe path is a \`.woff2\` in \`assets/\` (\`save_asset\` it) with an \`@font-face\`. The export waits for \`document.fonts.ready\` either way.
- **Audio** — \`<audio id="…" src="assets/…" data-start data-duration data-volume>\` elements in the composition, exactly as \`hyperframes-core\` describes. The export mixes every \`<audio>\` with an \`id\` and a local \`src\`; fades animated on the timeline (\`tl.to("#bgm", { volume: 0, duration: 1 }, …)\`) are honoured. Video must be \`muted playsinline\`; its sound is a separate \`<audio>\`.
- **Determinism** — everything the skills forbid (\`Math.random\`, \`Date.now\`, timers, \`repeat: -1\`, \`display\`/\`visibility\` tweens on clips) breaks here for the same reasons: the export seeks frame by frame and captures.
- **\`.genmotion/\`** is app state and \`node_modules/\` is the install. Don't edit either.

## Checking your work

Call \`validate_composition\` after every edit to \`index.html\` or a file in \`scenes/\`, and fix what it reports before you finish — the same findings show in the editor. Then \`capture_frames\` at the moments that matter (a headline at its peak, a scene's midpoint) and look: a composition can lint clean and still have text overflowing its box or a card the same colour as its background. Never end a turn with a composition that fails to compile.
`;
