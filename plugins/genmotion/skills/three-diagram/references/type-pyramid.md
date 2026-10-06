# Pyramid / funnel

**Best for:** a ranked hierarchy, or a conversion drop-off.

## Layout

- **Width is the number, so the taper has to be true.** A funnel whose levels
  step evenly while the numbers fall off a cliff is a lie told with a shape.
  Compute each level's width from its value; clamp at a minimum so the last
  level stays labelable.
- **Trapezoids, not rectangles.** Each level's bottom width is the next level's
  top width, so the silhouette is continuous. `trapezoid()` from the shape kit.
- **Three lines per level**: the stage name in the mono above the centre, the
  number in the sans below it, and the drop percentage out to the right.
- **The last level is the accent.** That is the conversion, and it is what the
  chart is about.
- Opacity rises very slightly down the stack so the levels separate without a
  second colour.

## Budget

Six levels. Five reads better.

## The reveal

Levels top to bottom 9 frames apart, names and numbers with them, then the drop
percentages last. The drops landing at the end turns a shape into an
indictment.

## Anti-patterns

- A 3D pyramid, where perspective makes the widths lie.
- Equal-height levels with equal-width steps and real numbers underneath.
- A funnel with no drop percentages, which is the only number anyone wants.
