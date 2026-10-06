# ER / data model

**Best for:** entities, the fields that carry their meaning, and the cardinality
between them.

## Layout

- **`compartment()`, not `node()`.** Height derives from the row count, so a row
  of entities with different field counts shares a top edge rather than a centre
  line. Pass `top` instead of `y` when you want that alignment.
- **Only the fields that carry the relationship or the meaning.** An entity
  listing all twenty of its columns is a schema dump, and the reader stops at
  about six.
- **Keys in `accent`.** The primary key and every foreign key, so the joins are
  visible without reading a word. That is the one place accent is allowed to
  appear more than twice, because it is a treatment on a row rather than a focal
  mark on a node.
- The root entity is the focal one: the thing the model is organised around.

## Connectors

Label the cardinality and nothing else: `1 - N`, `N - N`, `1 - 1`. The verb
belongs in the field name.

## Budget

Eight entities, six rows each. Four entities is usually the right number for a
video.

## The reveal

Entities 9 frames apart, then the relationships with a slow stagger (12
frames). Let each entity land fully before the next: a reader has to read the
rows, and rows take longer than node names.

## Anti-patterns

- Crow's feet as well as a cardinality label. Pick one notation.
- Drawing the join tables. They are plumbing; name the relationship `N - N`.
- Using this when the types are real. That is a database schema.
