# UML class

**Best for:** classes, their operations, and inheritance or composition between
them. Not the other thirteen UML diagrams.

## Layout

- **`compartment()` with the stereotype in the tag**: `<<interface>>`,
  `<<abstract>>`. The tag sits above the name, so the reader knows what kind of
  thing it is before they read what it is called.
- **Five members per compartment at most.** A class box is an argument about
  responsibility, not a header file. The signatures that matter are the ones a
  caller has to know.
- **`flow: "vertical"`**, with the interface above and the implementations
  below. Inheritance runs up the frame; everyone reads it that way.
- Methods in the left column, return types in the right (`setFrame(n)` /
  `Promise`). The meta column is what keeps a box from reading as a word list.

## Connectors

- Implements / extends: dashed, labelled `IMPLEMENTS`.
- Composition and ownership: solid, labelled with the cardinality (`OWNS N`).
- Those labels need real room on the run. When the boxes are 424px wide and a
  rank apart, `audit` will tell you a 108px label has nowhere to sit, and the
  fix is to drop it rather than to shrink the gap.

## Budget

Seven classes, eight relationships, five members per compartment.

## The reveal

Classes 9 frames apart, interface first, then the relationships.

## Anti-patterns

- Private-member notation (`-`, `+`, `#`). A video reader cannot decode glyphs.
- Every getter. Nobody has ever needed to see `getId()` in a diagram.
- A class box for a data structure with no behaviour. That is an ER entity.
