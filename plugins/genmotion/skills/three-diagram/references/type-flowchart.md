# Flowchart

**Best for:** decision logic, where the branches are the content.

## Shapes are grammar

- `pill` for a terminus: where the flow starts, and where it stops.
- `diamond` for a decision.
- `rect` for a step.
- `cylinder` for durable state.

Using one of these for a look rather than for its meaning is how a diagram stops
meaning anything.

## Layout

- **A decision takes one connector per side**, so each branch gets a vertex of
  the diamond to itself. That falls out of the attach-point rule for free: at
  N = 1 the fan point is the edge centre, which on a diamond is the vertex. Two
  connectors on one side of a diamond will both attach mid-face and look wrong.
- **Make diamonds bigger than boxes** (280 x 200 against 240 x 96). A diamond
  wastes its corners, so the same label needs more bounding box.
- **Label every branch.** An unlabelled fork is a fork the reader has to guess
  at, and `YES` / `NO` are the two most valuable words in the type.
- The accent is the happy path, drawn as one continuous accent run.

## Semantic pattern

The paired-policy-trace pattern routes here: two traces side by side with
pass / fail / skipped / not-reached per rule, and the first divergence accented.
That pattern tightens the budget to one trace pair, not two full flowcharts.

## Budget

Nine nodes, twelve connectors, two decisions. Three decisions is eight outcomes,
and eight outcomes is a table.

## The reveal

Nodes first, 7 frames apart, then connectors in execution order so the reader
walks the logic once as it draws.

## Anti-patterns

- A diamond with three outgoing branches. That is a switch; use a tree or lanes.
- `rounded-2xl` on a decision in place of a diamond.
- A flowchart for something with no decision. That is a process.
