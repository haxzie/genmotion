/**
 * How people get GenMotion running: the commands and the prompt the home page
 * copies. One module so the download page, the docs (`content/docs/*.md`, as
 * `{{TOKEN}}`s) and the hero button never quote two different commands for
 * the same step.
 */

/** The Studio's one-line installer (`scripts/install.sh`, served at this URL). */
export const STUDIO_INSTALL_COMMAND = "curl -fsSL https://genmotion.dev/install.sh | sh";

/** The CLI's fastest start: a new project, scaffolded and wired for agents. */
export const CLI_INIT_COMMAND = "npx @genmotion/cli@latest init my-video";

export const DOCS_PATH = "/docs";

/**
 * Pasted into any coding agent (Claude Code, Codex, OpenCode, Cursor) in an
 * empty folder. Written as instructions to the agent, not the reader, and kept
 * to commands that exist in the published CLI. It names the package outright:
 * agents that see a `genmotion` command go looking for a `genmotion` package,
 * which npm will never have (the name is refused as too close to `emotion`).
 */
export const SETUP_PROMPT = `Set up a GenMotion video project in this folder and help me make a video.

The CLI is the npm package \`@genmotion/cli\` (Node 22 or newer). It provides the \`genmotion\` command; there is no package called \`genmotion\`.

1. Run \`npx @genmotion/cli@latest init my-video --yes\` (add \`--size portrait\` for a vertical video), then \`cd my-video && npm install\`.
2. Read \`AGENTS.md\` and the \`genmotion\` and \`genmotion-skills\` skills in \`.claude/skills/\` (the same files are in \`.agents/skills/\`).
3. Ask me what the video is for, how long it should be and where it will be shown, unless I already told you.
4. Run \`npx @genmotion/cli skills search "<my request>"\`, pick the one skill that owns this kind of video, follow it, and record the choice in \`VIDEO.md\`.
5. Build the scenes. Before telling me it is done, run \`npx @genmotion/cli check\` and \`npx @genmotion/cli still --at 50%\` and look at the frames.
6. Start a preview I can open with \`npx @genmotion/cli dev --background\`. Render the MP4 with \`npx @genmotion/cli render\` when I ask.

Docs: https://genmotion.dev/docs`;

/** A catalog template as a new local project, from any terminal. */
export function templateRemixCommand(templateId: string): string {
  return `npx @genmotion/cli@latest init my-video --template ${templateId}`;
}

/**
 * The template page's "Copy prompt": the same hand-off as `SETUP_PROMPT`, but
 * the project starts as a copy of this template. The template's own
 * `AGENTS.md` describes how the video is built, which is what makes "change
 * the brand and the copy" a small job instead of a rewrite.
 */
export function templateRemixPrompt(template: { id: string; title: string }): string {
  return `Remix the GenMotion template "${template.title}" into a video of my own, in this folder.

The CLI is the npm package \`@genmotion/cli\` (Node 22 or newer). It provides the \`genmotion\` command; there is no package called \`genmotion\`.

1. Run \`${templateRemixCommand(template.id)} --yes\`, then \`cd my-video && npm install\`. This copies the template's scenes, components and assets into a new project. No account is needed.
2. Read \`AGENTS.md\` (it describes how this video is built) and the \`genmotion\` skill in \`.claude/skills/\` (the same files are in \`.agents/skills/\`). Run \`npx @genmotion/cli info\` to see the scenes and their timing.
3. Start a preview I can open with \`npx @genmotion/cli dev --background\` and give me the URL.
4. Ask me what to change: the product or brand, the copy, colors, logo, length and size. Keep the template's structure and motion unless I ask otherwise.
5. Make the changes. Before telling me it is done, run \`npx @genmotion/cli check\` and \`npx @genmotion/cli still --at 50%\` and look at the frames.
6. Render the MP4 with \`npx @genmotion/cli render\` when I ask.

Template: https://genmotion.dev/templates/${template.id}
Docs: https://genmotion.dev/docs`;
}
