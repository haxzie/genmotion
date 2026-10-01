# genmotion

## 0.2.0

### Minor Changes

- 7e800b6: There is now one `genmotion` command: the npm CLI. The app and its installer
  install it with npm (it needs Node 22 or newer) instead of writing a launcher
  script of their own, and replace the script older versions left in
  `/usr/local/bin`, which could block `npm install -g genmotion` or answer ahead
  of it. `genmotion .`, `genmotion clone` and a bare `genmotion` still open the
  app. New `genmotion upgrade` updates the app and the command together, and
  `genmotion doctor` reports the app version and flags an old launcher on PATH.

## 0.1.0

### Minor Changes

- 4169473: First public release: the `genmotion` CLI (init, dev, render, still, check, info,
  scene add, mcp, skills, templates, browser, doctor), `npm create genmotion`, and
  the Three.js engine runtime that scenes are written against.
- 4169473: Video-type skills: `genmotion skills list|search|show|add` and the MCP tools
  `search_skills`/`get_skill` expose GenMotion's skill pack (launch, feature
  announcement, milestone, explainer, brand sting, app store preview,
  walkthrough, UGC ad formats, freeform, and Three.js camera/type/transitions/
  assets/look craft skills). New projects get the `genmotion-skills` router, and
  the chosen skill is recorded in `VIDEO.md`.
