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
 * blank.
 *
 * It is a welcome card, not an example — same notice convention as the react
 * and hyperframes scaffolds' starters, and the same words on screen, so the
 * three flavours of a new project greet you the same way. It also proves the
 * two rules that matter most on first run: rotation comes from `time`, never a
 * clock the host doesn't own, and text is drawn into a canvas texture, because
 * this engine has no DOM to lay type out in.
 *
 * The logo is the brand mark's own path, extruded — an inline shape rather
 * than an asset, so the scaffold stays one file and deleting the scene leaves
 * nothing behind.
 */
export function renderThreeStarterScene(): string {
  return `/**
 * PLACEHOLDER — NOT A REFERENCE.
 *
 * Agent: this is the scene every new project starts with, so the preview has
 * something to show before you have written anything. It says nothing about
 * what the user wants, and nothing about how a good scene is written — do not
 * copy its layout, colours, copy, or structure.
 *
 * Understand the user's requirements first. Then delete this file and its
 * entry in project.json, and start fresh.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";

/** The brand mark's viewBox is 512x512, centred on (256, 256). */
const ORIGIN = 256;
/** SVG y grows downwards and three's grows up, so y is mirrored here. */
const sx = (x: number) => (x - ORIGIN) / ORIGIN;
const sy = (y: number) => (ORIGIN - y) / ORIGIN;
const moveTo = (p: THREE.Path, x: number, y: number) => p.moveTo(sx(x), sy(y));
const lineTo = (p: THREE.Path, x: number, y: number) => p.lineTo(sx(x), sy(y));
const curveTo = (
  p: THREE.Path,
  x1: number, y1: number,
  x2: number, y2: number,
  x: number, y: number,
) => p.bezierCurveTo(sx(x1), sy(y1), sx(x2), sy(y2), sx(x), sy(y));

const LIME = new THREE.Color("#c6f91e");
const TEAL = new THREE.Color("#16f5bd");

/** The mark, as one closed outline with the centre dot punched out of it. */
function logoGeometry(): THREE.ExtrudeGeometry {
  const outline = new THREE.Shape();
  moveTo(outline, 280.083, 111.725);
  lineTo(outline, 280.083, 38.5);
  curveTo(outline, 280.083, 25.2083, 269.208, 14.3333, 255.917, 14.3333);
  curveTo(outline, 179.55, 14.3333, 118.65, 108.1, 111.642, 231.833);
  lineTo(outline, 38.4167, 231.833);
  curveTo(outline, 25.125, 231.833, 14.25, 242.708, 14.25, 256);
  curveTo(outline, 14.25, 332.367, 108.017, 393.267, 231.75, 400.275);
  lineTo(outline, 231.75, 473.5);
  curveTo(outline, 231.75, 486.792, 242.625, 497.667, 255.917, 497.667);
  curveTo(outline, 332.283, 497.667, 393.183, 403.9, 400.192, 280.167);
  lineTo(outline, 473.417, 280.167);
  curveTo(outline, 486.708, 280.167, 497.583, 269.292, 497.583, 256);
  curveTo(outline, 497.583, 179.633, 403.817, 118.733, 280.083, 111.725);

  const dot = new THREE.Path();
  moveTo(dot, 255.917, 292.25);
  curveTo(dot, 235.858, 292.25, 219.667, 276.058, 219.667, 256);
  curveTo(dot, 219.667, 235.942, 235.858, 219.75, 255.917, 219.75);
  curveTo(dot, 275.975, 219.75, 292.167, 235.942, 292.167, 256);
  curveTo(dot, 292.167, 276.058, 275.975, 292.25, 255.917, 292.25);
  outline.holes.push(dot);

  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 48,
  });
  geometry.center();

  // The brand gradient, baked per vertex along the mark's own diagonal, so it
  // travels across the shape the way the 2D logo's linearGradient does.
  const position = geometry.attributes.position!;
  const from = new THREE.Vector2(sx(61), sy(88.5));
  const axis = new THREE.Vector2(sx(428.5), sy(430)).sub(from);
  const span = axis.lengthSq();
  const colors = new Float32Array(position.count * 3);
  const point = new THREE.Vector2();
  const colour = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    point.set(position.getX(i), position.getY(i)).sub(from);
    colour.copy(LIME).lerp(TEAL, THREE.MathUtils.clamp(point.dot(axis) / span, 0, 1));
    colours(colors, i, colour);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function colours(target: Float32Array, index: number, colour: THREE.Color): void {
  target[index * 3] = colour.r;
  target[index * 3 + 1] = colour.g;
  target[index * 3 + 2] = colour.b;
}

const FONT = 'Inter, -apple-system, "Helvetica Neue", Arial, sans-serif';
/** Canvas pixels per world unit — enough that type stays crisp at 1080p. */
const PX_PER_UNIT = 300;

/**
 * A line of text, drawn once into a canvas and shown on a plane.
 *
 * There is no DOM in a scene, so type has to become a texture. Drawing it once
 * in the builder (never per frame) keeps the render deterministic and cheap.
 */
function label(text: string, size: number, weight: number, colour: string): THREE.Mesh {
  const font = weight + " " + size + "px " + FONT;
  const pad = Math.round(size * 0.35);
  const measure = new OffscreenCanvas(8, 8).getContext("2d")!;
  measure.font = font;
  const width = Math.ceil(measure.measureText(text).width) + pad * 2;
  const height = Math.ceil(size * 1.4) + pad * 2;

  const canvas = new OffscreenCanvas(width, height);
  const g = canvas.getContext("2d")!;
  g.font = font;
  g.fillStyle = colour;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width / PX_PER_UNIT, height / PX_PER_UNIT),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height } = ctx;

  scene.background = new THREE.Color("#ffffff");
  // The floor grid fades into the background rather than ending in a hard
  // line, which is what the fog is for.
  scene.fog = new THREE.Fog("#ffffff", 7, 17);

  const logo = new THREE.Mesh(
    logoGeometry(),
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.25,
      metalness: 0.15,
    }),
  );
  logo.scale.setScalar(0.62);

  const title = label("Welcome to your video project", 96, 600, "#111114");
  const body = label("Every frame here is a Three.js scene, drawn by your agent.", 46, 400, "#5c5c66");
  const hint = label("Ask your agent to build your video", 46, 500, "#111114");

  // Every object the user can see is named, which is what lets them click it
  // in the preview and ask you about it — the name is the id the editor sends
  // back. Named after what it is on screen, not what it is made of.
  logo.name = "logo";
  title.name = "title";
  body.name = "body";
  hint.name = "hint";

  const group = new THREE.Group();
  group.name = "welcome-card";
  logo.position.y = 1.4;
  title.position.y = -0.45;
  body.position.y = -0.95;
  hint.position.y = -1.5;
  group.add(logo, title, body, hint);

  const grid = new THREE.GridHelper(40, 40, "#d4d4dd", "#e6e6ee");
  grid.position.y = -3.4;
  // Scenery: nobody clicking the preview means the floor, so it is kept out of
  // the selection overlay rather than sitting under every other pick.
  grid.userData.pickable = false;
  scene.add(group, grid);

  scene.add(
    new THREE.AmbientLight(0xffffff, 1.4),
    lightAt(new THREE.DirectionalLight(0xffffff, 2.2), 4, 5, 6),
    lightAt(new THREE.DirectionalLight(0xffffff, 1.1), -5, -2, 3),
  );

  camera.position.set(0, 0.35, 7);
  camera.lookAt(0, 0, 0);

  // Portrait and square frames are narrower than the copy is wide, so the
  // whole card is scaled — and re-centred on its own contents — to fit
  // whatever the camera can actually see.
  const visibleHeight = 2 * Math.tan((50 * Math.PI) / 360) * camera.position.length();
  const visibleWidth = visibleHeight * (width / height);
  const box = new THREE.Box3().setFromObject(group);
  const bounds = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const fit = Math.min(
    (visibleWidth * 0.86) / bounds.x,
    (visibleHeight * 0.86) / bounds.y,
    1,
  );
  group.scale.setScalar(fit);
  group.position.y = -centre.y * fit;

  // Nothing animates in or out: the card is whole from the first frame, so a
  // thumbnail, a paused preview and frame one all show the same thing. The
  // only motion is the mark turning.
  return ({ time }) => {
    logo.rotation.y = time * 0.7;
    logo.rotation.x = Math.sin(time * 0.6) * 0.12;
  };
}

function lightAt(light: THREE.DirectionalLight, x: number, y: number, z: number): THREE.DirectionalLight {
  light.position.set(x, y, z);
  return light;
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
- **Name everything the user can see** — \`mesh.name = "hero-logo"\`. This is
  what makes the preview clickable; see below.
- **Check your work** with the \`validate_scene\` tool before you finish. It
  compiles and loads the scene, but — unlike the React engine — it cannot
  render WebGL output in Node. Follow up with \`capture_frames\` to see what
  the scene actually draws.

## Naming: how the user points at things

A React scene is a DOM tree, so the editor can let the user click a heading and
tell you \`#hero-title\`. This scene is one \`<canvas>\`, which has nothing in
it to click. So the editor projects your scene graph: every frame it takes each
object's box, projects it through the camera, and lays an invisible element over
it. Click, marquee select, the comment bubble and the Draw tool all read those.

**The id the user's click sends you is \`object.name\`.** Set it on everything
that is a thing in the picture, and a message like "make this bigger" arrives as
\`#stat-card-2\` — a string you can search the scene for. Leave names unset and
the same click arrives as \`#Mesh-7\`, which is numbered by traversal order and
changes the moment you add a mesh above it.

\`\`\`ts
const logo = new THREE.Mesh(logoGeometry(), brandMaterial());
logo.name = "hero-logo";

const card = new THREE.Group();
card.name = "stat-card";          // the whole card, as one thing
card.add(label, value, plinth);    // each named too — a click takes the innermost
scene.add(logo, card);
\`\`\`

- **Name for what it is on screen**, not what it is made of: \`price-tag\`,
  \`earth\`, \`chart-bar-3\` — never \`mesh1\`, \`geo\`, \`obj\`.
- **Lower-case, hyphenated, unique within the scene, and stable across edits.**
  The user may have selected something before asking you to change it; renaming
  it mid-conversation loses that thread. Two objects sharing a name get
  suffixed (\`card\`, \`card-2\`), which is worse than naming them apart.
- **Name groups as well as their contents.** A named group is how the user
  grabs a composite thing ("move the whole card"); the innermost named object
  under the pointer wins a click, so both work.
- **Text is a thing too.** Type drawn into a canvas texture reads as a blank
  rectangle to the editor, so its name is the only clue anyone has about which
  line it is: name it after the words on it (\`headline\`, \`caption-price\`).

Two kinds of object cannot be measured from the CPU and so are skipped:
geometry a vertex shader places (an \`InstancedBufferGeometry\` on a plain mesh
is one prototype at the origin, scattered by per-instance attributes), and
anything smaller than a few pixels on screen. For the first, say where it draws
and it becomes selectable anyway:

\`\`\`ts
particles.name = "starfield";
particles.userData.pickBounds = new THREE.Box3(
  new THREE.Vector3(-8, -4.5, 0),
  new THREE.Vector3(8, 4.5, 0),
); // local space, the area the shader actually fills
\`\`\`

And the other way: \`object.userData.pickable = false\` takes an object and
everything under it out of the preview entirely. Use it for scenery nobody
would mean to select — a backdrop plane, a floor grid, helper geometry — so the
selection under the pointer is the subject rather than the wall behind it.

After any visual change, \`capture_frames\` reports what is selectable in the
frame it drew. Read that line: it is the list the user's pointer will see, and
placeholder names (\`#Mesh-7\`) in it are objects still waiting to be named.
`;

  return input.authoringGuide
    ? `${head}\n## Scene authoring\n\n${input.authoringGuide.trim()}\n`
    : head;
}
