# Medallion

**Best for:** tiered storage by data quality, with the access policy at each
tier.

## Layout

- **The tiers are the diagram**, so they are zones, not nodes: bronze, silver,
  gold, left to right, quality climbing.
- **Two nodes per tier**: what is in it, and who may read it. The access row is
  the half people skip, and it is the half that matters in a governance
  conversation.
- One connector per boundary, labelled with the verb that crosses it (`CLEAN`,
  `MODEL`). The accent goes on the last one: that is the promotion the business
  cares about.
- The accent node is the gold mart, the only tier a consumer touches.

## Budget

Three tiers, two nodes each, two connectors. A fourth tier means the model has
a name problem, not a diagram problem.

## The reveal

Tiers left to right, 7 frames apart, then both rows of nodes, then the two
promotions. Slow the promotions down (22 frames) so the climb reads.

## Anti-patterns

- A connector between the access nodes. Policies do not flow.
- Colour-coding the tiers bronze, silver and gold. One accent; the names already
  say it, and three metallics is a second colour system.
- Drawing the ingestion that fills bronze. That is a data flow or an
  architecture, and it is a different video.
