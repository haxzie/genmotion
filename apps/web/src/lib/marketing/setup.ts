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
 * Pasted into any coding agent (Claude Code, Codex, Cursor) in an empty
 * folder. Written as instructions to the agent, not the reader, and kept to
 * commands that exist in the published CLI.
 */
export const SETUP_PROMPT = `Set up a GenMotion video project in this folder and help me make a video.

1. Run \`npx @genmotion/cli@latest init my-video --yes\` (add \`--size portrait\` for a vertical video), then \`cd my-video && npm install\`.
2. Read \`AGENTS.md\` and the \`genmotion\` and \`genmotion-skills\` skills in \`.claude/skills/\`.
3. Ask me what the video is for, how long it should be and where it will be shown, unless I already told you.
4. Run \`npx @genmotion/cli skills search "<my request>"\`, pick the one skill that owns this kind of video, follow it, and record the choice in \`VIDEO.md\`.
5. Build the scenes. Before telling me it is done, run \`npx @genmotion/cli check\` and \`npx @genmotion/cli still --at 50%\` and look at the frames.
6. Start a preview I can open with \`npx @genmotion/cli dev --background\`. Render the MP4 with \`npx @genmotion/cli render\` when I ask.

Docs: https://genmotion.dev/docs`;
