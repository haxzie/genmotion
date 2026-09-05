# AGENTS.md

Guidance for AI coding agents working in this repo. See `README.md` for the
product story; this file is the minimal, agent-facing context. (Follows the
[agents.md](https://agents.md) open format.)

## What this is

GenMotion — an AI motion-video studio. An agent writes animated scenes as
React/TSX, they preview frame-accurately in the browser, get arranged on a
timeline, and export as pixel-identical MP4s rendered by a headless worker.

## Monorepo layout

pnpm workspaces + Turbo. Node ≥ 22, pnpm@11.2.2.

```
apps/
  desktop/   Electron studio — the product. Local project folders, the
             user's own agent CLI, loopback API speaking the hosted
             routes, offscreen-window + ffmpeg export              → :4100
  web/       Next.js 16 (App Router, React 19, Tailwind v4):
             marketing, download, accounts, billing              → :4000
  api/       Hono API (better-auth, billing, desktop device
             sign-in, product events, release downloads)         → :4001
  renderer/  pg-boss worker → E2B sandbox (or local Playwright)
             + ffmpeg. Hosted-only; being retired with the hosted
             studio — the desktop app renders locally instead.
packages/
  motion/    frame-deterministic animation runtime
  player/    composition player (drives BOTH editor preview and render page)
  compiler/  TSX → component (esbuild-wasm in browser, native esbuild on server)
  ai/        editor agent: system prompt + tools (compile-validate before DB).
             `@genmotion/ai/prompt` is the prompt alone — no DB or provider
             deps — which is what the desktop app imports
  db/        Drizzle schema + client (Postgres, node-postgres)
  storage/   S3 wrapper (MinIO dev / R2 prod)
  shared/    types + timeline frame math (+ render-token, subpath exports)
  project/   a project as a folder on disk: manifest, scaffold,
             scene bundler, validation (used by apps/desktop).
             `@genmotion/project/validate` is a subpath: it renders scenes
             with react-dom/server, which the API has no reason to install
  templates/ the starter templates. Each is a real project folder under
             `catalog/`, plus a `template.json` sidecar and a `poster.jpg`.
             Also the catalog reader the API serves from
```

## Setup & run

```sh
docker compose up -d          # Postgres :5433, MinIO :9000/:9001
cp .env.example .env          # set ANTHROPIC_API_KEY at minimum
pnpm install
pnpm db:push                  # sync schema to the dev DB
pnpm dev                      # web :4000 · api :4001 · renderer worker
```

Ports are non-standard on purpose (4000/4001/5433) to avoid local collisions.

`pnpm dev` already points the desktop app's Electron process at the local
stack — it loads root `.env` before spawning it. A **packaged** desktop build
is different: launched from Finder it sees an empty `process.env`, so
`GM_CLOUD_API_URL`/`GM_CLOUD_WEB_URL` have to be baked in at build time
(`build-main.mjs`'s `cloudDefines()`). `pnpm --filter @genmotion/desktop
build:local` / `package:local` do that — load `.env`, then build — so a local
`.app` talks to `localhost:4001` instead of the hosted API. The ordinary
`build`/`package`/`dist`/`release:mac` scripts are untouched by this on
purpose: a real release must never pick up a developer's local `.env` by
accident.

## Commands

```sh
pnpm typecheck                        # all packages (turbo)
pnpm --filter @genmotion/<pkg> typecheck   # one package (faster)
pnpm test                             # vitest (motion determinism, frame math)
pnpm build                            # production build
pnpm db:generate                      # generate a Drizzle migration (for PROD)
pnpm db:push                          # sync schema to DEV only
```

## Conventions & rules

- **TypeScript strict**; `noUncheckedIndexedAccess` is on — index access is
  `T | undefined`, handle it.
- **Always `typecheck` the packages you touched before finishing.** Don't run a
  full build to verify a small change.
- **Match surrounding style** — comment density, naming, idioms. Comments
  explain *why*, not *what*.
- **DB migrations:** `db:push` updates the DEV database only. Any schema change
  that ships to prod MUST have a generated migration (`db:generate`) committed —
  prod applies migrations on deploy.
- **API:** Hono routes under `apps/api/src/routes/*`, mounted in `app.ts`.
  Product routes use the `requireAuth` middleware (session cookie, org-scoped);
  admin routes use `requireAdmin` (Bearer admin token). The two are mutually
  exclusive — don't cross them. `/api/templates` and `/api/releases` are the
  exceptions: both are public and anonymous, because nothing they serve is
  anyone's private data and the desktop app reads them before it has a session.
- **Templates:** a template is an ordinary project folder in
  `packages/templates/catalog/<id>/` — open one with `genmotion .` and edit it
  like any video. `template.json` carries the catalog metadata and `poster.jpg`
  the card image (`pnpm --filter @genmotion/templates poster <id>` recaptures
  it through headless Chromium; `scaffold` rewrites the package.json/tsconfig
  from `@genmotion/project`'s own renderers). The API bundles a template's
  scenes on demand — the renderer has no TSX compiler — and **Remix** ships
  the files to the desktop main process, which scaffolds a fresh project and
  writes them in. Every path in that bundle is re-validated on the desktop side
  before it touches disk. The catalog test compiles and smoke-renders every
  scene, so a template that rots fails CI.
- **Auth:** better-auth (magic link + Google/GitHub OAuth + organization
  plugin). Every product request is scoped to `organizationId`. The desktop app
  signs in through the device-authorization grant (`/api/auth/device/*`): it
  opens `WEB_URL/device` in the real browser, polls for the session, and then
  authenticates with `Authorization: Bearer <session token>` via the `bearer`
  plugin. Its token lives in the Electron main process — never the renderer.
- **Downloads:** `/api/releases/latest` (JSON) and `/api/releases/latest/download`
  (302 to GitHub) read the newest GitHub release, so no version number is ever
  written into the web app. Both are public and anonymous — the repo is public,
  so no token is involved, and the ten-minute cache keeps the server inside
  GitHub's 60/hr unauthenticated budget at roughly six calls.
- **Updates:** the desktop app checks at launch via electron-updater, reading
  GitHub releases directly (`publish: github` in electron-builder.yml) so the
  ~140MB comes off GitHub's CDN. Nothing downloads until the user asks; install
  quits the app, so that is a second, separate press. A release without
  `latest-mac.yml` is invisible to installed apps — CI fails if it is missing.
- **Product events:** the desktop app has no analytics of its own (a bundled
  PostHog key is a write credential handed to every user). It posts to
  `/api/events` and the server forwards; identity comes from the session, never
  the body, and names are prefixed `desktop_` server-side.
- **The desktop chat agent has a real shell.** Both harnesses' Bash tool is on,
  with this app's own `ffmpeg` prepended to its `PATH` (`bundledBinDir()` in
  `apps/desktop/electron/bundled-bin.ts`, wired into `agentEnv()` in
  `agent/detect.ts`) — for media work `save_asset`/`generate_image`/
  `generate_voiceover` don't cover. Containment differs sharply by harness:
  Codex is OS-sandboxed (`workspace-write`, `network_access=false`), so its
  shell is genuinely contained; Claude Code has no sandbox at all, and its
  `canUseTool` path check has nothing to inspect on a shell command — a Bash
  call there is ungoverned by anything this app adds. Accepted deliberately
  (see the comment above `DISALLOWED_TOOLS` in `agent/tools.ts`), not a gap to
  quietly close.
- **Scenes (agent-authored TSX):** may import only `react`, `@genmotion/motion`,
  `gsap`, `lucide-react`. No `Math.random`/`Date.now`/timers/CSS transitions —
  everything is a pure function of the current frame. Inline styles only; never
  mix a CSS shorthand and its longhand (e.g. `background` + `backgroundColor`)
  on one element.
- **Text motion:** use `<TextAnimation>` (46 effects in
  `packages/motion/src/text/effects.ts`, `exit="auto"`, `hold`, `order`) plus
  `Typewriter`/`TextSwap`/`CountText`/`HighlightText` — don't hand-roll per-word
  or per-char spans. Adding an effect to the registry is enough; the agent-facing
  catalog in the system prompt is generated from it. Browse them all at
  `/dev/motion`.
- **Rendering:** default provider is `e2b` (renders offload to a sandbox via the
  API's credential-less control-plane); Chromium lives in the E2B template, not
  the worker image. `local`/`docker` providers render on-box.
- **Secrets/env:** validated in `apps/api/src/env.ts`. Add new vars there
  (`.optional()` or `.default()` unless truly required). Never bake secrets into
  images; pass at runtime. *Exception:* the free video generators under
  `/tools` read `GITHUB_TOKEN` and `YOUTUBE_API_KEY` in **apps/web**, because
  their endpoints are public and unauthenticated — routing them through the
  product API would give it its first unauthenticated posture. `next.config.ts`
  loads the root `.env` for this (Next only looks in its own directory).
- **Free video generators (`/tools`):** the four generators are client-side
  end to end — data comes from cached Next route handlers under
  `apps/web/src/app/api/tools/*`, and the MP4 is rendered and encoded **in the
  browser** (`src/lib/video-tools/render/`), never by `apps/renderer`. Adding a
  source or a template is additive; see
  `apps/web/src/lib/video-tools/templates/README.md` for the authoring rules
  that keep DOM rasterization faithful.

## Git & PRs

- Don't commit or push unless asked. If on `main`, branch first.
- End commit messages with the `Co-Authored-By` trailer for the acting model.

## Discovery files (keep in sync)

- `apps/web/src/app/robots.ts` — welcomes search + AI crawlers, blocks private
  paths.
- `apps/web/src/app/sitemap.ts` — enumerates public routes (marketing, features,
  tools, blog, glossary, showcase).
- `apps/web/src/app/llms.txt/route.ts` — Markdown site map for LLMs
  ([llmstxt.org](https://llmstxt.org)). When you add a marketing content type,
  add it to sitemap + llms.txt too.
