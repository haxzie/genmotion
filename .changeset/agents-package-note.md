---
"@genmotion/cli": patch
---

A project's `AGENTS.md` now says the CLI is the npm package `@genmotion/cli`
and that there is no package called `genmotion`, so an agent outside the
project runs `npx @genmotion/cli` instead of searching for one.

Fixes 0.2.1, which was published without its build (`dist/`) and failed on
every command with `Cannot find package 'tsx'`. The package now builds itself
on `npm pack`/`npm publish`, and a copy missing its build says so instead.
