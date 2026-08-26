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
  lucide: string;
  typescript: string;
  reactTypes: string;
}

export const DEFAULT_VERSIONS: ScaffoldVersions = {
  motion: "^0.1.0",
  react: "^19.2.7",
  gsap: "^3.13.0",
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
    },
    devDependencies: {
      "@types/react": versions.reactTypes,
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

export function renderStarterScene(): string {
  return `import {
  AbsoluteFill,
  TextAnimation,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";

export default function Scene() {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [30, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "#0b0b10",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ fontSize: 112, fontWeight: 700, color: "#f5f5f7", letterSpacing: "-0.03em" }}>
        <TextAnimation text="Your first scene" by="word" preset="fadeUp" />
      </div>
      <div style={{ opacity: fade, fontSize: 32, color: "#8a8a93" }}>
        Ask the agent to change it.
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
  \`react\`, \`@genmotion/motion\`, \`gsap\`, and \`lucide-react\` are already
  available and supplied by the host at runtime.
- **Check your work** with the \`validate_scene\` tool before you finish. It
  compiles the scene, loads it, and renders three frames.
`;

  return input.authoringGuide
    ? `${head}\n## Scene authoring\n\n${input.authoringGuide.trim()}\n`
    : head;
}
