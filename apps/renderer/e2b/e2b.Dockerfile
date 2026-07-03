# E2B renderer sandbox image: headless Chromium (Playwright) + ffmpeg + the repo.
# Build context is the repo root. See ./README.md for how to build/publish.
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

# System ffmpeg for encoding + audio mux (the app also has ffmpeg-static).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# pnpm via corepack (match packageManager in the root package.json).
# CI=true so pnpm auto-confirms a modules purge in this non-interactive build.
ENV CI=true COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate

WORKDIR /app

# Install browsers to a fixed, absolute path (the Playwright base image's
# location). E2B runs render commands as `user` WITHOUT the image's ENV, so the
# worker also passes PLAYWRIGHT_BROWSERS_PATH=/ms-playwright at runtime — both
# must agree or Playwright looks in ~/.cache and can't find Chromium.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Copy the monorepo source (node_modules etc. excluded via .e2bignore).
COPY . /app

# Install only the renderer's workspace subtree, then Chromium AND the headless
# shell (headless: true launches chrome-headless-shell on modern Playwright).
RUN pnpm install --frozen-lockfile --filter @genmotion/renderer... \
  && pnpm --filter @genmotion/renderer exec playwright install chromium chromium-headless-shell

# The E2B provider invokes the render CLI per job via `commands.run`. tsx is a
# workspace devDependency (installed above, in node_modules — not on PATH), so
# the default command resolves it with `pnpm exec`:
#   pnpm --dir /app/apps/renderer exec tsx \
#     --tsconfig /app/tsconfig.tsx-runtime.json \
#     /app/apps/renderer/src/render-cli.ts render <exportJobId>
# Override with the E2B_RENDER_CMD env var if your image lays things out
# differently. The command is sent from the worker at runtime, so tweaking it
# needs only a worker redeploy — no template rebuild.
