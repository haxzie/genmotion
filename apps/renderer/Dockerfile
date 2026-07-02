# syntax=docker/dockerfile:1
#
# GenMotion renderer (Playwright headless Chromium + ffmpeg worker). Build from
# the REPO ROOT so the pnpm workspace resolves:
#   docker build -f apps/renderer/Dockerfile -t genmotion-renderer .
#
# It's a queue worker (no HTTP port). Runtime env: DATABASE_URL (pg-boss),
# S3/R2 creds, RENDER_PROVIDER, and — for E2B rendering — E2B_* (see
# apps/api/src/env.ts). ffmpeg ships via the ffmpeg-static npm package, so no
# apt ffmpeg is needed; Chromium + its OS libraries are installed below.
FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NODE_ENV=production \
    RENDER_PROVIDER=local \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN corepack enable

WORKDIR /repo
COPY . .

# Install only the renderer's workspace subtree.
RUN pnpm install --frozen-lockfile --filter @genmotion/renderer...

# Chromium + the OS libraries/fonts it needs (apt via Playwright's --with-deps).
RUN pnpm --filter @genmotion/renderer exec playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo/apps/renderer
CMD ["pnpm", "run", "start:docker"]
