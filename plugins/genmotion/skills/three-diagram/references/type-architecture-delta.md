# Architecture delta

**Best for:** a migration, a rewrite, a before-and-after of a topology. Not an
attribute change: if only the labels differ, that is a table.

## Layout

- **Two zones, side by side**, titled BEFORE and AFTER. The before side is
  dashed: it is the thing being left behind.
- **Register the halves.** A component that did not change must sit at the same
  relative position in both. If the reader has to hunt for the same box twice,
  the diagram has failed before the first arrow.
- **Four nodes a side at most.** A delta is twice the diagram in the same frame,
  so halve the usual budget.
- **One accent, on the after side**: whatever is new, or whatever moved.

## The ledger

A reader cannot diff two pictures by eye. Under the art, three to five lines in
the mono, each prefixed:

- `+` added, in `ink`
- `~` changed or re-pointed, in `ink`
- `-` removed, in `soft`, because it is already gone

Every structural change gets a line. A change with no line is a change the
reader will assume they misread.

## The kit

Two `wire()` calls, one per side, and `check(before, after)` with both. Keep the
two sides as separate wirings: routing one against the other would let a
connector on the left fan against a node on the right.

## The reveal

1. Both zones, 8 frames apart, before first.
2. All nodes, left side then right, 6 frames apart.
3. Connectors, before side then after.
4. The ledger last, one line at a time, 9 frames apart. The reader has seen both
   pictures by then and is ready to be told what changed.

## Anti-patterns

- Different layouts either side, so nothing lines up.
- Colour-coding added and removed on the nodes instead of in the ledger: a green
  box and a red box is a traffic light, not an argument.
- An arrow between the two halves. They are two moments, not two systems.
