# Changesets

Versions and changelogs for everything that ships:

- the npm packages — `genmotion`, `create-genmotion` (always released
  together), `@genmotion/three-engine` and `@genmotion/shared`;
- the desktop app, `@genmotion/desktop` — private, never published to npm,
  but versioned here so its release is cut the same way.

Every other workspace package is private and listed in `ignore`.

When a change should ship, run `pnpm changeset`, pick the packages and the
bump, describe the change in a sentence a user would understand, and commit
the file with the change. Merging to `main` opens (or updates) a "Version
packages" PR. Merging that PR publishes the npm packages and, if the desktop
version moved, tags `desktop-v<version>` and builds, signs, notarizes and
releases the app (`.github/workflows/release.yml`).
