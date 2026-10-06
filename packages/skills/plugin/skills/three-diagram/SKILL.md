---
name: three-diagram
description: "Forty-four diagram and chart types for Three.js scenes, on three kits: nodes, zones, lanes, lifelines and orthogonal connectors that draw themselves on; scales, axes and marks; and circles, ribbons and a real axonometric projection. Architecture, flowchart, sequence, state, ER, UML, schema, timeline, swimlane, quadrant, radar, loop, tree, layers, exploded views, Venn, funnel, bar, waterfall, treemap, heatmap, line, Gantt, scatter, Sankey, fishbone, Wardley, kanban, journey and more, with the editorial design system, automatic routing, and an audit that fails the check on a broken picture."
---

# Diagrams on Three.js: pictures that arrive in the order they work

A diagram in a video has one advantage over the same diagram in a blog post: it
can arrive in the order the thing actually works. Connectors draw along
themselves, nodes land as the line reaches them, bars grow from their baselines,
an exploded view comes apart, and the camera can walk a flow instead of dumping
the whole picture in frame one.

Getting there by hand is where it goes wrong. Diagonal connectors, two arrows
leaving a box from the same point, a label sitting on the line it belongs to, an
accent colour on all nine nodes, a bar chart that fades in at full length: these
are what make a generated diagram look generated. This skill packages the
answers as three modules and audits the finished scene against them.

The design system and layout grammar are adapted from the open-source Diagram
Design skill (MIT). See `NOTICE.md` for attribution and what changed on the way
to a scene graph.

## When to use

- A Three.js scene has to show a system, a process, a hierarchy, a decision, a
  schema, a plan, or a number moving.
- Connectors look wrong: diagonal, overlapping, labels on the stroke, arrows all
  leaving a box from the same place.
- A chart needs to be read once, at speed, from across a room.
- Someone asks for "an architecture diagram", "a flowchart", "a chart" in a
  product or explainer video.

Not for: what the diagram should say or how long it holds (`direction`,
`motion-language`), the camera walking it (`three-camera`), palette and lighting
(`three-look`), the words themselves (`three-type`).

**And sometimes, not at all.** Before drawing, ask whether a reader learns more
from this than from one well-written line on screen. A list of things is a list.
Two boxes and an arrow is a sentence. The highest-quality move is usually
deletion: every node is a distinct idea, every connector carries information,
and if the relationship is obvious from the layout, remove the line.

## The three kits

Copy the ones you need into `components/`. All three need `components/stage.ts`
(`three-camera`) and `components/type.ts` (`three-type`).

| Kit | Reference | What it covers |
| --- | --- | --- |
| `components/diagram.ts` | [diagram-kit.md](references/diagram-kit.md) | Nodes, zones, lanes, lifelines, compartments, connectors, the scene wrapper, the audit. **Always needed** |
| `components/chart.ts` | [chart-kit.md](references/chart-kit.md) | Scales, axes, bars, dots, series, areas, cells, values, legends |
| `components/shapes.ts` | [shape-kit.md](references/shape-kit.md) | Circles, arcs, wedges, polygons, ribbons, trapezoids, axonometry |

Every scene is one `stage()` call: it loads the faces, lays the paper, sets the
camera, puts the eyebrow and title top left, and runs the reveal waves. The
interesting part of a diagram scene is the diagram, and forty lines of furniture
before it is forty lines in which the furniture can be wrong.

## Picking the type

Load the one reference that matches. Nothing else.

| If you're showing… | Use | Reference |
| --- | --- | --- |
| Components and connections in one snapshot | **Architecture** | [type-architecture.md](references/type-architecture.md) |
| Before and after topologies, with a change ledger | **Architecture delta** | [type-architecture-delta.md](references/type-architecture-delta.md) |
| The legacy landscape, by who owns it | **IT current-state** | [type-it-state.md](references/type-it-state.md) |
| The whole stack in one row, sources to consumers | **High-level** | [type-high-level.md](references/type-high-level.md) |
| Sequential steps, with the actor named at each | **Process** | [type-process.md](references/type-process.md) |
| Storage tiers by quality, with access policy | **Medallion** | [type-medallion.md](references/type-medallion.md) |
| A pipeline, with the role responsible for each step | **Data flow** | [type-data-flow.md](references/type-data-flow.md) |
| Many things attaching to one platform | **DP integration** | [type-dp-integration.md](references/type-dp-integration.md) |
| Per-role, per-scope permissions | **DP security matrix** | [type-dp-security-matrix.md](references/type-dp-security-matrix.md) |
| Where software runs: zones, hosts, replicas, ports | **Deployment** | [type-deployment.md](references/type-deployment.md) |
| What depends on what, with fan-in and cycles | **Dependency graph** | [type-dependency.md](references/type-dependency.md) |
| Hierarchy by containment | **Nested** | [type-nested.md](references/type-nested.md) |
| Parent to children, one path to every node | **Tree** | [type-tree.md](references/type-tree.md) |
| Ownership, routing and escalation | **Org chart** | [type-org-chart.md](references/type-org-chart.md) |
| Stacked abstraction levels | **Layer stack** | [type-layers.md](references/type-layers.md) |
| Decision logic with branches | **Flowchart** | [type-flowchart.md](references/type-flowchart.md) |
| States, guarded transitions, terminal outcomes | **State machine** | [type-state.md](references/type-state.md) |
| One process and the handoffs between people | **Swimlane** | [type-swimlane.md](references/type-swimlane.md) |
| Time-ordered messages between actors | **Sequence** | [type-sequence.md](references/type-sequence.md) |
| Work by state, with WIP limits and blockers | **Kanban** | [type-kanban.md](references/type-kanban.md) |
| A narrative backbone sliced into releases | **Story map** | [type-story-map.md](references/type-story-map.md) |
| Entities, fields and cardinality | **ER / data model** | [type-er.md](references/type-er.md) |
| Classes, operations, inheritance | **UML class** | [type-uml-class.md](references/type-uml-class.md) |
| Physical tables: SQL types, constraints, indexes | **Database schema** | [type-db-schema.md](references/type-db-schema.md) |
| Events positioned in time, gaps included | **Timeline** | [type-timeline.md](references/type-timeline.md) |
| Tasks against a calendar, critical path | **Gantt** | [type-gantt.md](references/type-gantt.md) |
| Two axes of judgement | **Quadrant** | [type-quadrant.md](references/type-quadrant.md) |
| Value chain against evolution | **Wardley map** | [type-wardley.md](references/type-wardley.md) |
| What a person does across stages, and how it feels | **User journey** | [type-journey.md](references/type-journey.md) |
| Entities scored on the same few criteria | **Radar / spider** | [type-radar.md](references/type-radar.md) |
| One series over categories that wrap | **Polar chart** | [type-polar.md](references/type-polar.md) |
| A reinforcing cycle with a hub | **Loop / flywheel** | [type-loop.md](references/type-loop.md) |
| Overlap between sets | **Venn** | [type-venn.md](references/type-venn.md) |
| A ranked hierarchy or conversion drop-off | **Pyramid / funnel** | [type-pyramid.md](references/type-pyramid.md) |
| A quantity splitting across stages | **Sankey** | [type-sankey.md](references/type-sankey.md) |
| Causes of one effect, grouped by category | **Fishbone** | [type-fishbone.md](references/type-fishbone.md) |
| Comparison across categories (and dumbbell) | **Bar chart** | [type-bar.md](references/type-bar.md) |
| A start total bridged to an end total | **Waterfall** | [type-waterfall.md](references/type-waterfall.md) |
| Part-of-whole where size is the story (and marimekko) | **Treemap** | [type-treemap.md](references/type-treemap.md) |
| Cross-tabulated values, fill carrying the number | **Heatmap** | [type-heatmap.md](references/type-heatmap.md) |
| A trend (and slopegraph, ridgeline, streamgraph, bump) | **Line chart** | [type-line.md](references/type-line.md) |
| Two variables (and bubble, beeswarm) | **Scatter plot** | [type-scatter.md](references/type-scatter.md) |
| One object pulled apart along an axis | **Exploded axonometric** | [type-exploded.md](references/type-exploded.md) |
| A floor or site seen from above at an angle | **Axonometric plan** | [type-axonometric-plan.md](references/type-axonometric-plan.md) |

Rules of thumb:

- If a three-column table says the same thing, pick the table.
- If two types seem to fit, pick the dominant axis. Behaviour may add primitives
  to a type; it never adds a second layout grammar.
- Over the budget? Split into an overview and a detail.

**Always load the chosen type reference before drawing.**

## Building one

1. **Choose the type** from the table and load its reference.
2. **Write the nodes or marks.** Composition px, y up, origin at frame centre,
   everything on the `GRID`. Node sizes from `W` and `H`.
3. **Write the connections** as one `wire()` call, in the order the system
   works. That order is the reveal order later.
4. **Call `check()` in the builder.** It reports through the error channel, so a
   broken diagram fails the project's own check instead of shipping.
5. **Reveal in waves**: structure (zones, lanes, axes), then content (nodes,
   bars, cells), then relationships (connectors, series, ribbons).
6. **Look at it.** `capture-frames` on a mid-reveal frame and a held frame. A
   diagram is the one thing in a video a viewer actually reads, so read it.

## The rules this carries

**The budget, per diagram.** 9 nodes, 12 connectors, 2 accent elements, 3 zones.
Past that it is two diagrams: an overview and a detail. `audit` enforces all
four, and each type reference carries its own tighter numbers. Target density is
about 4 out of 10: technically complete, not so dense it needs a guide.

**One accent.** `accent` goes on one or two elements; everything else is `ink`,
`muted` or `soft`. If you want to accent four things, you have not decided what
the shot is about. `SERIES` exists only for the chart types with genuinely
overlapping entities, and even there the focal series keeps the accent.

**The grid.** Node origins, sizes, gaps and padding divide by `GRID` (8px). Type
sizes come from `RAMP`; radii, stroke widths and arc samples are exempt. This is
most of what keeps a generated diagram from feeling generated, and `audit`
checks every coordinate.

**The six connector rules.** Non-negotiable, and `audit` checks each one:

1. **Orthogonal only.** Rounded right-angle elbows; a straight run only when
   both ends share an x or a y. The kit cannot produce a diagonal. The one
   exception is a fishbone, whose bones are skeleton rather than connectors.
2. **Label gap.** 14 characters at most, all caps, on an opaque plate with a
   visible gap from the stroke, beside a vertical segment, never on the line.
3. **No overlaps.** Parallel routes are fanned apart; a single crossing gets a
   hop on the lighter line.
4. **Fan attach points.** Every connector on one box edge gets its own point,
   `FAN_MIN` apart at least. No connector may hide another.
5. **No transit behind a non-endpoint box.** Reroute. Where the box is
   unavoidable, the run is dashed and the label sits at the visible end.
6. **A label never covers a node.** The kit searches for a clear placement and
   drops the label if there is none, reporting how much room it needed.

**Typography.** Node names in the sans at `RAMP.name`, weight 500. Sublabels,
tags, edge labels, axis ticks and eyebrows in the mono. Mono is for technical
content — ports, commands, paths — never as a blanket "developer" font. Every
face needs its file in `assets/` and a `withFonts` wrapper, exactly as
`three-type` requires; a family name alone silently becomes a default sans in
the export. Use `save-asset` to bring a face in.

**Anti-patterns**, beyond each type reference's own: shadows on anything
(borders, not shadows), a radius above 20px, identical boxes for every node, a
legend floating inside the art, vertical text on a connector, and a rainbow
where one hue at varying opacity would do.

## Requirements

- `components/stage.ts` and `components/type.ts` in the project, with the sans
  and mono font files in `assets/`.
- `capture-frames` to read the diagram back. Legibility and routing are frame
  checks, not code checks.
- `validate` after wiring, since `audit` reports through the error channel and
  surfaces there.

## Checks before you finish

- [ ] Would a reader learn more from this than from one line of type? If not,
      cut the diagram.
- [ ] Can any node be removed, or any two merged? Can any connector be removed
      because the layout already says it?
- [ ] `audit()` returns nothing, and the project's own check passes clean.
- [ ] At most two accent elements, and they are the two the scene is about.
- [ ] Every name legible in a held frame at full size, read back from a captured
      still rather than from the code.
- [ ] The real font in the export, not a fallback. Check a still.
- [ ] Structure reveals before content, content before relationships.
- [ ] Every mark that carries a number has that number on it.
- [ ] The finished diagram holds for 60 frames at least before the cut.
- [ ] Every colour came from `LIGHT`, `DARK` or `SERIES`, never a literal.
