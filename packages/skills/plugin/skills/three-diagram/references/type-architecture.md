# Architecture

**Best for:** system overviews, integration maps, infra topology, "how a request
gets from there to here".

The layout grammar below is Diagram Design's, expressed in scene-graph terms. It
is the only visual type this skill carries so far; each new type is one more file
like this one over the same kit, and nothing else changes.

## Layout

- **Group by tier or trust boundary** — clients, services, state; or public,
  private, data. One `zone()` per group, three at most. Four or more and the
  picture wants lanes, which is a swimlane, which this skill does not have yet.
- **Pick one direction and hold it.** Left to right for a request; top to bottom
  for a stack. Mixing them is how a diagram stops being readable.
- **One or two focal nodes.** The primary integration point, the primary store,
  or the thing the video is actually about. `kind: "focal"` is editorial, not a
  severity flag; on five nodes it signals nothing.
- **Columns on a shared x, rows on a shared y.** Every run that can be straight
  should be straight, and the kit can only snap a port when the two ends are
  already within `2 * R` of each other.

A 1920x1080 frame comfortably holds three columns of 240px nodes at x = -560, 0,
560, two rows at y = +-152, and a header above. That is six nodes of a budget of
nine, which is usually the right number.

## Node kinds

| Kind | Use for |
| --- | --- |
| `backend` | A service you own. The default |
| `focal` | The 1-2 nodes the diagram is about |
| `store` | A database, a bucket, a queue's durable half |
| `external` | A third party, or anything outside the boundary |
| `input` | A person, a browser, a CLI: where the flow starts |
| `optional` | Dashed. A path that may not be taken |
| `security` | Dashed accent. A control, a gateway, a trust boundary made explicit |

The `tag` is six characters at most (`API`, `JOB`, `S3`) and the `sub` is one
technical fact: a port, a package name, a command. Never a second sentence; if a
node needs a sentence, it is two nodes or the wrong node.

## Connectors

- **Default `muted`** for internal traffic, **`link`** for HTTP and anything
  crossing a boundary, **`accent`** for the one path the video is following.
  Accent on every arrow is the same mistake as accent on every node.
- **Dashed** for optional, passive, return, async. The dash is semantic weight,
  not a different routing grammar: the kit routes it identically.
- **Labels are 14 characters at most, all caps.** `ENQUEUE`, `WRITE`, `HTTP`. If
  the relationship is obvious from the layout, drop the label. The kit will find
  somewhere clean to put it, and `audit` tells you when it could not.
- **Everything else is the kit's.** Ports, attach points, corridors, hops and
  label placement are decided in `wire()`; see `diagram-kit.md` section 3.

## The reveal

A diagram in a video has one advantage over the same diagram in a post: it can
arrive in the order the system works.

1. **Zones first**, over about 16 frames. They are the stage, not the content.
2. **Nodes in a wave**, left to right, 6 frames apart, 14 frames each. The whole
   cast is on screen before anything moves between them.
3. **Connectors in flow order**, 11 frames apart, 20 frames each. This is the
   story: request in, work enqueued, state written. The line draws along itself
   over the first 80%, then the head and the label land.
4. **A slow settle** on the group (1.015 to 1.0 over about 150 frames) so the
   held frame is never completely static.

Hold the finished diagram for at least 60 frames before cutting. A reader needs
longer with a diagram than with a line of type, and the whole reason to draw one
is that they read it.

For a longer piece, reveal one zone at a time and let the camera walk the flow
rather than showing the whole picture at once. Camera moves are `three-camera`.

## Anti-patterns

- Every box accented, which collapses the hierarchy.
- A bidirectional arrow where one direction is obvious from context.
- A legend floating inside the diagram area. If the kinds need explaining, put
  the strip below the art, outside the zones.
- Nine nodes because nine fit. Four nodes that are each worth a sentence beat
  nine that are not.
- Animating the nodes and the edges at the same time. The eye cannot follow a
  line that is drawing toward a box that is still arriving.
