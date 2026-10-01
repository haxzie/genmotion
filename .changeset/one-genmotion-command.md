---
"genmotion": minor
"@genmotion/desktop": patch
---

There is now one `genmotion` command: the npm CLI. The app and its installer
install it with npm (it needs Node 22 or newer) instead of writing a launcher
script of their own, and replace the script older versions left in
`/usr/local/bin`, which could block `npm install -g genmotion` or answer ahead
of it. `genmotion .`, `genmotion clone` and a bare `genmotion` still open the
app. New `genmotion upgrade` updates the app and the command together, and
`genmotion doctor` reports the app version and flags an old launcher on PATH.
