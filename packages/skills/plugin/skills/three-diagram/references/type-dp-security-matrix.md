# DP security matrix

**Best for:** who may do what. A grid earns its place when the answer depends on
both axes.

## Layout

- **Roles down, scopes across**, headers in the mono via `tag()`.
- **Fill carries the level and the glyph repeats it.** `-`, `R`, `RW`, `ALL` at
  rising opacity. A reader should never have to match a colour against a key to
  learn whether they can delete something, so the cell says it twice.
- **One hue.** Ink at four opacities, with `accent` reserved for `ALL`: the
  permission worth being nervous about.
- Cells are `cell()` from the chart kit with an 8px gutter, so the grid reads as
  cells rather than as a table with borders.

## Budget

Five roles, six scopes. Thirty cells is already a lot to read in a shot; past
that, split by surface.

## The reveal

Headers (2 frames apart), then cells (2 frames), then the glyphs (2 frames).
Fast and uniform: a matrix is read as a field, not as a sequence, and a slow
stagger makes it feel like a list.

## Anti-patterns

- Ticks and crosses. They encode two states and permissions have four.
- A colour per permission level. One hue, four opacities.
- A matrix for something with one axis. That is a list.
