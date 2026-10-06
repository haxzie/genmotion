# @genmotion/desktop

## 0.2.1

### Patch Changes

- 61bd6d7: Picking a template says so, then takes you to the box it landed in.

  Remix on a gallery card now turns green and reads "Added to chat" with a check, and the start screen scrolls back up to the composer where the chip is waiting. The scroll is held for a beat first: Chromium begins a smooth scroll on the same frame as the click, which carried the confirmation off screen before it had drawn.

## 0.2.0

### Minor Changes

- deb4fd0: Templates move to the start screen, projects get a screen of their own, and Remix is a chip in the prompt box.

  The Create screen now shows the template gallery under the composer: poster-only cards that play their own video on hover and lazy-load as you scroll. Every project you have made is its own destination in the nav instead, with the grid and list it already had.

  Remix no longer copies anything the moment it is pressed. It loads the template into the composer as a chip, and the copy is made when that message is sent, so the prompt and the template reach the agent together. The web site's "Open in the app" link lands in the same place: the app comes forward with the template on the prompt box, and nothing is written to disk until you send.

## 0.1.1

### Patch Changes

- e9c0ee0: Home composer: a rotating brand-gradient hairline and bloom around the box.

## 0.1.0

### Minor Changes

- 3688c84: Add the scene library: `genmotion scenes search|show|add` and the `search_scenes` / `get_scene` / `fork_scene` tools find how a beat (hook, integrations, stat, end card…) was done in GenMotion's templates, with notes, code and a three-frame filmstrip, and fork the closest scene into the project to re-skin.

## 0.0.32

### Patch Changes

- f864428: Remixing a template now keeps the template's own README.md, alongside its
  AGENTS.md. Every template in the catalog ships one: what the video is, how to
  open the folder, what each scene does, and where to find the rest of the
  gallery and the docs. It is the page someone lands on once a remix is published
  to GitHub, so the scaffold's generic README no longer overwrites it.

## 0.0.31

### Patch Changes

- 3263353: A project made with `init --template` (or the `create_project` tool) now pins `@genmotion/cli` to the line that created it, as plain `init` already did. Remixes pinned `^0.2.1`, so `npm run dev` started the 0.2 studio, which has no timeline and plays no audio. Projects the app scaffolds now pin `^0.3.0`.

## 0.0.30

### Patch Changes

- 0603220: The CLI is published as `@genmotion/cli`; the command it installs is still
  `genmotion`. npm refuses the bare `genmotion` name as too similar to
  `emotion`, so `genmotion@0.2.0` never reached the registry and
  `create-genmotion@0.2.0`, which depends on it, could not install.
  `npm create genmotion` works again, `npx @genmotion/cli <command>` runs the
  CLI anywhere, `npm install -g @genmotion/cli` installs the `genmotion`
  command, and the app's "Install the 'genmotion' command" installs
  `@genmotion/cli`. New projects and the MCP config use the new name.

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
