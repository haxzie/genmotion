/**
 * Sequel × reference look. The palette is sampled from the reference film
 * (electric blue halftone, navy terminal); the logo, CLI and agents are Sequel's.
 */
import claudeUrl from "../assets/icons/claude.svg";
import cursorUrl from "../assets/icons/cursor.svg";
import vscodeUrl from "../assets/icons/vscode.svg";
import codexUrl from "../assets/icons/codex.svg";
import openclawUrl from "../assets/icons/openclaw.svg";
import hermesUrl from "../assets/icons/hermes.svg";
import windsurfUrl from "../assets/icons/windsurf.svg";
import sequelUrl from "../assets/icons/sequel.svg";
import interUrl from "../assets/InterVariable.woff2";
import monoUrl from "../assets/JetBrainsMono-Regular.woff2";

export const C = {
  // pink -> orange field (the halftone runs a diagonal gradient between these)
  field: "#de1d5e",
  field2: "#ea5a1e",
  lift: "#ff7d9f", // lifted field tone under bright patches
  dot: "#ffd9c2", // halftone ink: warm peach
  term: "#1c1418", // terminal glass: warm plum-black
  termTop: "#22181d",
  termRim: "#4a2f3a",
  text: "#f3ebe8",
  dim: "#a08a90",
  ready: "#ffb07a",
  accent: "#ff8a3d", // bracket, diamond, prompt bar
  check: "#ffc857",
  select: "#e91e63",
  chip: "#f2541b",
  dock: "#ffd0c0",
  dock2: "#ffb39e",
  dockRim: "#ffe6dc",
  shadow: "#5a0a24",
  tile: "#2433f0",
  pill: "#fff5f0",
  pill2: "#ffe2d6",
  pillText: "#1a0d12",
} as const;

export const FONT_SANS = "Inter";
export const FONT_MONO = "JetBrains Mono";
export const FONTS = [
  { family: FONT_SANS, url: interUrl },
  { family: FONT_MONO, url: monoUrl },
];

export const SEQUEL_ICON = sequelUrl;
/** The logo's own gradient (from the sequel.sh mark): pink top-left -> blue bottom-right. */
export const LOGO_GRADIENT = { from: "#F91E5C", to: "#2D3CE0", dir: [245, -372] as [number, number] };

/** The agents `sequel install` supports (real slugs from @sequelsh/cli). */
export const AGENTS = [
  { slug: "claude-code", name: "Claude Code", icon: claudeUrl, bg: "#2b2a27", inset: 0.2 },
  { slug: "cursor", name: "Cursor", icon: cursorUrl, bg: "#ffffff", inset: 0.2 },
  { slug: "vscode", name: "VS Code", icon: vscodeUrl, bg: "#17181c", inset: 0.22 },
  { slug: "codex", name: "Codex", icon: codexUrl, bg: "#000000", inset: 0.2 },
  { slug: "openclaw", name: "OpenClaw", icon: openclawUrl, bg: "#e5322d", inset: 0.16 },
  { slug: "hermes", name: "Hermes", icon: hermesUrl, bg: "#ffffff", inset: 0.14 },
  { slug: "windsurf", name: "Windsurf", icon: windsurfUrl, bg: "#ffffff", inset: 0.2 },
] as const;

export const COMMAND = "npx @sequelsh/cli install";
export const TAGLINE = "give your agents live marketing data";
