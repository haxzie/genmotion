# Loop / flywheel

**Best for:** a reinforcing cycle where the last step feeds the first and a hub
accumulates what the loop produces.

## Layout

- **Arcs, not elbows.** This is the one type whose connector grammar is curved,
  because the curve is what says "this comes back round". Use `arc()` from the
  shape kit at a radius about 96px outside the node ring, with a gap at each end
  so the arc clears its nodes.
- **Four or five steps.** At six the ring gets too big to label and too slow to
  read.
- **Snap the ring positions to the grid.** Trigonometry does not land on 8px
  boundaries; round it, or `audit` will say so.
- **The first step is the accent**, along with the arc leaving it, so the eye
  knows where to start going round.

## The hub

Without it a flywheel is just a cycle. The hub sits at the centre, `store` kind,
and the write-backs are dashed 20% ink spokes from each step into it. Those
spokes are the reason the loop compounds rather than merely repeats, and they
are the last thing to arrive.

## Budget

Five steps, one hub, five arcs, five spokes.

## The reveal

Steps round the ring 9 frames apart, then the hub, then the arcs 12 frames apart
going round, then the spokes. The order is the argument: here are the steps,
here is what they feed, here is how they connect, here is what accumulates.

## Anti-patterns

- Orthogonal connectors in a ring, which read as a square.
- A loop with no hub, which is a cycle and usually a state machine.
- Six or more steps, at which point nothing is labelled.
