# Changesets

Versions and changelogs for the packages published to npm: `genmotion`,
`create-genmotion`, `@genmotion/three-engine` and `@genmotion/shared`. Every
other workspace package is private and ignored.

When a change should ship, add a changeset with `pnpm changeset`, pick the
packages and the bump, and commit the file with the change. Merging to `main`
opens (or updates) a "Version packages" PR; merging that PR publishes.
