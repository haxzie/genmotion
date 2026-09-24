import {
  ASSETS_DIR,
  COMPONENTS_DIR,
  INTERNAL_DIR,
  MANIFEST_FILE as MANIFEST,
  SCENES_DIR,
} from "./paths";

/**
 * Versions a new project declares. These are all host-provided at runtime (see
 * HOST_EXTERNALS) — they're in package.json so the user's editor, `tsc`, and
 * their own coding agent resolve real types, and so the folder is a truthful
 * npm project rather than one that only builds inside our app.
 */
export interface ScaffoldVersions {
  motion: string;
  react: string;
  gsap: string;
  three: string;
  threeTypes: string;
  lucide: string;
  typescript: string;
  reactTypes: string;
}

export const DEFAULT_VERSIONS: ScaffoldVersions = {
  motion: "^0.1.0",
  react: "^19.2.7",
  gsap: "^3.13.0",
  three: "^0.185.1",
  threeTypes: "^0.185.4",
  lucide: "^1.17.0",
  typescript: "^5.9.3",
  reactTypes: "^19.2.17",
};

export function renderPackageJson(
  projectName: string,
  versions: ScaffoldVersions = DEFAULT_VERSIONS,
): string {
  const pkg = {
    name: toPackageName(projectName),
    private: true,
    type: "module",
    scripts: {
      check: "tsc --noEmit",
    },
    dependencies: {
      "@genmotion/motion": versions.motion,
      gsap: versions.gsap,
      "lucide-react": versions.lucide,
      react: versions.react,
      three: versions.three,
    },
    devDependencies: {
      "@types/react": versions.reactTypes,
      "@types/three": versions.threeTypes,
      typescript: versions.typescript,
    },
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

/** npm package names are lowercase, URL-safe, and can't start with a dot or underscore. */
export function toPackageName(projectName: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^[-._]+|[-.]+$/g, "")
    .slice(0, 214);
  return slug || "genmotion-project";
}

export function renderTsconfig(): string {
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      lib: ["ES2022", "DOM"],
      module: "ESNext",
      moduleResolution: "bundler",
      jsx: "react-jsx",
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

/**
 * `ignore-scripts` is the important line: the agent can add packages, and a
 * postinstall script is arbitrary code execution on the user's machine.
 */
export function renderNpmrc(): string {
  return ["ignore-scripts=true", "auto-install-peers=false", ""].join("\n");
}

export function renderGitignore(): string {
  return ["node_modules/", `${INTERNAL_DIR}/cache/`, ".DS_Store", ""].join("\n");
}

/**
 * The scene a new project opens with, so the preview is never blank.
 *
 * It is a welcome card, not an example: the notice at the top of the file
 * tells the agent so, because the first thing it reads in a fresh project is
 * this scene, and a starter copied as a reference produces a video that looks
 * like the app rather than like what the user asked for. The logo is inline
 * SVG rather than an asset so the scaffold is one file, and so deleting the
 * scene leaves nothing behind.
 */
export function renderStarterScene(): string {
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
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "@genmotion/motion";
import { ImagePlus, MousePointerClick, Plug } from "lucide-react";

const CARDS = [
  {
    id: "card-select",
    Icon: MousePointerClick,
    title: "Click to edit",
    body: "Select any element on the video preview to quickly edit it.",
  },
  {
    id: "card-assets",
    Icon: ImagePlus,
    title: "Drop your assets",
    body: "Drag and drop images, videos and other assets to ask the agent to include them in a scene.",
  },
  {
    id: "card-mcp",
    Icon: Plug,
    title: "Connect MCPs",
    body: "Connect MCPs to your agent to generate images, videos and more.",
  },
];

function Logo({ rotation, size }: { rotation: number; size: number }) {
  return (
    <svg
      id="logo"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      style={{ transform: \`rotate(\${rotation}deg)\` }}
    >
      <defs>
        <linearGradient
          id="logo-gradient"
          x1="61"
          y1="88.5"
          x2="428.5"
          y2="430"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C6F91E" />
          <stop offset="1" stopColor="#16F5BD" />
        </linearGradient>
      </defs>
      <path
        d="M280.083 111.725V38.5C280.083 25.2083 269.208 14.3333 255.917 14.3333C179.55 14.3333 118.65 108.1 111.642 231.833H38.4167C25.125 231.833 14.25 242.708 14.25 256C14.25 332.367 108.017 393.267 231.75 400.275V473.5C231.75 486.792 242.625 497.667 255.917 497.667C332.283 497.667 393.183 403.9 400.192 280.167H473.417C486.708 280.167 497.583 269.292 497.583 256C497.583 179.633 403.817 118.733 280.083 111.725ZM255.917 292.25C235.858 292.25 219.667 276.058 219.667 256C219.667 235.942 235.858 219.75 255.917 219.75C275.975 219.75 292.167 235.942 292.167 256C292.167 276.058 275.975 292.25 255.917 292.25Z"
        fill="url(#logo-gradient)"
      />
    </svg>
  );
}

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  // One full turn every 6 seconds, driven purely by the frame clock.
  const rotation = (frame / (fps * 6)) * 360;

  // Every size below is a fraction of the frame's width, so this reads the
  // same at 1080x1920 as it does at 1920x1080. The ratios are the 16:9 pixel
  // values divided by 1920, so nothing moves at the default size.
  const px = (ratio: number) => Math.round(width * ratio);
  const logoTile = px(0.0625);
  const cardPad = px(0.0167);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
        gap: px(0.0104),
        fontFamily: "Inter, sans-serif",
      }}
    >
      <svg
        id="bg-grid"
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          inset: 0,
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 40%, transparent 100%)",
        }}
      >
        <defs>
          <pattern id="dotted-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0.5" x2="80" y2="0.5" stroke="#c7c7cf" strokeWidth="1" strokeDasharray="2 4" />
            <line x1="0.5" y1="0" x2="0.5" y2="80" stroke="#c7c7cf" strokeWidth="1" strokeDasharray="2 4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotted-grid)" />
      </svg>

      <div
        id="logo-tile"
        style={{
          width: logoTile,
          height: logoTile,
          borderRadius: Math.round(logoTile * 0.28),
          backgroundColor: "#0b0b10",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: px(0.00625),
          boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
          position: "relative",
        }}
      >
        <Logo rotation={rotation} size={Math.round(logoTile * 0.6)} />
      </div>

      <h1
        id="hero-title"
        style={{
          margin: 0,
          position: "relative",
          fontSize: px(0.025),
          fontWeight: 500,
          color: "#111114",
          letterSpacing: "-0.02em",
        }}
      >
        Welcome to your first scene 🎉
      </h1>
      <p
        id="hero-subtitle"
        style={{ margin: 0, position: "relative", fontSize: px(0.0146), color: "#5c5c66" }}
      >
        Ask your agent to edit the video
      </p>

      <div
        id="cards"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          // Wraps rather than running off both edges of a portrait or square
          // frame, where three cards in a row have nowhere to go.
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "92%",
          gap: px(0.0125),
          marginTop: px(0.0229),
        }}
      >
        {CARDS.map(({ id, Icon, title, body }) => (
          <div
            key={id}
            id={id}
            style={{
              width: px(0.2292),
              padding: \`\${cardPad}px \${cardPad}px \${Math.round(cardPad * 1.1)}px\`,
              borderRadius: px(0.0104),
              backgroundColor: "#ffffff",
              border: "1px solid #e4e4ea",
              boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: Math.round(cardPad * 0.44),
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: px(0.0375),
                height: px(0.0375),
                borderRadius: px(0.009),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: px(0.003),
              }}
            >
              <Icon size={px(0.025)} color="#16a34a" strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: px(0.0156), fontWeight: 500, color: "#111114", letterSpacing: "-0.01em" }}>
              {title}
            </div>
            <div style={{ fontSize: px(0.0146), lineHeight: 1.35, color: "#5c5c66" }}>{body}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
`;
}

/**
 * The project's own instructions file. Claude Code reads it when the user opens
 * the folder themselves; Codex reads it as part of every turn (which is how the
 * authoring rules reach a model whose base prompt we deliberately don't
 * override). `authoringGuide` is the shared scene-authoring guide — passed in
 * so this package doesn't depend on the agent package, and so there stays
 * exactly one copy of those rules.
 */
export function renderAgentsMd(input: {
  projectName: string;
  authoringGuide?: string;
}): string {
  const head = `# ${input.projectName}

A GenMotion video project. Scenes are React components rendered frame by frame
and encoded to MP4 — every frame must be a pure function of its frame index.

## Layout

| Path | What it is |
|---|---|
| \`${MANIFEST}\` | The timeline: fps, dimensions, scene order and durations, audio placement. Edit it to reorder, retime, or add scenes. |
| \`${SCENES_DIR}/\` | One default-exported React component per file. Order comes from \`${MANIFEST}\`, not the filename. |
| \`${COMPONENTS_DIR}/\` | Shared pieces. Factor anything used twice into here. |
| \`${ASSETS_DIR}/\` | Images, audio, video. Import them (\`import logo from "../${ASSETS_DIR}/logo.png"\`) rather than hard-coding URLs. |
| \`${INTERNAL_DIR}/\` | App state. Don't edit. |

## Rules

- **Deterministic only.** No \`Math.random\`, \`Date.now\`, \`new Date()\`, timers,
  \`requestAnimationFrame\`, \`fetch\`, or direct \`document\`/\`window\` access. Use
  \`random(seed)\` from \`@genmotion/motion\` and drive everything from
  \`useCurrentFrame()\`. Validation rejects scenes that break this.
- **No CSS transitions or animations.** The renderer seeks to a frame and
  screenshots it; anything animating on wall-clock time will not be there.
- **Adding a scene** means writing the file *and* adding an entry to
  \`${MANIFEST}\`. A file nothing references is not in the video.
- **Assets are local.** Import them from \`${ASSETS_DIR}/\` and use the imported
  value as the \`src\`. Never hot-link a remote URL from scene code: the link
  rots or the host blocks the renderer, and the finished video gets a hole in
  it. Use the \`save_asset\` tool to copy a remote file in first.
- **New packages** go through the \`add_package\` tool, not \`npm install\` — it
  screens for browser safety and installs without running lifecycle scripts.
  \`react\`, \`@genmotion/motion\`, \`gsap\`, \`three\`, and \`lucide-react\` are
  already available and supplied by the host at runtime.
- **3D goes through \`<ThreeScene>\`** from \`@genmotion/motion\`, never a
  hand-rolled \`WebGLRenderer\` and never \`setAnimationLoop\`. The component
  owns the canvas, the pixel ratio the export captures at, and one render per
  frame; a scene that starts its own loop animates in the preview and comes out
  frozen. \`three/addons\` (OrbitControls, loaders) is NOT available — the host
  supplies the main \`three\` module only.
- **Check your work** with the \`validate_scene\` tool before you finish. It
  compiles the scene, loads it, and renders three frames.
`;

  return input.authoringGuide
    ? `${head}\n## Scene authoring\n\n${input.authoringGuide.trim()}\n`
    : head;
}
