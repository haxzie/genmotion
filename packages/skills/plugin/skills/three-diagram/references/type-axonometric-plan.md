# Axonometric plan

**Best for:** one floor or site seen from above at an angle: rooms, zones,
buildings by phase.

## Layout

- **A plan is an exploded view that was never exploded**, so it shares the whole
  projection with `type-exploded.md`. Read that file's geometry notes first.
- **Work on a grid of squares** (`U` px per square) and express every room in
  grid units. Fractional positions in an axonometric drawing never line up.
- **Translate the whole figure by the projected centre of the grid**, not by
  half its width. An iso drawing is not centred on the middle of its own
  footprint, and skipping this leaves it high and right with half the frame
  empty.
- **Paint back to front**: sort rooms by `x + y` and give each an increasing
  `renderOrder`.
- **Height carries importance, not storeys.** The focal room is tallest; the
  corridor is lowest.
- **Labels go in their own group with a higher `renderOrder` than every solid.**
  three.js sorts by the nearest ancestor group's order before the mesh's own, so
  a label left loose beside the rooms paints underneath the room it names.
- **Label colour is white, not `soft`.** A room label sits on a saturated fill
  and needs contrast against that fill, not against the paper. `tag()` takes a
  `color` override for exactly this.

## Budget

Eight tagged rooms, one focal. Past eight, nothing can be labelled in place and
every room needs a leader line, which is a different drawing.

## The reveal

The floor slab drawing its outline, then rooms back to front 8 frames apart,
then the labels. The slab first gives the rooms something to land on.

## Anti-patterns

- Furniture. At this scale it is texture, and it costs the room labels their
  space.
- A second storey on the same frame. That is two plans.
- Rooms that do not tile the slab, leaving gaps that read as mistakes.
