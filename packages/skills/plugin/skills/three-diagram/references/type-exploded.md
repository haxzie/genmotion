# Exploded axonometric

**Best for:** one object pulled apart along a single axis: a teardown, an
unboxing, assembly order, or the parts of a system that physically stack.

## Why this type is better here

Their version hand-computes the exploded coordinates for every part. This one
projects real geometry, so **the explosion is a value of z over time**:
`lift(dz)` is the entire effect, and nothing is recomputed. Of all 44 types,
this is the one that gains most from being in a scene graph rather than on a
page.

## Layout

- **Centre the object on the origin in x and y.** A part's projected centre is
  `(x + y) / 2 + z`, which collapses to `z` when the footprint is centred. That
  is what makes leader lines trivial; forget it and every leader points at the
  wrong part.
- **Paint back to front.** Give each solid an increasing `renderOrder` up the
  stack. In an exploded stack seen from above, the top part is nearest.
- **Opaque faces.** The three faces are lighting on one colour; any translucency
  turns the stack to mud where parts overlap.
- **Leaders out to one side**, dashed at 25% ink, with the part name in the mono
  and one line of description under it. Labels never sit on the geometry.
- `SERIES` colours per part, with `accent` on the focal one.

## Budget

Five parts, five levels, one focal part.

## The reveal

1. Parts fade in assembled, 8 frames apart.
2. **The explosion**: lift each part to its final offset over 30 frames,
   `outCubic`, 7 frames apart. This is the shot.
3. Leaders, then names, then descriptions.

## Anti-patterns

- Exploding along two axes at once, which reads as scattering.
- Perspective. Axonometric means parallel; the moment it converges, the widths
  stop being comparable.
- A part too thin to see at its projected height. Minimum about 24px.
