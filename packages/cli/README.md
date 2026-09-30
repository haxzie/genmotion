# genmotion

Make videos with code and coding agents. Scenes are Three.js modules that are
pure functions of time, so the live preview and the rendered MP4 are the same
frames. One CLI does everything: scaffold, preview, check, render. It also runs
an MCP server that gives your agent the same tools.

```sh
npx genmotion init my-video
cd my-video && npm install
npm run dev        # studio at http://localhost:4200, reloads on save
npm run render     # exports/my-video.mp4
```

Or `npm create genmotion my-video`.

Apache-2.0. No per-render fees, no license keys, no seat counts.

## Make a video with your agent

A new project already tells every agent what to do:

| File | Read by |
|---|---|
| `AGENTS.md` | Codex, Cursor, and anything that follows [agents.md](https://agents.md): scene rules, authoring guide, commands |
| `CLAUDE.md` | Claude Code (imports AGENTS.md) |
| `.mcp.json`, `.cursor/mcp.json` | Claude Code, Cursor: the `genmotion` MCP server |
| `.claude/skills/genmotion/`, `.agents/skills/genmotion/` | the make-a-video workflow as a skill |

Open your agent in the folder and describe the video. It writes the scenes,
runs `check`, looks at the frames, and renders.

To use it from anywhere, not just a project folder, install the Claude Code plugin:

```sh
claude plugin marketplace add haxzie/genmotion
claude plugin install genmotion@genmotion
```

Or add the MCP server by hand:

```sh
claude mcp add genmotion -- npx -y genmotion mcp
codex mcp add genmotion -- npx -y genmotion mcp
```

## Commands

Every command takes `--json` and prints exactly one JSON object on stdout:
`{ "ok": true, ... }`, or `{ "ok": false, "error": { "message", "fix" } }`. It
never prompts unless it's running in a terminal without `--yes`.

| Command | |
|---|---|
| `genmotion init [dir]` | New project. `--template <id\|path>`, `--size 1920x1080\|portrait\|square\|4k`, `--fps`, `--engine three\|react` |
| `genmotion dev` | Studio: play, scrub, step frames, jump between scenes. Reloads on save. `--background` / `--status` / `--stop` for agents |
| `genmotion render [out]` | `--codec mp4\|webm\|gif\|mov\|png`, `--frames 0-89\|1s-3s`, `--scale 2`, `--quality`, `--crf`, `--concurrency`, `--gl gpu` |
| `genmotion still` | `--at 1.5s --at 50% --at 120` writes PNG or JPEG frames |
| `genmotion check` | Compiles every scene, enforces the determinism rules, and renders each scene's first, middle and last frame headlessly, catching throws, console errors and blank frames. Exits 1 on errors. `--static` skips the browser |
| `genmotion info` | Size, fps, scenes and their timing, audio, assets |
| `genmotion scene add <name>` | Creates the scene file and registers it in `project.json`. `--duration 4s`, `--after <scene>` |
| `genmotion templates` | The starter catalog |
| `genmotion mcp` | MCP server over stdio |
| `genmotion skills add\|update` | Write or refresh the agent files |
| `genmotion browser install` | Fetch headless Chromium. Also happens automatically on the first render |
| `genmotion doctor` | Checks Node, ffmpeg, Chromium and WebGL |

`genmotion .` still opens the folder in the [GenMotion desktop app](https://genmotion.dev)
if it's installed.

### MCP tools

`project_overview`, `create_project`, `add_scene`, `validate_scene`,
`check_project`, `capture_frames` (returns the images), `render_video`,
`save_asset`, `add_package`, `get_guide`, `list_templates`.

## A scene

```ts
import * as THREE from "three";
import { interpolate, Easing, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";

export default function buildScene({ scene, camera }: ThreeSceneContext): ThreeSceneUpdate {
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), new THREE.MeshStandardMaterial({ color: "#6ee7ff" }));
  cube.name = "hero-cube";
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(3, 4, 5);
  scene.add(cube, key, new THREE.AmbientLight(0xffffff, 0.6));
  camera.position.z = 5;

  // Runs once per frame. Everything is a function of time: no clocks.
  return ({ time, progress }) => {
    cube.rotation.set(time * 0.6, time, 0);
    cube.scale.setScalar(interpolate(progress, [0, 0.2], [0.4, 1], Easing.easeOut));
  };
}
```

`project.json` sets the order and length of each scene, plus fps, size and audio.

## How rendering works

- The project is served over a loopback HTTP server. The page is the same one
  the studio shows.
- Headless Chromium seeks each frame. The engine's barrier waits for textures,
  fonts and media before the frame is captured over CDP.
- Frames are piped straight into ffmpeg. `--concurrency` splits the range
  across tabs, and the segments are joined without re-encoding.
- Audio from `project.json` is mixed in once, with trims, fades and gains.
- WebGL runs on SwiftShader by default, so a render gives the same pixels on
  every machine, CI included. `--gl gpu` is faster.
- Chromium and ffmpeg are downloaded on first use. Set `GENMOTION_CHROMIUM` or
  `FFMPEG_PATH` to use your own, and `GENMOTION_NO_DOWNLOAD=1` to forbid
  downloads.

Node 22 or newer.
