#!/bin/sh
# Vercel's ignore step: exit 0 to skip the build, 1 to build.
#
# Diff from the commit Vercel last deployed, not from the last commit: a push
# of several commits that ends in a desktop-only one — a version bump — has
# to be judged by everything since the last deploy, or the web changes in
# the middle never build. The previous commit may be missing from Vercel's
# shallow clone; fetch it, fall back to the last commit, and never let a git
# error be the answer — Vercel reads anything but 0 or 1 as a failed deploy.
b="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"
git cat-file -e "$b^{commit}" 2>/dev/null || git fetch --deepen=100 origin 2>/dev/null
git cat-file -e "$b^{commit}" 2>/dev/null || b="HEAD^"
if git diff --quiet "$b" HEAD -- . ../../packages ../../scripts/install.sh ../../pnpm-lock.yaml; then
  exit 0
fi
exit 1
