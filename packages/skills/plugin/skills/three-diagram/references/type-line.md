# Line chart

**Best for:** a trend over time. The slopegraph, ridgeline, streamgraph and bump
variants are here too.

## Layout

- **Label series at their right end**, not in a legend the eye has to travel to.
  `tag()` at `p.right + 24`, aligned left.
- **One accent series**; the rest in `SERIES` colours or `muted`. If three
  series all matter, the chart has no subject.
- **The last point of the accent series gets a dot and its value.** That is the
  number the viewer came for.
- **An area fill under the accent line at 10% opacity** gives the series weight
  without a second colour. Optional; drop it when two series cross often.
- Grid rules on the y axis only, at 6% ink.

## The variants

- **Slopegraph**: exactly two x positions, lines between them, every end
  labelled. Use when the change between two states is the whole content.
- **Ridgeline**: one filled `area()` per series, baselines stacked down the
  frame, overlapping by about a third. Use for one distribution per category.
- **Streamgraph**: stacked areas on a shared centreline. Use `SERIES`, never a
  gradient.
- **Bump**: rank on the y axis, inverted, one line per entity, dots at every
  snapshot. Use for rank movement, never for values.

## Budget

Five series, or three if the lines cross.

## The reveal

Axes, then each series drawing along itself over about 34 frames with a 14-frame
stagger, then the fill, then the end dot and its value, then the labels. The
draw-on is the point of doing a line chart in motion at all: let it take time.

## Anti-patterns

- A legend when end labels would do.
- Smoothing that invents data between points.
- Dots on every vertex of every series. One dot, on the point that matters.
