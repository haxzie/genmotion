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

/**
 * Scene one, as the agent will write every other scene: a `<template>` with
 * a sized root, its own styles and its own paused timeline, registered under
 * the id the root's slot names.
 */
export function renderHyperframesStarterScene(input: { width: number; height: number }): string {
  const { width, height } = input;
  const base = Math.min(width, height);
  return `<template>
  <div
    data-composition-id="intro"
    data-width="${width}"
    data-height="${height}"
    data-duration="5"
    style="position: absolute; inset: 0; display: grid; place-items: center; background: #0b0b10"
  >
    <div style="text-align: center">
      <h1 id="intro-title">Your first scene</h1>
      <p id="intro-sub">Ask the agent to change it.</p>
    </div>
    <style>
      [data-composition-id="intro"] #intro-title {
        margin: 0;
        font-size: ${Math.round(base * 0.1)}px;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: #f5f5f7;
      }
      [data-composition-id="intro"] #intro-sub {
        margin: ${Math.round(base * 0.03)}px 0 0;
        font-size: ${Math.round(base * 0.03)}px;
        color: #8a8a93;
      }
    </style>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.from("#intro-title", { y: 48, opacity: 0, duration: 0.7, ease: "power3.out" }, 0.3);
      tl.from("#intro-sub", { opacity: 0, duration: 0.6, ease: "power2.out" }, 1.0);
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
