# E2B renderer sandbox

The renderer can run each job inside a fresh [E2B](https://e2b.dev) sandbox
instead of an always-on worker. Selected with `RENDER_PROVIDER=e2b`.

## How it fits together

- The renderer **worker** (`apps/renderer/src/index.ts`) is the queue consumer.
  With `RENDER_PROVIDER=e2b` it creates an `E2BRenderProvider` that, per job,
  spins up a sandbox from this template, runs the render CLI inside it, streams
  logs, then tears the sandbox down.
- The **render CLI** (`apps/renderer/src/render-cli.ts`) is the same pipeline the
  local provider runs in-process (`compile → Chromium frame loop → ffmpeg →
  upload to R2 → update job status`). It just runs inside the sandbox.
- The sandbox reads scenes from Postgres and uploads to R2, so it needs
  `DATABASE_URL` + the S3/R2 vars — the provider forwards those automatically
  (see `pickRenderEnv` / `RENDER_ENV_KEYS`).

## Build the template

The Docker build context is the **repo root** (it copies the whole monorepo).

```bash
# from apps/renderer/e2b, pointing the context at the repo root
e2b template build --dockerfile e2b.Dockerfile --name genmotion-renderer .
# (adjust for your e2b CLI version; the context must include the repo root)
```

This is a **starting scaffold** — tune the Playwright base image version, memory,
and CPU (`e2b.toml`) to your account limits, and verify Chromium launches.

## Env vars (set on the renderer worker)

| Var | Purpose | Default |
|-----|---------|---------|
| `RENDER_PROVIDER` | `local` or `e2b` | `local` |
| `E2B_API_KEY` | E2B auth (already used by the workbench tool) | — |
| `E2B_RENDER_TEMPLATE` | template name/id built above | `genmotion-renderer` |
| `E2B_RENDER_CMD` | command that runs the CLI in the image | `tsx /app/apps/renderer/src/render-cli.ts` |
| `RENDER_TIMEOUT_MS` | sandbox + render timeout | `1200000` (20 min) |

Plus the render pipeline's data-plane env, forwarded into the sandbox:
`DATABASE_URL`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `API_URL`, `NEXT_PUBLIC_API_URL`.

## Switching back

Set `RENDER_PROVIDER=local` (or unset it) to run renders in the worker process
with a reused Chromium — no code change. Adding another backend (a dedicated
render farm, Cloudflare Containers, …) means implementing `RenderProvider`
(`apps/renderer/src/providers/types.ts`) and wiring it into the factory
(`providers/index.ts`).
