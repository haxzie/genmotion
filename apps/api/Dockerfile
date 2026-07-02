# syntax=docker/dockerfile:1
#
# GenMotion API (Hono). Build from the REPO ROOT so the pnpm workspace resolves:
#   docker build -f apps/api/Dockerfile -t genmotion-api .
#
# Runtime env (pass with -e / compose / k8s): DATABASE_URL, BETTER_AUTH_SECRET,
# BETTER_AUTH_URL, WEB_URL, S3/R2 creds, AI keys, etc. (see apps/api/src/env.ts).
FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NODE_ENV=production \
    PORT=4001
RUN corepack enable

WORKDIR /repo
COPY . .

# Install only the API's workspace subtree (its deps + linked workspace pkgs),
# skipping web/renderer-only packages. tsx runs the TS sources directly.
RUN pnpm install --frozen-lockfile --filter @genmotion/api...

EXPOSE 4001
WORKDIR /repo/apps/api
# Apply pending DB migrations, then start the server. Migrations are tracked, so
# re-runs on restart are no-ops. (For zero-downtime/multi-replica setups, run
# `pnpm run migrate:docker` as a one-off release step instead and drop it here.)
CMD ["sh", "-c", "pnpm run migrate:docker && pnpm run start:docker"]
