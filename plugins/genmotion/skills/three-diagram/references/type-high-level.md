# High-level

**Best for:** the end-to-end stack in one frame: sources in, consumers out, the
platform in the middle.

## Layout

- **One outer zone** for the boundary everything sits inside (a cluster, an
  account, a VPC), dashed, with the rest of the picture inside it.
- **One row, left to right, and it never doubles back.** A high-level picture
  that needs a return arrow is really two diagrams.
- **Fan in at the left, fan out at the right.** Sources collapse into one
  ingest; one transform expands to several consumers. That silhouette is the
  type: wide, narrow, wide.
- The accent is the stage the video is about, usually the transform.

## Spacing

This type packs the most nodes into one row, so it is where the label gap bites.
The gap between two nodes on a row must exceed the widest label on the run plus
about 24px. `audit` tells you the exact number when it cannot place one.

## Budget

Seven nodes, six connectors, one outer zone. At nine the row stops fitting at a
readable node width.

## The reveal

1. The outer zone, 16 frames.
2. Nodes left to right, 6 frames apart, so the stack assembles in flow order.
3. Connectors in the same order, 10 frames apart.

## Anti-patterns

- Zones inside the outer zone for every tier: the row already says the order.
- Labelling both branches of a fan-out with the same word. Label one, or none.
- A bidirectional arrow anywhere. At this altitude nothing is bidirectional.
