# Treemap

**Best for:** part-of-whole where the relative sizes are the story. The
marimekko variant is here too.

## Layout

- **Lay it out by hand, not with a squarifying algorithm.** Eight cells at most,
  and at eight cells a person beats a solver, because a person knows which cell
  has to stay readable. Express each cell as a fraction of the frame
  (`x`, `y`, `w`, `h` in 0..1) and multiply up.
- **The biggest cell is the accent**, and it is the one that gets a larger
  number (56px against 32px). A treemap exists to say "this one is most of it".
- **Opacity scales with value** for everything else, so the ordering survives
  even where two cells are close in area.
- **Name and number in every cell**: the name in the mono above, the percentage
  in the sans below. A cell too small for both is a cell that should be merged
  into "other".

## The marimekko variant

Column widths carry one variable and the segments within each column carry a
second. Same rules: hand-laid, named, numbered, one accent.

## Budget

Eight cells. Five is usually right.

## The reveal

Cells 7 frames apart largest first, then names, then numbers. Largest first is
what makes the hierarchy land.

## Anti-patterns

- Twenty cells with no labels, which is a texture.
- A legend mapping colours to names instead of naming the cells in place.
- Using this for change over time. A treemap is one moment.
