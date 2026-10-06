# Waterfall

**Best for:** a start total bridged to an end total by signed contributions. A
budget bridge, a headcount delta, where a latency budget went.

## Layout

- **Each bar starts where the last one finished.** The connecting ticks are not
  decoration: they are what makes the picture a bridge rather than a row of
  bars. Draw them at 22% ink between the top of one bar and the start of the
  next.
- **Totals are grounded, contributions float.** The first and last bars run from
  zero; everything in between hangs off the running cursor. Mark the totals in
  `ink` and the contributions in `muted`.
- **Decreases get the accent.** In almost every waterfall worth drawing, the
  savings are the story. If the increases are the story, accent those instead,
  but only one direction.
- **Signed labels**: `-64`, `+12`, and the totals unsigned. The sign is the
  content.

## Budget

Eight bars including both totals, one subtotal.

## The reveal

Axis, names, then the bars 10 frames apart left to right, with each bridge tick
landing just after its bar. The cursor walking down the frame is the shot.

## Anti-patterns

- Floating bars with no connecting ticks, which is just a confusing bar chart.
- Two subtotals. One is a bridge; two is a table.
- Colour for positive and negative *as well as* the sign. The sign is enough,
  and the second encoding spends the accent.
