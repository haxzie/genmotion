# Gantt

**Best for:** tasks against a calendar, when the critical path is the question.

## Layout

- **Horizontal bars** (`bar({ horizontal: true })`), one row per task, rows in
  start order so the picture steps down and to the right.
- **The accent is the critical path**, which is the only thing anybody actually
  wants from a Gantt chart. Everything off it is `muted` at 75% opacity.
- **Task names in the mono, right-aligned in a left gutter**, accent for the
  critical ones so the path reads down the names as well as across the bars.
- **Today is a rule, not a label**: a 2px 30% ink vertical line through the
  plot. It needs no explaining.
- Grid rules from the x axis up through the plot, at 6% ink.

## Budget

Twelve tasks. Six reads better.

## The reveal

Axis, then names, then the bars growing left to right 8 frames apart, then the
today line last. The today line arriving at the end is what turns a plan into a
status report.

## Anti-patterns

- Dependency arrows between bars. If the dependencies matter, draw a dependency
  graph; a Gantt with eight arrows is unreadable.
- Percent-complete shading inside the bars, which is a second encoding competing
  with the accent.
- A row per person. That is a swimlane.
