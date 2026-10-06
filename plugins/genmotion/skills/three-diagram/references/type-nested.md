# Nested

**Best for:** hierarchy by containment, where the scope is the point.

## Layout

- **Containment carries the hierarchy, so there are no connectors at all.** An
  arrow from an outer box to an inner one says nothing the nesting has not
  already said. This is the only type in the set with no `wire()` call.
- **Each level steps in by 64px** on every side, so the margin reads as
  deliberate rather than as a near-miss.
- **Three levels.** Six is the theoretical ceiling and nobody has ever read one.
  At four, the innermost boxes are too small to carry a sublabel.
- The eyebrow on each level names the scope: ORGANISATION, ACCOUNT, PROJECT.

## The reveal

Outside in, 10 frames apart, then the leaf nodes. The order matters: the reader
needs the scope before the contents, and reversing it makes the outer boxes feel
like they were added as an afterthought.

## Budget

Three levels, three or four leaf nodes.

## Anti-patterns

- An arrow anywhere in the picture.
- Levels that differ by less than 40px of inset, which reads as a rendering bug.
- Using this for a tree. Containment means "is inside"; a tree means "owns".
  If a child could belong to two parents, neither type fits.
