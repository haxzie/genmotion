# Heatmap

**Best for:** cross-tabulated values where the shape of the distribution is the
finding.

## Layout

- **One hue at varying opacity, never a rainbow.** A reader can order one hue by
  eye and cannot order a spectrum without consulting the key. This is the single
  rule that separates a readable heatmap from a decorative one.
- **The hot cell is the accent**, and it is the only cell in a different hue. A
  heatmap is almost always drawn to point at one cell; make that explicit rather
  than hoping the gradient does it.
- **Every cell carries its number.** The fill is for the pattern, the number is
  for the answer, and in a video the viewer gets one pass at both.
- Row and column headers in the mono, outside the grid.

## The legend

A strip below the art naming what the fill means and what the accent means. Two
items; if it needs more, the encoding is too clever.

## Budget

Five rows by six columns. Past about forty cells the numbers stop fitting at a
readable size.

## The reveal

Headers, then cells at a 1-frame stagger (so the grid washes in), then the
numbers, then the legend. The wash is worth the frames: it is the one moment the
distribution reads as a shape before it becomes a table.

## Anti-patterns

- A continuous colour scale with a gradient key. In a video nobody reads a key.
- Cells without numbers, forcing the viewer to estimate.
- Using this for two series over time. That is a line chart.
