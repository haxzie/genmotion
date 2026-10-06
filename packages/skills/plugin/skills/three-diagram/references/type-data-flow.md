# Data flow

**Best for:** a pipeline where the interesting question is which role is
responsible for each step.

## Layout

- **Role bands, not zones**: producer, platform, consumer, stacked down the
  frame, each band one `lane()`. The band is the answer and the node is only the
  verb.
- **A connector that crosses a band is a handoff**, and handoffs are where
  pipelines go wrong. Those are the connectors worth labelling.
- The accent is the contract or the schema: the thing that makes the handoff
  safe. Accent the band title too, so the eye starts where the ownership is.
- Three or four bands. Five is a swimlane, and swimlanes are for processes.

## Semantic pattern

This is the type the fan-in-queue and unstructured-to-structured patterns route
to. Both are about what happens *to* the data between two owners, which is
exactly what the bands carry.

## Budget

Six nodes, five connectors, four bands.

## The reveal

Bands first, 6 frames apart (they are the stage). Then nodes band by band, then
the flows in pipeline order. The crossings land last, which is right: they are
the conclusion.

## Anti-patterns

- A band for a system rather than a role. "Kafka" is not a role.
- Labelling every connector. Label the ones that cross a band.
- Boxes that name a technology instead of an action. The band says who, the node
  should say what they do.
