# @genmotion/desktop

## 0.0.29

### Patch Changes

- 7e800b6: There is now one `genmotion` command: the npm CLI. The app and its installer
  install it with npm (it needs Node 22 or newer) instead of writing a launcher
  script of their own, and replace the script older versions left in
  `/usr/local/bin`, which could block `npm install -g genmotion` or answer ahead
  of it. `genmotion .`, `genmotion clone` and a bare `genmotion` still open the
  app. New `genmotion upgrade` updates the app and the command together, and
  `genmotion doctor` reports the app version and flags an old launcher on PATH.

## 0.0.28

### Patch Changes

- 4169473: The agent now picks a skill for the kind of video you ask for (launch,
  feature announcement, milestone, explainer, logo sting, app store preview,
  walkthrough, social ad formats, or freeform), asks only what's missing, and
  remembers the choice in `VIDEO.md`. New explainer and Three.js camera, type,
  transitions, assets and look skills. The `genmotion` terminal command now
  hands `init`, `dev`, `render`, `check` and friends to the npm CLI.
