# Sankey

**Best for:** a quantity splitting and merging across stages, with band width
carrying the amount.

## Layout

- **Three stages at most**, and the widths must be true to the numbers or the
  whole type is pointless.
- **Bands leave and arrive perpendicular to their stage.** `ribbon()` uses
  cubics with horizontal handles at the midpoint, which is what lets a reader
  pick up either end of a band that crosses another.
- **Stage nodes are thin bars** (24px) at each stage's x, height proportional to
  the total passing through.
- **One source band can feed several targets**, so consume the source side
  progressively rather than resetting per link, or the bands will overlap at
  their origin.
- **The dominant path is the accent** at 30% fill; everything else at 10%.
- Labels sit outside the stage bars, name and percentage together
  (`CAPTURE  58%`).

## The headline

A Sankey in a video usually exists to deliver one number. Put it large in the
empty third of the frame, with a mono line under it: `58%` / `OF A RENDER IS
CAPTURE`.

## Budget

Three stages, eight nodes, twelve flows.

## The reveal

Stage bars, labels, then the ribbons 10 frames apart, then the headline.

## Anti-patterns

- Five stages, which is a plate of spaghetti.
- A colour per band. One hue, one accent.
- Band widths that do not sum to their node.
