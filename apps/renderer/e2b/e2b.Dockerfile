# E2B renderer sandbox image: headless Chromium (Playwright) + ffmpeg + the repo.
# Build context is the repo root. See ./README.md for how to build/publish.
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

# System ffmpeg for encoding + audio mux (the app also has ffmpeg-static).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# pnpm via corepack (match packageManager in the root package.json).
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate

WORKDIR /app

# Copy the whole monorepo so workspace deps resolve.
COPY . /app

# Install and make sure Chromium is present for the renderer.
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @genmotion/renderer exec playwright install chromium

# The E2B provider invokes the render CLI per job via `commands.run`, e.g.:
#   tsx /app/apps/renderer/src/render-cli.ts render <exportJobId>
# (override with the E2B_RENDER_CMD env var if your image lays things out
#  differently). `start_cmd` in e2b.toml keeps the sandbox warm between execs.
