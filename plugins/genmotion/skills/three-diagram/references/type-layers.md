# Layer stack

**Best for:** stacked abstraction levels, each resting on the one below.

## Layout

- **No connectors.** A stack already says "this rests on that", and an arrow
  between two touching bars is noise. This is the second of the two types in the
  set with no `wire()` call.
- **Full-width bars at a constant height** (112px) with a constant gap (16px).
  Varying the heights implies a quantity, and a layer stack has none.
- **Name on the left, sublabel under it.** The sublabel is what makes a layer an
  argument rather than a word: `TypeScript, one file each`, `render host, frame
  barrier`.
- **The top layer is the accent**, because in almost every stack the top is the
  part the audience writes or touches.
- An optional mono note at the right of the top and bottom bars (`YOU WRITE
  THIS`, `SHIPPED FOR YOU`) is the cheapest way to make a stack mean something.

## Semantic pattern

The governance / control-catalog and compensating-layers patterns both route
here: controls grouped by where they are enforced, with residual risk
propagating up. Both add a right-hand column of annotations rather than any new
geometry.

## Budget

Six layers. Five is better.

## The reveal

**Bottom up**, 9 frames apart, the way the thing was actually built, then the
notes. Revealing top down makes the stack look like it is being excavated.

## Anti-patterns

- Arrows between layers.
- A layer for something that is not an abstraction boundary.
- Perspective or 3D plates. That is an exploded axonometric, and it is a
  different type with different rules.
