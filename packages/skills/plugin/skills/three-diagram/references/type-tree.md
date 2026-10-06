# Tree

**Best for:** strict parent-to-children decomposition, one path to every node.

## Layout

- **Three levels, never four.** Past that the leaves are too small to label and
  the picture wants to be two diagrams: an overview and one branch.
- **`flow: "vertical"`**, so every connector leaves a bottom and arrives at a
  top however far apart two nodes are horizontally.
- **Children centred under their parent**, and siblings evenly spaced. An
  uneven tree reads as a bug even when the data is uneven.
- The root is the accent. It is the only node whose job is to be the subject.

## Semantic pattern

The traceable-block-decomposition pattern routes here. Its extra primitive is
the ID in the type tag (`1`, `1.1`, `1.1.2`), which turns the picture into
something a specification can reference. Use the tag for the ID and the sublabel
for the interface, not the other way round.

## Budget

Nine nodes, four levels maximum, three levels in practice.

## The reveal

Nodes level by level, 6 frames apart, then connectors. A parent is always on
screen before its children arrive, which is what makes the shape legible as it
builds rather than only once it is done.

## Anti-patterns

- A node with one child. Merge them; they are one idea.
- Cross-links between branches. The moment one exists this is a dependency
  graph, and a tree drawn over one is a lie.
- Labels on the connectors. In a tree every edge means the same thing.
