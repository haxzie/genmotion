# syntax=docker/dockerfile:1
#
# GenMotion renderer (ffmpeg + pg-boss queue worker). Build from the REPO ROOT
# so the pnpm workspace resolves:
#   docker build -f apps/renderer/Dockerfile -t genmotion-renderer .
#
# It's a queue worker (no HTTP port). Runtime env: DATABASE_URL (pg-boss),
# S3/R2 creds, RENDER_PROVIDER, and — for E2B rendering — E2B_* + RENDER_JWT_SECRET
# (see apps/api/src/env.ts). ffmpeg ships via the ffmpeg-static npm package.
#
# Chromium: only the `local`/`docker` providers launch a browser ON THIS BOX.
# The default `e2b` provider offloads every render + thumbnail to an E2B sandbox
# (which has its own Chromium via apps/renderer/e2b/e2b.Dockerfile), so this
# image does NOT bundle Chromium or its ~1GB of OS libraries. Build a
# self-contained single-box renderer with:  --build-arg RENDER_PROVIDER=local
FROM node:22-bookworm-slim

# Provider this image targets — also the runtime default (override at runtime).
ARG RENDER_PROVIDER=e2b

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NODE_ENV=production \
    RENDER_PROVIDER=${RENDER_PROVIDER} \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN corepack enable

WORKDIR /repo
COPY . .

# Install the renderer workspace subtree. The `playwright` npm package is always
# present (the code imports it), but the heavy Chromium BINARY + its system
# libraries are installed ONLY for providers that render on this box; e2b skips
# them, keeping the image small.
RUN pnpm install --frozen-lockfile --filter @genmotion/renderer... \
  && if [ "$RENDER_PROVIDER" = "local" ] || [ "$RENDER_PROVIDER" = "docker" ]; then \
       echo "RENDER_PROVIDER=$RENDER_PROVIDER — installing Chromium + OS deps…"; \
       pnpm --filter @genmotion/renderer exec playwright install --with-deps chromium chromium-headless-shell \
       && rm -rf /var/lib/apt/lists/*; \
     else \
       echo "RENDER_PROVIDER=$RENDER_PROVIDER offloads rendering to a sandbox — skipping Chromium install."; \
     fi

WORKDIR /repo/apps/renderer
CMD ["pnpm", "run", "start:docker"]
