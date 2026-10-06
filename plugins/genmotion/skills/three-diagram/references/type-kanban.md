# Kanban

**Best for:** work by state, with the WIP limit and the blocked item visible.

## Layout

- **No connectors.** A board's meaning is which column a card is in, and an
  arrow between columns says only "work moves right", which everyone knows.
- **Columns are zones**, titles carrying the count and the limit in the eyebrow:
  `DOING  2/2`, `BLOCKED  1`. The limit in the title is what makes it a kanban
  board rather than a list of lists.
- **Cards are nodes at a fixed width**, stacked from the top of the column with
  a constant gap, so a short column is short rather than spread.
- **The accent is the blocked column**, not the done column. The board exists to
  show where work is stuck.
- `optional` kind for done: it is finished, and it should recede.

## Budget

Five columns, twelve cards, four per column. A column with eight cards needs a
count, not eight cards.

## The reveal

Columns 6 frames apart, then cards top to bottom at a fast stagger (4 frames).
The board should feel like it fills, not like it is dealt.

## Anti-patterns

- An arrow from one column to the next.
- Avatars or swimlanes inside columns. If the board needs rows, draw a swimlane.
- Twelve cards because twelve fit. The blocked one is the point.
