import { ASSETS_DIR, INTERNAL_DIR, MANIFEST_FILE, SCENES_DIR } from "./paths";
import type { ProjectEngine } from "./schema";

/**
 * The lines every project's `.gitignore` needs, whatever engine it is written
 * for.
 *
 * `.genmotion/` is the one that matters: it holds `chat.jsonl` — the whole
 * transcript of the user's conversation with their agent — alongside the
 * session id. A project folder is published to GitHub from inside the app, so
 * an ignore rule that covers only `.genmotion/cache/` is the difference
 * between sharing a video and sharing everything the user ever said about it.
 * The whole directory is app-owned state; none of it is meant to travel.
 *
 * `exports/` is the same argument with lower stakes: rendered MP4s are output,
 * they are large, and they can be made again from the source beside them.
 *
 * `.agents/` holds symlinks into this machine's copy of the app's skill pack,
 * written into every project as it opens — whatever engine it is (see
 * `linkSkillsIntoProject`). They resolve to nothing on anyone else's computer,
 * so committing them is at best noise and at worst a project that shows a
 * change to push the moment it is opened and never stops.
 */
export const SHARED_GITIGNORE = [
  "node_modules/",
  `${INTERNAL_DIR}/`,
  ".agents/",
  "exports/",
  ".DS_Store",
] as const;

/**
 * Render a `.gitignore` from the shared lines plus whatever an engine adds.
 *
 * Kept as one function so a line added for safety's sake cannot be added to
 * two of the three scaffolds and forgotten in the third.
 */
export function renderGitignoreLines(extra: readonly string[] = []): string {
  return [...SHARED_GITIGNORE, ...extra, ""].join("\n");
}

/**
 * Lines missing from an existing `.gitignore`, in the order they should be
 * appended.
 *
 * Used before a project is published for the first time: an older folder was
 * scaffolded when `.genmotion/cache/` was the whole rule, and its first commit
 * would otherwise carry the transcript. Appending is deliberate — the file may
 * have the user's own rules in it, and rewriting it would throw them away.
 *
 * A line counts as present if it appears verbatim, or if a broader rule the
 * scaffold itself writes already covers it (`.genmotion/` covers
 * `.genmotion/cache/`). Anything cleverer would mean implementing gitignore
 * semantics, which is `git check-ignore`'s job, not ours.
 */
export function missingGitignoreLines(
  existing: string,
  wanted: readonly string[] = SHARED_GITIGNORE,
): string[] {
  const present = new Set(
    existing
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const covers = (line: string) =>
    present.has(line) ||
    // `foo/` in the file also covers a wanted `foo/bar/`.
    [...present].some((rule) => rule.endsWith("/") && line.startsWith(rule));
  return wanted.filter((line) => !covers(line));
}

/**
 * The README a new project is born with.
 *
 * It exists to be read: someone lands on the repo — from a share, a search,
 * their own GitHub history a year later — and needs to know what the folder is
 * and how to open it. The link to genmotion.dev at the end is the honest
 * version of an attribution line, and it survives because the rest of the file
 * is worth keeping.
 *
 * Deliberately short. A README that restates AGENTS.md is one nobody finishes,
 * and the agent already has AGENTS.md.
 */
export function renderReadme(input: {
  projectName: string;
  engine?: ProjectEngine;
}): string {
  const engine = input.engine ?? "react";
  return `# ${input.projectName}

A motion video, written as code. The frames are a pure function of time, so the
preview and the exported MP4 are the same thing rendered twice.

## Open it

Install [GenMotion](https://genmotion.dev), then from this folder:

\`\`\`sh
genmotion .
\`\`\`

That opens the project, plays it, and gives your coding agent the context to
edit it. Export to MP4 from the editor.

## What's in here

| Path | |
| --- | --- |
${structureRows(engine)}

${engineNote(engine)}

---

Built with [GenMotion](https://genmotion.dev) — an AI motion video studio.
`;
}

function structureRows(engine: ProjectEngine): string {
  const rows: [string, string][] =
    engine === "hyperframes"
      ? [
          ["`index.html`", "the timeline — one slot per scene"],
          [`\`${SCENES_DIR}/\``, "one HTML sub-composition per scene"],
          [`\`${ASSETS_DIR}/\``, "images, audio, video the scenes reference"],
          [`\`${MANIFEST_FILE}\``, "name, resolution, frame rate"],
          ["`AGENTS.md`", "how to edit this project, for a coding agent"],
        ]
      : [
          [
            `\`${SCENES_DIR}/\``,
            engine === "three"
              ? "one module per scene, drawing into a Three.js canvas"
              : "one React component per scene",
          ],
          [`\`${ASSETS_DIR}/\``, "images, audio, video the scenes reference"],
          [`\`${MANIFEST_FILE}\``, "the scene order, durations, resolution, frame rate"],
          ["`AGENTS.md`", "how to edit this project, for a coding agent"],
        ];
  return rows.map(([path, what]) => `| ${path} | ${what} |`).join("\n");
}

function engineNote(engine: ProjectEngine): string {
  if (engine === "hyperframes") {
    return "Scenes are [HyperFrames](https://github.com/heygen-com/hyperframes) HTML compositions: one paused GSAP timeline per scene, seeked frame by frame.";
  }
  if (engine === "three") {
    return "Scenes draw into a Three.js canvas and are seeked frame by frame — no clocks, no `requestAnimationFrame`.";
  }
  return "Scenes are React components that render from the current frame — no clocks, no CSS transitions.";
}
