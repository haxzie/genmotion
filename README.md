# GenMotion

AI-powered video studio. Chat with an agent that writes animated scenes as React/TSX code, preview them frame-accurately in the browser, rearrange them on a timeline, and export pixel-identical MP4s rendered by a headless worker.

## Architecture

```
apps/
  web/        Next.js editor & dashboard         → http://localhost:4000
  api/        Hono API (auth, projects, AI chat,
              assets, exports)                   → http://localhost:4001
  renderer/   Export worker: pg-boss consumer →
              Playwright frame capture → ffmpeg
packages/
  motion/     Frame-deterministic animation runtime (useCurrentFrame,
              interpolate, spring, Sequence, TextAnimation, GSAP-via-seek)
  player/     Composition player — same React tree drives the editor
              preview AND the headless render page
  compiler/   TSX → component. esbuild-wasm in the browser, native esbuild
              on the server (same pinned version), scoped require shim
  ai/         Editor agent: system prompt + tools with server-side compile
              validation (broken code never reaches the DB)
  db/         Drizzle schema + client (Postgres)
  storage/    S3 wrapper (MinIO dev / R2 prod)
  shared/     Types + timeline frame math
```

How a scene works: the agent writes a TSX module that default-exports a React
component. It may import only `react`, `@genmotion/motion`, and `gsap`.
Everything renders as a pure function of the current frame, so the preview,
scrubbing, and the export renderer all agree pixel-for-pixel. Export drives
`window.__gm.setFrame(n)` in headless Chromium — each frame waits for React
commit + media readiness + fonts — then pipes JPEG captures into ffmpeg.

## Getting started

Prereqs: Node ≥ 22, pnpm, Docker.

```sh
docker compose up -d          # Postgres :5433, MinIO :9000/:9001
cp .env.example .env          # then set ANTHROPIC_API_KEY=sk-ant-…
pnpm install
pnpm db:push                  # create tables
pnpm --filter @genmotion/renderer exec playwright install chromium
pnpm dev                      # web :4000 · api :4001 · renderer worker
```

Sign up at http://localhost:4000, create a project, and ask the chat for a
video ("make a 3-scene intro for a coffee brand"). Scenes appear on the
timeline as the agent writes them; Export produces a downloadable MP4.

> Ports are non-standard on purpose (4000/4001/5433) to avoid colliding with
> other local dev servers and Postgres.app.

## Useful commands

```sh
pnpm typecheck                       # all packages
pnpm test                            # motion determinism + frame math tests
pnpm build                           # production build
pnpm --filter @genmotion/api seed    # seed demo scenes into newest project
pnpm --filter @genmotion/db db:studio
```

## Notes & current limits

- Per-scene voiceovers: the agent's `generateVoiceover` tool (OpenAI
  `gpt-4o-mini-tts` via AI SDK `experimental_generateSpeech`, needs
  `OPENAI_API_KEY`) attaches narration to scenes; it plays in preview and is
  ffmpeg-mixed into exports at each scene's start offset. In-scene
  `<Audio>`/`<Video>` element audio is still preview-only.
- Scene code executes same-origin in the owner's browser (no iframe sandbox
  yet) — acceptable while scenes are only ever authored by the project
  owner's own agent. Revisit before any scene-sharing feature.
- The editor agent uses `claude-sonnet-4-6`; project auto-naming uses
  `claude-haiku-4-5`.
