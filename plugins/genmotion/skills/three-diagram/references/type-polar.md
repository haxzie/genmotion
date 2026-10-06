# Polar chart

**Best for:** one quantitative series over categories that genuinely wrap.

## When not to use it

Polar earns its place only when the categories are cyclic: hours of a day,
months of a year, points of a compass. For anything else a bar chart is easier
to read and this is decoration. That test is the most useful thing in this file.

## Layout

- **Angle is the category, radius is the magnitude**, drawn as annular wedges
  from an inner radius rather than from the centre. The hole stops the small
  values from collapsing into an unreadable point and gives the headline
  somewhere to live.
- **A small angular gap** (about 6% of the step) between wedges, so they read as
  separate marks.
- **The peak wedge is the accent** at full opacity; the rest sit at 20% ink.
- **Category labels outside the outer ring** in the mono, the peak picked out.
- **The headline number goes in the hole**: the peak value large, and one line
  of mono under it naming when (`PEAK HOUR  15:00`).

## Budget

Eight categories, one series, one focal category.

## The reveal

Rings, then labels, then the wedges 5 frames apart going round, then the
headline. The wedges sweeping round the dial is the shot.

## Anti-patterns

- Two series on one polar chart. The inner one is unreadable by construction.
- A polar chart with no hole, so the small categories vanish.
- Using it for non-cyclic categories because it looks better than a bar chart.
