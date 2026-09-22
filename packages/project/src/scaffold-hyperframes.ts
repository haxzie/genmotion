import { ASSETS_DIR, INTERNAL_DIR, MANIFEST_FILE, SCENES_DIR } from "./paths";
import { toPackageName } from "./scaffold";

/** The root composition. Sub-compositions are `scenes/*.html`. */
export const HYPERFRAMES_ENTRY = "index.html";

export interface HyperframesScaffoldVersions {
  /** `@hyperframes/core`, pinned exact — the runtime the project was made with. */
  hyperframes: string;
  gsap: string;
}

export function renderHyperframesPackageJson(
  projectName: string,
  versions: HyperframesScaffoldVersions,
): string {
  const pkg = {
    name: toPackageName(projectName),
    private: true,
    type: "module",
    // Not a build: the app compiles and renders. The pins are here so the
    // project is a truthful npm package the user's own tools can read, and so
    // `hyperframes.json` and this agree on what it runs.
    dependencies: {
      "@hyperframes/core": versions.hyperframes,
      gsap: versions.gsap,
    },
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

/**
 * The file upstream tooling identifies a project by. `version` is the
 * `@hyperframes/core` release the project runs on; the install step rewrites
 * it once the newest one is in place.
 */
export function renderHyperframesJson(input: {
  name: string;
  version: string;
  width: number;
  height: number;
  fps: number;
}): string {
  return `${JSON.stringify(
    {
      name: input.name,
      version: input.version,
      entry: HYPERFRAMES_ENTRY,
      width: input.width,
      height: input.height,
      fps: input.fps,
    },
    null,
    2,
  )}\n`;
}

export function renderHyperframesGitignore(): string {
  // `.agents/` holds per-machine symlinks to the app's skill pack (see the
  // desktop's plugin wiring); they mean nothing on another computer.
  return ["node_modules/", `${INTERNAL_DIR}/cache/`, ".agents/", "exports/", ".DS_Store", ""].join("\n");
}

/** The starter scene's file, mounted by the root as scene one. */
export const HYPERFRAMES_STARTER_SCENE = `${SCENES_DIR}/01-intro.html`;

/**
 * The root composition: the timeline. It mounts each scene from `scenes/`
 * in order and holds nothing visual of its own — the same split the React
 * scaffold makes between `project.json` and `scenes/*.tsx`, so the editor's
 * scene chips and the agent's habits carry over unchanged. Sized root, one
 * slot, one paused timeline: the minimal shape `hyperframes-core` documents.
 */
export function renderHyperframesIndexHtml(input: {
  name: string;
  width: number;
  height: number;
  gsapVersion: string;
}): string {
  const { width, height, gsapVersion } = input;
  const title = escapeHtml(input.name);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${width}, height=${height}" />
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@${gsapVersion}/dist/gsap.min.js"></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: #0b0b10;
      }
      body {
        font-family: Inter, system-ui, sans-serif;
        color: #f5f5f7;
      }
      #root {
        position: relative;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
      }
      .clip {
        position: absolute;
        inset: 0;
      }
    </style>
  </head>
  <body>
    <!--
      The timeline. One slot per scene, in playback order: each scene is a
      file in scenes/, and its slot's data-start is the previous slot's end.
      Global things — a music bed, a watermark — live here; visuals live in
      the scenes.
    -->
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-width="${width}"
      data-height="${height}"
      data-duration="5"
    >
      <div
        id="scene-intro"
        class="clip"
        data-composition-src="${HYPERFRAMES_STARTER_SCENE}"
        data-composition-id="intro"
        data-start="0"
        data-duration="5"
        data-track-index="0"
      ></div>
    </div>
    <script>
      // The root's own timeline. Scenes animate themselves; the runtime nests
      // their timelines under this one at their slot's start.
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
}

/** One of the starter scene's three feature cards. */
interface StarterCard {
  id: string;
  /** A 24x24 lucide-style stroke icon, `currentColor` and no size of its own. */
  icon: string;
  title: string;
  body: string;
}

const STARTER_CARDS: StarterCard[] = [
  {
    id: "card-select",
    icon: `<path d="M14 4.1 12 6" /><path d="m5.1 8-2.9-.8" /><path d="m6 12-1.9 2" /><path d="M7.2 2.2 8 5.1" /><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.739.739l-1.041 4.35a.5.5 0 0 1-.949.074z" />`,
    title: "Click to edit",
    body: "Select any element on the video preview to quickly edit it.",
  },
  {
    id: "card-assets",
    icon: `<path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6.3" /><path d="M16 5h6" /><path d="M19 2v6" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />`,
    title: "Drop your assets",
    body: "Drag and drop images, videos and other assets to ask the agent to include them in a scene.",
  },
  {
    id: "card-mcp",
    icon: `<path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />`,
    title: "Connect MCPs",
    body: "Connect MCPs to your agent to generate images, videos and more.",
  },
];

/**
 * Scene one, as the agent will write every other scene: a `<template>` with
 * a sized root, its own styles and its own paused timeline, registered under
 * the id the root's slot names.
 *
 * A welcome card, not an example — the same one the React engine scaffolds,
 * ported to HTML and GSAP so either engine opens onto the same first
 * impression. It says nothing about what the user wants and nothing about
 * how a good scene is written; the agent is told so below, and should
 * replace it once it understands the brief rather than build on it.
 */
export function renderHyperframesStarterScene(input: { width: number; height: number }): string {
  const { width, height } = input;
  const px = (ratio: number) => Math.round(width * ratio);
  const titleSize = px(0.025);
  const subSize = px(0.0146);
  const logoTile = px(0.0625);
  const logoSize = Math.round(logoTile * 0.6);
  const heroGap = px(0.0104);
  const cardsGap = px(0.0125);
  const cardsMarginTop = px(0.0229);
  const cardWidth = px(0.2292);
  const cardPad = px(0.0167);
  const cardRadius = px(0.0104);
  const cardTitleSize = px(0.0156);
  const cardBodySize = px(0.0146);
  const iconSize = px(0.025);
  return `<template>
  <!--
    PLACEHOLDER — NOT A REFERENCE.

    Agent: this is the scene every new project starts with, so the preview has
    something to show before you have written anything. It says nothing about
    what the user wants, and nothing about how a good composition is written —
    do not copy its layout, colours, copy, or structure.

    Understand the user's requirements first. Then delete this file and its
    slot in ${HYPERFRAMES_ENTRY}, and start fresh.
  -->
  <div
    data-composition-id="intro"
    data-width="${width}"
    data-height="${height}"
    data-duration="5"
    style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${heroGap}px; background: #ffffff; font-family: Inter, system-ui, sans-serif; overflow: hidden"
  >
    <svg id="bg-grid" width="100%" height="100%" style="position: absolute; inset: 0">
      <defs>
        <pattern id="intro-dotted-grid" width="80" height="80" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0.5" x2="80" y2="0.5" stroke="#c7c7cf" stroke-width="1" stroke-dasharray="2 4" />
          <line x1="0.5" y1="0" x2="0.5" y2="80" stroke="#c7c7cf" stroke-width="1" stroke-dasharray="2 4" />
        </pattern>
        <radialGradient id="intro-grid-fade">
          <stop offset="40%" stop-color="#fff" stop-opacity="1" />
          <stop offset="100%" stop-color="#fff" stop-opacity="0" />
        </radialGradient>
        <mask id="intro-grid-mask">
          <rect width="100%" height="100%" fill="url(#intro-grid-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#intro-dotted-grid)" mask="url(#intro-grid-mask)" />
    </svg>

    <div id="logo-tile">
      <svg id="logo" width="${logoSize}" height="${logoSize}" viewBox="0 0 512 512" fill="none">
        <defs>
          <linearGradient id="intro-logo-gradient" x1="61" y1="88.5" x2="428.5" y2="430" gradientUnits="userSpaceOnUse">
            <stop stop-color="#C6F91E" />
            <stop offset="1" stop-color="#16F5BD" />
          </linearGradient>
        </defs>
        <path
          d="M280.083 111.725V38.5C280.083 25.2083 269.208 14.3333 255.917 14.3333C179.55 14.3333 118.65 108.1 111.642 231.833H38.4167C25.125 231.833 14.25 242.708 14.25 256C14.25 332.367 108.017 393.267 231.75 400.275V473.5C231.75 486.792 242.625 497.667 255.917 497.667C332.283 497.667 393.183 403.9 400.192 280.167H473.417C486.708 280.167 497.583 269.292 497.583 256C497.583 179.633 403.817 118.733 280.083 111.725ZM255.917 292.25C235.858 292.25 219.667 276.058 219.667 256C219.667 235.942 235.858 219.75 255.917 219.75C275.975 219.75 292.167 235.942 292.167 256C292.167 276.058 275.975 292.25 255.917 292.25Z"
          fill="url(#intro-logo-gradient)"
        />
      </svg>
    </div>

    <h1 id="hero-title">Welcome to your first scene 🎉</h1>
    <p id="hero-subtitle">Ask the agent to edit the video</p>

    <div id="cards">
      ${STARTER_CARDS.map(
        (card) => `<div class="intro-card" id="${card.id}">
        <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${card.icon}</svg>
        <div class="intro-card-title">${card.title}</div>
        <div class="intro-card-body">${card.body}</div>
      </div>`,
      ).join("\n      ")}
    </div>

    <style>
      [data-composition-id="intro"] #logo-tile {
        width: ${logoTile}px;
        height: ${logoTile}px;
        border-radius: ${Math.round(logoTile * 0.28)}px;
        background: #0b0b10;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
        position: relative;
      }
      [data-composition-id="intro"] #hero-title {
        margin: 0;
        position: relative;
        font-size: ${titleSize}px;
        font-weight: 500;
        color: #111114;
        letter-spacing: -0.02em;
      }
      [data-composition-id="intro"] #hero-subtitle {
        margin: 0;
        position: relative;
        font-size: ${subSize}px;
        color: #5c5c66;
      }
      [data-composition-id="intro"] #cards {
        position: relative;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: ${cardsGap}px;
        margin-top: ${cardsMarginTop}px;
        max-width: 92%;
      }
      [data-composition-id="intro"] .intro-card {
        width: ${cardWidth}px;
        padding: ${cardPad}px ${cardPad}px ${Math.round(cardPad * 1.1)}px;
        border-radius: ${cardRadius}px;
        background: #ffffff;
        border: 1px solid #e4e4ea;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
        gap: ${Math.round(cardPad * 0.44)}px;
        box-sizing: border-box;
      }
      [data-composition-id="intro"] .intro-card-title {
        font-size: ${cardTitleSize}px;
        font-weight: 500;
        color: #111114;
        letter-spacing: -0.01em;
      }
      [data-composition-id="intro"] .intro-card-body {
        font-size: ${cardBodySize}px;
        line-height: 1.35;
        color: #5c5c66;
      }
    </style>
    <script>
      const tl = gsap.timeline({ paused: true });
      // One full turn every 6 seconds, matching the React starter's frame-driven spin.
      tl.to("[data-composition-id='intro'] #logo", { rotation: 360, duration: 6, ease: "none", repeat: -1 }, 0);
      window.__timelines["intro"] = tl;
    </script>
  </div>
</template>
`;
}

/**
 * The project's instructions file, for whichever agent opens the folder.
 *
 * `guide` is the shared GenMotion-in-HyperFrames guide (`@genmotion/hyperframes`
 * exports it) — passed in so this package stays free of the engine, and so
 * there is one copy of that text.
 */
export function renderHyperframesAgentsMd(input: { projectName: string; guide: string }): string {
  return `# ${input.projectName}

A GenMotion video project, built on [HyperFrames](https://github.com/heygen-com/hyperframes).

## Layout

| Path | What it is |
|---|---|
| \`${HYPERFRAMES_ENTRY}\` | The root composition: dimensions, duration, the clips and the sub-composition slots, and the main GSAP timeline. |
| \`${SCENES_DIR}/\` | The scenes, one HTML file each, wrapped in \`<template>\`. Mounted from the root with \`data-composition-src\`, in order. |
| \`${ASSETS_DIR}/\` | Images, audio, video, fonts. Reference them by relative path. |
| \`hyperframes.json\` | Project metadata: name, size, fps, and the HyperFrames release it runs on. |
| \`${MANIFEST_FILE}\` | The app's own manifest (name, size, fps, \`engine\`). The composition — not this file — is the timeline. |
| \`${INTERNAL_DIR}/\` | App state. Don't edit. |

${input.guide.trim()}
`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
