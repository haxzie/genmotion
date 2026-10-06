# Fishbone

**Best for:** the causes of one observed effect, grouped by category.

## Diagonals

This is the one type whose grammar is diagonal, and it does not break rule 1.
That rule is about *connectors between boxes*; a fishbone's bones are not
connectors, they are the skeleton, and the angle is what makes six categories
readable at a glance. Build the bones with `stroke()` directly rather than
through `wire()`.

## Layout

- **A thick spine** (4px, 80% ink) running left to right into the effect box,
  with an arrowhead at the head.
- **The effect is the only node**, at the head, focal, with `EFFECT` in the tag.
  Everything else is line work and type.
- **Bones alternate above and below**, angled back toward the tail, with the
  category name in the mono at the tip.
- **Causes are short horizontal stubs off each bone** at about 34% and 64%
  along it, with the text to the right of the stub.
- Six bones, three causes each, and that is the ceiling.

## Budget

Six categories, three sub-causes each, one effect.

## The reveal

1. The spine drawing left to right, 26 frames.
2. The effect box.
3. Bones 8 frames apart.
4. Causes last, fast (4 frames).

Spine, then effect, then causes: the reader sees the problem before the
explanations, which is the order a root-cause conversation actually happens in.

## Anti-patterns

- The classic six Ms when three categories fit the problem.
- A cause with no category, floating off the spine.
- Using this for a process. A fishbone has no sequence.
