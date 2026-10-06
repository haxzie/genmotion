# Process

**Best for:** a sequential run of steps where the question at each one is "who
has it now".

## Layout

- **Stages left to right, one row**, with a zone over each naming the actor.
  That zone is what separates a process from a flowchart: the flowchart asks
  what happens next, the process asks who it happens to.
- **One node per stage.** If a stage needs two boxes it is two stages.
- The accent is the longest stage, or the one the video is about to fix.
- Sublabels carry duration (`2 days`, `5 days`). A process with no durations is
  a list of nouns.

## The rework loop

Almost every real process has one, and it is the reason to draw the diagram.
Route it from the bottom of the later stage back to the bottom of the earlier
one, dashed, labelled `REWORK`:

```ts
{ from: "review", to: "build", label: "REWORK", dashed: true, fromSide: "bottom", toSide: "bottom" }
```

Forcing both ports to `bottom` keeps it clear of the forward run instead of
fighting it for the same lane.

## Budget

Five stages, five zones, one loop. Six stages fit only at a node width too
narrow to label.

## The reveal

Zones, then stages left to right, then the forward connectors in order, then the
rework loop last. The loop lands as a punchline, which is what it is.

## Anti-patterns

- A decision diamond. That is a flowchart; this type's branches are handoffs.
- Durations in the node name instead of the sublabel.
- Two actors sharing a zone because they sit next to each other.
