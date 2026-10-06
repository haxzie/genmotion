# Swimlane

**Best for:** one process and the handoffs between the people running it.

## Layout

- **Lanes are people, columns are time.** Each lane is a `lane()` band with its
  title in the gutter outside, never inside, so a lane's first node can start at
  the band's left edge.
- **The only interesting moment is a connector that crosses a lane.** That is a
  handoff, and handoffs are where processes fail. Label those; leave the
  within-lane steps unlabelled.
- **Steps advance left as they descend.** A node that sits directly below the
  previous one says the work changed hands but time did not pass, which is
  almost never true.
- Four lanes. Five is the practical ceiling; the title gutter and the band
  height stop working below about 160px per lane.

## Budget

Five lanes, five or six nodes, six connectors.

## The reveal

Lanes top to bottom (5 frames apart), then nodes in process order, then the
connectors with a slow stagger (12 frames). The crossings are the content, so
give them time.

## Anti-patterns

- A lane for a system. Lanes are accountable parties; a system is a node.
- Two nodes in one lane in the same column, which means the lane is two lanes.
- Using this for a pipeline where the roles do not change. That is a process.
