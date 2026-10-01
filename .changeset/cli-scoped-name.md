---
"@genmotion/cli": patch
"create-genmotion": patch
"@genmotion/desktop": patch
---

The CLI is published as `@genmotion/cli`; the command it installs is still
`genmotion`. npm refuses the bare `genmotion` name as too similar to
`emotion`, so `genmotion@0.2.0` never reached the registry and
`create-genmotion@0.2.0`, which depends on it, could not install.
`npm create genmotion` works again, `npx @genmotion/cli <command>` runs the
CLI anywhere, `npm install -g @genmotion/cli` installs the `genmotion`
command, and the app's "Install the 'genmotion' command" installs
`@genmotion/cli`. New projects and the MCP config use the new name.
