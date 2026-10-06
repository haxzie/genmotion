# Sequence

**Best for:** time-ordered messages between actors. The one type where the
animation and the content are the same thing.

## Layout

- **Time runs down the frame**, so the y of a message *is* its time and the
  reveal order *is* the sequence. Messages must arrive in order and must never
  move once placed.
- **Four lifelines; five is the ceiling.** Past that the horizontal runs get too
  long to follow across.
- **Messages are straight lines, deliberately not routed.** A sequence has no
  topology to route: the lifelines are fixed and every message is horizontal.
  Putting them through the orthogonal router would invent elbows that mean
  nothing, which is why `message()` exists separately from `wire()`.
- **Returns are dashed.** A solid line is a call; a dashed one is an answer.
- **The activation bar is the question the diagram usually exists to answer**:
  who is waiting, and for how long. Accent the one that matters.

## Message labels

The real method or path: `POST /device/code`, `session token`. This is the one
type where a lowercase technical string beats an all-caps verb, because the
reader is checking it against code.

## Budget

Five lifelines, six to eight messages, one combined fragment, two alt regions.

## The reveal

Lifelines left to right (6 frames apart), then messages in order with a long
stagger (14 frames). Resist speeding it up: the whole point is that the viewer
reads one exchange at a time.

## Anti-patterns

- A message that skips backwards up the frame.
- Lifelines for things that never send or receive.
- Elbowed messages. If two actors need a bend between them, they are in the
  wrong order.
