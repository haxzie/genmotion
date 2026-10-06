# Scatter plot

**Best for:** the relationship between two variables. The bubble and beeswarm
variants are here too.

## Layout

- **Only the points worth naming get a name.** Thirty unlabelled dots is a
  distribution, which is a legitimate thing to show; thirty labelled dots is a
  table that has been made hard to read.
- **The focal point is bigger, more opaque, and outlined.** Everything else sits
  at about 22% ink so the field reads as context.
- **Both axes get an eyebrow** (`COST`, `WAIT`). A scatter with unnamed axes is
  a decoration.
- Grid rules on the y axis only.

## The variants

- **Bubble**: radius carries a third variable. Scale radius by the square root
  of the value, never by the value, or the big ones swamp the chart. Six bubbles
  at most.
- **Beeswarm**: one variable, one dot per item, jittered off a single axis
  deterministically (by index, never randomly). Use it when the shape of a
  distribution matters and every item should still be its own mark.

## Budget

Thirty points, four labelled.

## The reveal

Axes, then dots at a fast stagger (5 frames) so the cloud forms, then the labels
once the field has settled. Labelling as the dots land makes both unreadable.

## Anti-patterns

- A trend line through eight points.
- Radius proportional to value in a bubble chart.
- Random jitter in a beeswarm: it breaks frame determinism and every render
  comes out different.
