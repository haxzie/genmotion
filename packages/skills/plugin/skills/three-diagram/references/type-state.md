# State machine

**Best for:** what a thing can be, what moves it, and where it stops.

## Layout

- **Working states are boxes, terminal states are pills.** The silhouette should
  tell you where the machine can end before you read a word.
- **The guard goes on the transition, never in the state.** `retry < 3` is a
  condition on getting somewhere, not a thing the job is.
- **Left to right for the happy path**, with failures dropping below it. A
  machine whose failure states sit in the main row reads as though failing were
  a normal step.
- The accent is the transition that does the work, not a state.

## The self-transition

A retry is not a state, and drawing it as one doubles the node count for no
information. `selfEdge()` is the one connector allowed to leave the grid:

```ts
const retry = selfEdge(running, "RETRY < 3", { skin: S });
```

It sits outside the box, so it never covers the name. One per diagram; two means
the states are wrong.

## Semantic pattern

The lifecycle-phase-map pattern routes here: one subject through phases, waits,
retries, cancellation and terminal outcomes. It adds the wait and the timeout as
first-class transitions, which is usually what a reader came to check.

## Budget

Six states, ten transitions, one self-transition.

## The reveal

States, then transitions in the order a successful run takes them, then the
failure edges, then the self-transition last. The loop arriving last is what
makes it read as "and this can happen at any point".

## Anti-patterns

- A state for every boolean. Three booleans is eight states and one diagram
  nobody reads.
- Unlabelled transitions. The label is the event; without it this is a graph.
- Bidirectional arrows between two states. Draw both, or redesign.
