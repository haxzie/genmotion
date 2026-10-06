# Database schema

**Best for:** the physical tables. The difference from an ER diagram is that
this one is true: a reader can write the migration from the picture.

## Layout

- **Real SQL types in the meta column**: `uuid pk`, `bigserial pk`,
  `timestamptz`, `int4range`, `text not null`. If you would not put it in the
  DDL, do not put it here.
- **Constraints are content, not decoration.** `pk`, `fk`, `not null`, and the
  indexes as their own rows (`idx_status_started  btree`). An index row is often
  the single most useful line in the diagram.
- **Keys in `accent`**, same as ER.
- The schema name goes in the tag (`public`, `analytics`).

## Connectors

`1 - N`, `1 - 1`, and nothing else. The foreign key column already names the
relationship.

## Budget

Five tables, eight shown columns, six foreign keys. A schema with forty tables
is an overview diagram plus one detail diagram per cluster.

## The reveal

Tables 10 frames apart, then the keys. Slow: this is the densest type in the
set, and a reader is scanning for a specific column.

## Anti-patterns

- Hiding the index that makes the design work.
- Showing every column so the box has to shrink below readable type.
- An ER diagram with types bolted on. Either the picture is physical or it is
  conceptual; a half-physical one gets built wrong.
