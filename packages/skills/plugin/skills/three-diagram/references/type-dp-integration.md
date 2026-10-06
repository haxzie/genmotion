# DP integration

**Best for:** the topology of a data platform: what plugs in on the left, what
consumes on the right, one thing in the middle.

## Layout

- **The core is one node, not a zone.** The whole point of the type is that many
  things attach to one thing, and a box carries that where a container does not.
  Make it visibly larger (320 x 288 against 240 x 104) and give it the accent.
- **Sources fan in from the left, consumers fan out to the right**, each in its
  own zone. The symmetry is the message: one platform, two populations.
- `external` for everything that is not yours. Most of both columns usually is.
- The fan is where attach points earn their keep: three connectors into one edge
  get three distinct points automatically, so the core never sprouts a single
  overloaded arrow.

## Budget

Three sources, three consumers, one core, six connectors.

## The reveal

Zones, then sources, then the core, then consumers, then the connectors fanning
in and out at 9 frames apart. Let the core arrive in the middle of the node
wave, not first: it should feel like the thing everything found.

## Anti-patterns

- Decomposing the core. Its internals are a different diagram, and putting them
  here destroys the hub-and-spoke silhouette that is the whole type.
- Labelling every spoke. The zones already say source and consumer.
- More than three on either side: the fan stops being legible and the attach
  points run under `FAN_MIN`.
