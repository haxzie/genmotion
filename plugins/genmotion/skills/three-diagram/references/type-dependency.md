# Dependency graph

**Best for:** what depends on what, when there is fan-in or a cycle that a tree
cannot express.

## Layout

- **Ranks down the frame**, apps at the top, leaves at the bottom. The question
  is always "what does this need", and the answer should always be below.
- **`flow: "vertical"`.** Without it the router picks side ports for widely
  separated nodes and puts several connectors on the same horizontal lane at the
  rank's y, which is rule 3 every time.
- **Leave room between ranks.** Several routes converge on one node from above,
  and each needs its own corridor in the band between the two ranks. 240px of
  rank separation holds four; at 200px `audit` will tell you they do not fit.
- **The accent is the most depended-on node**, which in a real graph is the
  thing to be careful with and is usually not the one anyone expected.

## The cycle

A cycle is the finding, not the shape. Draw it dashed, label it `CYCLE`, and
force both ports to `bottom` so it runs clear of the forward edges:

```ts
{ from: "types", to: "core", label: "CYCLE", dashed: true, fromSide: "bottom", toSide: "bottom" }
```

One cycle per diagram. Two means the picture is a finding list, which is a
table.

## Budget

Nine nodes, fourteen edges, four ranks, one cycle.

## The reveal

Nodes rank by rank, 5 frames apart, then edges in dependency order. Fast
stagger: a dependency graph is read as a mass, not as a sequence.

## Anti-patterns

- Arrows pointing up. Pick "depends on" and hold it.
- A node for every package. Nine, chosen.
- Mixing runtime and build dependencies without saying which is which.
