# create-genmotion

## 0.5.0

### Patch Changes

- Updated dependencies [18553cf]
- Updated dependencies [7c5e84b]
  - @genmotion/cli@0.5.0

## 0.4.1

### Patch Changes

- Updated dependencies [76dd298]
  - @genmotion/cli@0.4.1

## 0.4.0

### Patch Changes

- Updated dependencies [3263353]
- Updated dependencies [3263353]
  - @genmotion/cli@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [fb22c93]
- Updated dependencies [d1b6cbe]
  - @genmotion/cli@0.3.0

## 0.2.2

### Patch Changes

- Updated dependencies [e9f77b5]
  - @genmotion/cli@0.2.2

## 0.2.1

### Patch Changes

- 0603220: The CLI is published as `@genmotion/cli`; the command it installs is still
  `genmotion`. npm refuses the bare `genmotion` name as too similar to
  `emotion`, so `genmotion@0.2.0` never reached the registry and
  `create-genmotion@0.2.0`, which depends on it, could not install.
  `npm create genmotion` works again, `npx @genmotion/cli <command>` runs the
  CLI anywhere, `npm install -g @genmotion/cli` installs the `genmotion`
  command, and the app's "Install the 'genmotion' command" installs
  `@genmotion/cli`. New projects and the MCP config use the new name.
- Updated dependencies [0603220]
  - @genmotion/cli@0.2.1

## 0.2.0

### Patch Changes

- Updated dependencies [7e800b6]
  - genmotion@0.2.0

## 0.1.0

### Minor Changes

- 4169473: First public release: the `genmotion` CLI (init, dev, render, still, check, info,
  scene add, mcp, skills, templates, browser, doctor), `npm create genmotion`, and
  the Three.js engine runtime that scenes are written against.

### Patch Changes

- Updated dependencies [4169473]
- Updated dependencies [4169473]
  - genmotion@0.1.0
