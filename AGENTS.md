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
  web/       Next.js 16 (App Router, React 19, Tailwind v4)   → :4000
  api/       Hono API (better-auth, projects, AI chat,
             assets, exports, admin, render control-plane)     → :4001
  renderer/  pg-boss worker → E2B sandbox (or local Playwright)
             + ffmpeg; renders exports & thumbnails
packages/
  motion/    frame-deterministic animation runtime
  player/    composition player (drives BOTH editor preview and render page)
  compiler/  TSX → component (esbuild-wasm in browser, native esbuild on server)
  ai/        editor agent: system prompt + tools (compile-validate before DB)
  db/        Drizzle schema + client (Postgres, node-postgres)
  storage/   S3 wrapper (MinIO dev / R2 prod)
  shared/    types + timeline frame math (+ render-token, subpath exports)
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
  exclusive — don't cross them.
- **Auth:** better-auth (magic link + Google/GitHub OAuth + organization
  plugin). Every product request is scoped to `organizationId`.
- **Scenes (agent-authored TSX):** may import only `react`, `@genmotion/motion`,
  `gsap`, `lucide-react`. No `Math.random`/`Date.now`/timers/CSS transitions —
  everything is a pure function of the current frame. Inline styles only; never
  mix a CSS shorthand and its longhand (e.g. `background` + `backgroundColor`)
  on one element.
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
