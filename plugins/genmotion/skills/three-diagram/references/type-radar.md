# Radar / spider

**Best for:** a few entities scored on the same few criteria.

## Layout

- **Five axes.** Three is a triangle and reads as nothing; past five or six the
  shape stops meaning anything.
- **Three series, one focal.** More and the overlaps turn to mud. The focal one
  is `accent` at 18% fill and a 4px stroke; the others take `SERIES` colours at
  12% and 2px. This is one of the few types the series palette exists for.
- **Rings at 25 / 50 / 75 / 100%** and one spoke per axis, all at 10% ink. The
  web is structure; it should disappear when you look at the shapes.
- **Axis names outside the outermost ring**, in the mono, about 64px clear.
- A legend strip below, because here the series genuinely cannot be labelled in
  place.

## Budget

Five axes, five series, one focal.

## The reveal

Rings, spokes, axis names, then each web drawing around itself over 26 frames
with a 14-frame stagger, focal last. The focal series arriving last and largest
is the argument.

## Anti-patterns

- Axes on different scales without saying so. Normalise to 0..1 or label each
  ring.
- Five series, which is permitted and almost never readable.
- A radar for two entities. That is a bar chart with grouped bars, and it will
  be easier to read.
