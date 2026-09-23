import {
  ASSETS_DIR,
  COMPONENTS_DIR,
  INTERNAL_DIR,
  MANIFEST_FILE as MANIFEST,
  SCENES_DIR,
} from "./paths";
import { toPackageName } from "./scaffold";

/**
 * Versions a new three-engine project declares. All host-provided at runtime
 * (see `HOST_EXTERNALS`) — they're in package.json so the user's editor,
 * `tsc`, and their own coding agent resolve real types, and so the folder is a
 * truthful npm project rather than one that only builds inside our app.
 */
export interface ThreeScaffoldVersions {
  threeEngine: string;
  three: string;
  threeTypes: string;
  typescript: string;
}

export const DEFAULT_THREE_VERSIONS: ThreeScaffoldVersions = {
  threeEngine: "^0.1.0",
  three: "^0.185.1",
  threeTypes: "^0.185.4",
  typescript: "^5.9.3",
};

export function renderThreePackageJson(
  projectName: string,
  versions: ThreeScaffoldVersions = DEFAULT_THREE_VERSIONS,
): string {
  const pkg = {
    name: toPackageName(projectName),
    private: true,
    type: "module",
    scripts: {
      check: "tsc --noEmit",
    },
    dependencies: {
      "@genmotion/three-engine": versions.threeEngine,
      three: versions.three,
    },
    devDependencies: {
      "@types/three": versions.threeTypes,
      typescript: versions.typescript,
    },
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

export function renderThreeTsconfig(): string {
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      lib: ["ES2022", "DOM"],
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      esModuleInterop: true,
      resolveJsonModule: true,
      isolatedModules: true,
    },
    include: [`${SCENES_DIR}/**/*`, `${COMPONENTS_DIR}/**/*`],
  };
  return `${JSON.stringify(tsconfig, null, 2)}\n`;
}

export function renderThreeGitignore(): string {
  return ["node_modules/", `${INTERNAL_DIR}/cache/`, ".DS_Store", ""].join("\n");
}

/**
 * The scene a new three-engine project opens with, so the preview is never
 * blank. It is a welcome card, not an example — same notice convention as the
 * react scaffold's starter — and it proves the one rule that matters most on
 * first run: rotation comes from `time`, never a clock the host doesn't own.
 */
export function renderThreeStarterScene(): string {
  return `/**
 * PLACEHOLDER — NOT A REFERENCE.
 *
 * Agent: this is the scene every new project starts with, so the preview has
 * something to show before you have written anything. It says nothing about
 * what the user wants, and nothing about how a good scene is written — do not
 * copy its layout, colours, or structure.
 *
 * Understand the user's requirements first. Then delete this file and its
 * entry in project.json, and start fresh.
 */
import * as THREE from "three";
import { interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";

export default function buildScene({ scene, camera }: ThreeSceneContext): ThreeSceneUpdate {
  const geometry = new THREE.IcosahedronGeometry(1.4, 0);
  const material = new THREE.MeshStandardMaterial({
    color: "#16f5bd",
    roughness: 0.25,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);

  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(3, 4, 5);
  scene.add(mesh, key, new THREE.AmbientLight(0xffffff, 0.5));
  camera.position.z = 5;

  // Every value below is a pure function of the frame the host hands us —
  // never Three.js's own animation clock or loop. That's what makes the
  // export match the preview frame for frame.
  return ({ time, frame, progress }) => {
    mesh.rotation.y = time * 0.8;
    mesh.rotation.x = time * 0.5;
    mesh.position.y = interpolate(frame, [0, 30], [-0.3, 0]) + Math.sin(progress * Math.PI) * 0.1;
  };
}
`;
}

/**
 * The project's own instructions file. Claude Code reads it when the user
 * opens the folder themselves; Codex reads it as part of every turn.
 * `authoringGuide` is the shared scene-authoring guide, passed in the same
 * way the react scaffold's `renderAgentsMd` takes one.
 */
export function renderThreeAgentsMd(input: {
  projectName: string;
  authoringGuide?: string;
}): string {
  const head = `# ${input.projectName}

A GenMotion video project powered by the Three.js engine. Scenes are plain
TypeScript modules — no React, no JSX, no HTML — that build a \`THREE.Scene\`
once and update it frame by frame. Every frame must be a pure function of the
frame index the host hands you.

## Layout

| Path | What it is |
|---|---|
| \`${MANIFEST}\` | The timeline: fps, dimensions, scene order and durations, audio placement. Edit it to reorder, retime, or add scenes. |
| \`${SCENES_DIR}/\` | One default-exported scene builder per file. Order comes from \`${MANIFEST}\`, not the filename. |
| \`${COMPONENTS_DIR}/\` | Shared pieces (geometry factories, materials) used by more than one scene. |
| \`${ASSETS_DIR}/\` | Images, audio, video, models. Import them (\`import logo from "../${ASSETS_DIR}/logo.png"\`) rather than hard-coding URLs. |
| \`${INTERNAL_DIR}/\` | App state. Don't edit. |

## Rules

- **A scene file default-exports a builder**: \`export default function
  buildScene(ctx) { ...set up the scene graph...; return (frame) => {
  ...update it...; }; }\`. The builder runs once, when the scene becomes
  active; the returned callback runs once per rendered frame.
- **Never start your own clock.** No \`new THREE.Clock()\`, no
  \`renderer.setAnimationLoop\`, no \`requestAnimationFrame\`. The host renders
  exactly one frame per call — drive every transform from the \`time\`/
  \`frame\`/\`progress\` argument your update callback receives. Validation
  rejects scenes that break this.
- **Deterministic only.** No \`Math.random\`, \`Date.now\`, \`new Date()\`,
  timers, \`fetch\`, or direct \`document\`/\`window\` access.
- **Adding a scene** means writing the file *and* adding an entry to
  \`${MANIFEST}\`. A file nothing references is not in the video.
- **Assets are local.** Import them from \`${ASSETS_DIR}/\` and load them
  through a loader wired to \`ctx.manager\` — e.g. \`new
  THREE.TextureLoader(ctx.manager).load(url)\` — never a bare \`new Image()\`
  or \`fetch()\`, which the export's frame barrier can't wait on. Never
  hot-link a remote URL from scene code. Use the \`save_asset\` tool to copy a
  remote file in first.
- **New packages** go through the \`add_package\` tool, not \`npm install\` —
  it screens for browser safety and installs without running lifecycle
  scripts. \`three\` and \`@genmotion/three-engine\` are already available and
  supplied by the host at runtime.
- **No GSAP, no React, no DOM composition.** This engine's whole surface is
  \`three\` plus \`@genmotion/three-engine\`'s tiny \`interpolate\`/\`Easing\`
  helper — reach for Three.js's own \`MathUtils\`, \`Quaternion.slerp\`, or
  \`AnimationMixer\` (driven by an explicit \`setTime\`, never its own clock)
  first.
- **Check your work** with the \`validate_scene\` tool before you finish. It
  compiles and loads the scene, but — unlike the React engine — it cannot
  render WebGL output in Node. Follow up with \`capture_frames\` to see what
  the scene actually draws.
`;

  return input.authoringGuide
    ? `${head}\n## Scene authoring\n\n${input.authoringGuide.trim()}\n`
    : head;
}
