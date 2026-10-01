/**
 * How people get GenMotion running: the commands, the prompt the home page
 * copies, and the docs page's sections. One module so the download page, the
 * docs and the hero button can never quote two different commands for the
 * same step.
 */

/** The Studio's one-line installer (`scripts/install.sh`, served at this URL). */
export const STUDIO_INSTALL_COMMAND = "curl -fsSL https://genmotion.dev/install.sh | sh";

/** The CLI's fastest start: a new project, scaffolded and wired for agents. */
export const CLI_INIT_COMMAND = "npx genmotion@latest init my-video";

export const DOCS_PATH = "/docs";

/**
 * Pasted into any coding agent (Claude Code, Codex, Cursor) in an empty
 * folder. Written as instructions to the agent, not the reader, and kept to
 * commands that exist in the published CLI.
 */
export const SETUP_PROMPT = `Set up a GenMotion video project in this folder and help me make a video.

1. Run \`npx genmotion@latest init my-video --yes\` (add \`--size portrait\` for a vertical video), then \`cd my-video && npm install\`.
2. Read \`AGENTS.md\` and the \`genmotion\` and \`genmotion-skills\` skills in \`.claude/skills/\`.
3. Ask me what the video is for, how long it should be and where it will be shown, unless I already told you.
4. Run \`npx genmotion skills search "<my request>"\`, pick the one skill that owns this kind of video, follow it, and record the choice in \`VIDEO.md\`.
5. Build the scenes. Before telling me it is done, run \`npx genmotion check\` and \`npx genmotion still --at 50%\` and look at the frames.
6. Start a preview I can open with \`npx genmotion dev --background\`. Render the MP4 with \`npx genmotion render\` when I ask.

Docs: https://genmotion.dev/docs`;

export interface DocSection {
  id: string;
  title: string;
  /** Markdown, rendered by `Prose`. */
  body: string;
}

/**
 * The docs page, top to bottom. Each section is its own anchor in the
 * sidebar, so keep ids stable: people link to them.
 */
export const DOC_SECTIONS: DocSection[] = [
  {
    id: "overview",
    title: "Two ways to use GenMotion",
    body: `GenMotion comes in two forms that make the same videos from the same project folders.

| | **GenMotion Studio** | **genmotion CLI** |
| --- | --- | --- |
| What it is | A desktop app: chat, frame-accurate preview, timeline, export | A command-line tool and MCP server on npm |
| Runs on | macOS on Apple silicon | Any machine with Node 22 or newer (tested on macOS and Linux) |
| Your agent | Claude Code or Codex, driven from the app's chat | Any coding agent: Claude Code, Codex, Cursor, or your own terminal |
| Export | One click, from the editor | \`npx genmotion render\` |
| Account | Free plan, no card | None |

A project made in one opens in the other. Start with the Studio if you want an editor you can see and click. Start with the CLI if you already live in a terminal or a coding agent.`,
  },
  {
    id: "studio",
    title: "Install the Studio",
    body: `**Requirements:** macOS on Apple silicon (M1 or later), and [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or [Codex](https://github.com/openai/codex) installed and signed in. Intel Macs are not supported.

**Option 1: the installer.** In Terminal:

\`\`\`sh
${STUDIO_INSTALL_COMMAND}
\`\`\`

It downloads the latest signed build into \`/Applications\` and adds the \`genmotion\` command to your shell.

**Option 2: the disk image.** Download the \`.dmg\` from the [download page](/download), open it, and drag GenMotion into Applications.

**First launch**

1. Open GenMotion. Every build is signed and notarized by Apple, so it opens without a security warning.
2. Sign in from the welcome screen. The free plan needs no card.
3. GenMotion finds the Claude Code or Codex CLI on your machine. If neither is installed, install one first:

\`\`\`sh
npm install -g @anthropic-ai/claude-code   # then run: claude
npm install -g @openai/codex               # then run: codex
\`\`\`

4. Create a project, or open an existing folder. From a terminal, \`genmotion .\` opens the current folder in the app and shares it with the agent.

**Updates.** The app checks for a new version when it starts and asks before downloading anything. \`genmotion upgrade\` does the same from the terminal.`,
  },
  {
    id: "cli",
    title: "Install the CLI",
    body: `**Requirements:** Node 22 or newer. Nothing else: the CLI downloads a headless Chromium and ffmpeg the first time it renders.

Create a project:

\`\`\`sh
${CLI_INIT_COMMAND}
cd my-video
npm install
\`\`\`

\`npm create genmotion@latest my-video\` does the same thing. Useful flags for \`init\`:

| Flag | What it does |
| --- | --- |
| \`--size portrait\` | 1080×1920 for Reels, Shorts and TikTok. Also \`landscape\`, \`square\`, \`4k\` or \`WIDTHxHEIGHT\` |
| \`--fps 60\` | Frame rate (default 30) |
| \`--template <id>\` | Start from a template in the catalog (\`npx genmotion templates\` lists them) |
| \`--yes\` | Never ask a question |

Then, from inside the project:

\`\`\`sh
npm run dev       # live studio at http://localhost:4200, reloads on save
npm run check     # compiles every scene and renders each one headlessly
npm run render    # writes exports/my-video.mp4
\`\`\`

Check the machine with \`npx genmotion doctor\`. It reports Node, ffmpeg, Chromium and WebGL, and says how to fix anything missing.`,
  },
  {
    id: "agents",
    title: "Connect your coding agent",
    body: `A project made with \`genmotion init\` is already set up for agents:

| File | Read by |
| --- | --- |
| \`AGENTS.md\` | Codex, Cursor and most agents: the scene rules and the commands |
| \`CLAUDE.md\` | Claude Code (it imports \`AGENTS.md\`) |
| \`.mcp.json\`, \`.cursor/mcp.json\` | Claude Code and Cursor: the \`genmotion\` MCP server |
| \`.claude/skills/\`, \`.agents/skills/\` | The make-a-video workflow and the skill router |

Open your agent in the project folder and describe the video. Nothing else to configure.

**Claude Code, from anywhere.** Install the plugin and every Claude Code session can make videos, project or not:

\`\`\`sh
claude plugin marketplace add haxzie/genmotion
claude plugin install genmotion@genmotion
\`\`\`

**Add the MCP server by hand** to any other client:

\`\`\`sh
claude mcp add genmotion -- npx -y genmotion mcp
codex mcp add genmotion -- npx -y genmotion mcp
\`\`\`

Or, in any MCP client's config: \`{ "command": "npx", "args": ["-y", "genmotion", "mcp"] }\`.

The server gives the agent tools rather than more instructions to read: \`search_skills\`, \`get_skill\`, \`project_overview\`, \`add_scene\`, \`check_project\`, \`capture_frames\` (which returns the frames as images the agent can look at), \`render_video\`, \`save_asset\` and \`add_package\`.`,
  },
  {
    id: "setup-prompt",
    title: "The setup prompt",
    body: `Don't want to run anything yourself? Paste this into Claude Code, Codex or Cursor in an empty folder. The agent installs the project, picks the right skill for your video and walks you through it. The home page's **Copy prompt** button copies the same text.

\`\`\`text
${SETUP_PROMPT}
\`\`\``,
  },
  {
    id: "first-video",
    title: "Make your first video",
    body: `1. **Describe it.** "A 20-second launch video for our notes app, 16:9, dark and confident." Say who it's for and where it will run. Leave out anything you don't care about.
2. **Let the agent pick a skill.** It searches GenMotion's skills for the one that owns this kind of video and writes the choice to \`VIDEO.md\`.
3. **Watch it build.** Open \`npm run dev\` (or the Studio). The preview reloads every time a scene is saved.
4. **Give notes.** "Make the logo land a beat later", "the headline is too small on mobile". Notes about specific frames work best.
5. **Export.** \`npm run render\`, or Export in the Studio. The MP4 is frame-for-frame what you previewed.`,
  },
  {
    id: "skills",
    title: "Skills",
    body: `Skills tell the agent how to make a specific kind of video. One skill owns each video type, and craft skills are loaded alongside it.

| Video type | Skill |
| --- | --- |
| Product launch film | \`launch-playbook\` |
| Feature or changelog announcement | \`announce-feature\` |
| A milestone, a number, a funding round | \`announce-milestone\` |
| Explainer: a concept, process or comparison | \`explainer\` |
| Logo reveal or bumper | \`brand-sting\` |
| App Store or Google Play preview | \`app-store-preview\` |
| Guided product walkthrough | \`demo-walkthrough\` |
| Vertical social ads | \`ugc-screen-demo\`, \`ugc-problem-solution\`, \`ugc-unboxing\`, \`ugc-green-screen\` |
| Anything else | \`freeform-video\` |

Craft skills for Three.js projects: \`three-camera\`, \`three-type\`, \`three-transitions\`, \`three-assets\`, \`three-look\`.

\`\`\`sh
npx genmotion skills search "explainer about how our sync works"
npx genmotion skills show explainer
npx genmotion skills add explainer    # copies it and what it needs into the project
\`\`\``,
  },
  {
    id: "project",
    title: "What's in a project",
    body: `| Path | What it is |
| --- | --- |
| \`project.json\` | The timeline: size, frame rate, scene order and lengths, audio |
| \`scenes/\` | One file per scene. Three.js scenes are TypeScript modules that draw each frame from the time they're given |
| \`components/\` | Pieces shared between scenes: type styles, palettes, logos |
| \`assets/\` | Images, audio, video and fonts the scenes use |
| \`VIDEO.md\` | The brief and the chosen skill, so the next session picks up where this one left off |
| \`exports/\` | Rendered videos |

Every frame is a pure function of time: no clocks, no randomness. That's why the preview, the check and the export always agree.`,
  },
  {
    id: "commands",
    title: "CLI reference",
    body: `Every command accepts \`--json\` and prints a single JSON object, which is how agents read the results.

| Command | What it does |
| --- | --- |
| \`genmotion init [dir]\` | Create a project (\`--size\`, \`--fps\`, \`--template\`, \`--yes\`) |
| \`genmotion dev\` | Live studio with play, scrub and scene chips. \`--background\`, \`--status\`, \`--stop\`, \`--open\` |
| \`genmotion check\` | Compile, determinism rules, and a headless render of each scene's first, middle and last frame. \`--static\` skips the browser |
| \`genmotion still --at 1.5s\` | Save frames as images. Repeat \`--at\` for several. Times: \`45\`, \`1.5s\`, \`500ms\`, \`60%\` |
| \`genmotion render [out]\` | Render the video (see Rendering below) |
| \`genmotion info\` | Size, frame rate, scenes and timing |
| \`genmotion scene add <name>\` | Create a scene and add it to \`project.json\`. \`--duration 4s\`, \`--after <scene>\` |
| \`genmotion skills <list\\|search\\|show\\|add>\` | Find and install skills |
| \`genmotion templates\` | List the template catalog |
| \`genmotion mcp\` | Run the MCP server |
| \`genmotion browser install\` | Download Chromium ahead of time |
| \`genmotion doctor\` | Check this machine can render |`,
  },
  {
    id: "rendering",
    title: "Rendering",
    body: `\`\`\`sh
npx genmotion render                      # exports/<project>.mp4
npx genmotion render teaser.webm          # the format follows the extension
npx genmotion render --codec gif --frames 0-89
npx genmotion render --scale 2            # 3840×2160 from a 1080p project
\`\`\`

| Flag | What it does |
| --- | --- |
| \`--codec\` | \`mp4\`, \`webm\`, \`gif\`, \`mov\` or \`png\` (a folder of frames) |
| \`--frames\` | Part of the video: \`0-89\`, \`1s-3s\`, \`120-\` |
| \`--scale\` | Output size multiplier |
| \`--quality\` / \`--crf\` | Encoder quality, 0 to 100, or an exact CRF |
| \`--concurrency\` | How many browser tabs render at once (default: half your cores) |
| \`--gl gpu\` | Use the GPU for WebGL. Faster. The default software renderer gives the same pixels on every machine |
| \`--no-audio\` | Skip the audio mix |

Rendering in parallel produces exactly the same frames as rendering in order, so turning up \`--concurrency\` never changes the result.`,
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: `**"No Chromium found."** The first render downloads one automatically. If your network blocks that, run \`npx genmotion browser install\` on a different network, or point \`GENMOTION_CHROMIUM\` at an installed Chrome.

**"ffmpeg not found."** It's also downloaded on first use. Set \`FFMPEG_PATH\` to use your own.

**Renders are slow.** Add \`--gl gpu\`, and raise \`--concurrency\` on a machine with more cores. The default software WebGL is slow but identical everywhere, which is what you want in CI.

**A scene renders blank.** Run \`npx genmotion check\`. It flags frames that are a single flat color, and says whether the camera is pointing away or the objects are unlit.

**"Not inside a GenMotion project."** Run the command from the project folder (any subfolder works), or pass \`--dir path/to/project\`.

**HyperFrames projects.** The CLI renders Three.js and React projects. HyperFrames projects open in the Studio.

**The \`genmotion\` command opens the app.** That's the Studio's launcher. It passes \`init\`, \`dev\`, \`render\`, \`check\` and the other CLI commands through to the CLI, so both work.`,
  },
];
