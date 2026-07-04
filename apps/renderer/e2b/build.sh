#!/usr/bin/env bash
set -euo pipefail

# Build the E2B renderer template from a CLEAN, source-only context.
#
# The template's Dockerfile runs `pnpm install --filter @genmotion/renderer...`
# inside the image, so the build context must contain the whole workspace
# SOURCE (root manifests + every package's package.json + the dependency
# packages' source). But it must NOT contain the multi-GB build caches
# (apps/web/.next, node_modules, .turbo) — uploading those makes the E2B CLI
# choke with "Failed to upload file: fetch failed".
#
# `git archive HEAD` gives exactly the right thing: all committed files, with
# node_modules/.next/.turbo excluded (they're gitignored). ~15MB vs ~4GB.
# NOTE: it archives the last COMMIT, so commit renderer changes before building.

ROOT="$(git rev-parse --show-toplevel)"
CTX="$(mktemp -d)"
trap 'rm -rf "$CTX"' EXIT

echo "Preparing clean build context from git HEAD…"
git -C "$ROOT" archive HEAD | tar -x -C "$CTX"
echo "Context size: $(du -sh "$CTX" | cut -f1)"

npx -y @e2b/cli template create genmotion-renderer \
  --path "$CTX" \
  --dockerfile apps/renderer/e2b/e2b.Dockerfile \
  --cpu-count 2 \
  --memory-mb 4096 \
  "$@"
