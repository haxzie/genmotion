# GenMotion

A desktop video studio you point at a coding agent. Describe a video; the agent
writes animated scenes as React/TSX, you preview them frame-accurately, arrange
them on a timeline, and export an MP4 — all on your own machine.

The agent is **your** Claude Code or Codex CLI, signed in with your own
credentials. There is no model subscription to buy here, and no prompt leaves
for a server we run.

**[Download for macOS](https://genmotion.dev/download)** · Apple silicon,
signed and notarized. Or from a terminal:

```sh
curl -fsSL https://genmotion.dev/install.sh | sh
```

That installs the app and the `genmotion` command — `genmotion .` opens the app
with the current folder shared with the agent, and `genmotion upgrade` pulls the
next release.

## Architecture

```
apps/
  desktop/    Electron studio: local project folders, your own agent,
              a loopback API speaking the hosted routes        → :4100
  web/        Next.js marketing site + account & billing       → :4000
  api/        Hono API (auth, billing, desktop sign-in,
              events, release downloads)                       → :4001
packages/
  motion/     Frame-deterministic animation runtime (useCurrentFrame,
              interpolate, spring, Sequence, TextAnimation, GSAP-via-seek)
  player/     Composition player — the same React tree drives the editor
              preview AND the headless render page
  compiler/   TSX → component. esbuild-wasm in the browser, native esbuild
              on the server (same pinned version), scoped require shim
  project/    A project as a folder on disk: manifest, scaffold, scene
              bundler, validation
  ai/         The scene-authoring guide and text-effect catalog the agent
              is given (`@genmotion/ai/prompt`)
  db/         Drizzle schema + client (Postgres)
  storage/    S3 wrapper (MinIO dev / R2 prod)
  shared/     Types + timeline frame math
```

**How a scene works.** The agent writes a TSX module that default-exports a
React component. It may import only `react`, `@genmotion/motion`, `gsap`, and
`lucide-react`. Everything renders as a pure function of the current frame, so
the preview, scrubbing, and the export all agree pixel-for-pixel.

**How export works.** An offscreen `BrowserWindow` at the composition's exact
pixel size. Each frame drives `window.__gm.setFrame(n)` and waits on a
determinism barrier — React committed, fonts ready, every registered asset
loaded — then the JPEG capture is piped into a bundled ffmpeg. Timeline audio is
muxed by the same ffmpeg. No render queue, no upload, no quota.

## Running the desktop app from source

Prereqs: Node ≥ 22, pnpm, and either the [Claude Code](https://claude.com/claude-code)
or [Codex](https://developers.openai.com/codex/cli) CLI installed and signed in.

```sh
pnpm install
pnpm --filter @genmotion/desktop dev
```

That is the whole loop — the desktop app needs no database, no object storage,
and no API key. It signs in against the hosted API by default; point it at a
local one with `GM_CLOUD_API_URL` / `GM_CLOUD_WEB_URL`.

To build a distributable `.app`:

```sh
pnpm --filter @genmotion/desktop package     # unsigned, for this machine
pnpm --filter @genmotion/desktop release:mac # signed + notarized (needs certs)
```

Releases are cut by CI — tag `desktop-v<version>` and
`.github/workflows/desktop-release.yml` builds, signs, notarizes, staples,
verifies, and drafts a GitHub release. The tag must match the version in
`apps/desktop/package.json` or the workflow stops.

## Running the web app and API

Only needed to work on accounts, billing, or the marketing site.

```sh
docker compose up -d          # Postgres :5433, MinIO :9000/:9001
cp .env.example .env
pnpm install
pnpm db:push                  # create tables
pnpm dev                      # web :4000 · api :4001
```

> Ports are non-standard on purpose (4000/4001/5433) to avoid colliding with
> other local dev servers and Postgres.app.

## Useful commands

```sh
pnpm typecheck                       # all packages
pnpm test                            # motion determinism + frame math + API
pnpm build                           # production build
pnpm --filter @genmotion/db db:studio
```

## Notes & current limits

- **Apple silicon only.** `scripts/copy-esbuild-binary.mjs` resolves esbuild and
  ffmpeg for the host architecture, so an Intel build would need both slices
  fetched first.
- **The agent is contained, not sandboxed.** Claude Code runs with an explicit
  disallow list and a `canUseTool` check that refuses any path outside the
  project folder. The shell stays off: there is no sanctioned way to install a
  package yet, and a shell would route around that.
- **Scene code executes in the renderer**, which is why the renderer holds no
  token and no filesystem access — the main process owns both.
- Sign-in needs the network. There is no refresh token, so a 401 sends you back
  to the login screen.
