# IT current-state

**Best for:** the legacy landscape before a programme starts. The *before*
picture, drawn to be replaced.

## Layout

- **Group by who owns it**, not by tier: finance, operations, shared. In a
  current-state the department boundary is the real boundary, and it is usually
  the reason the landscape looks like this.
- **Mostly neutral.** `external` for systems nobody here controls, `optional`
  for the spreadsheet everyone pretends is not load-bearing, `store` for the
  warehouse. One accent, on the thing the programme is about to replace.
- **Name the age.** The sublabel carries the version, the host, the language:
  `v4.2`, `on-prem`, `perl`. That is what makes the picture an argument rather
  than an inventory.

## Connectors

- Label the cadence, not the protocol: `NIGHTLY`, `MANUAL`, `ON DEMAND`. In a
  current-state, how often something runs is the finding.
- The manual path is dashed. It is the one everyone forgets and the one that
  breaks.

## Budget

Six to nine systems, three owner zones. A landscape with thirty systems is an
inventory, and an inventory is a table.

## The reveal

Zones, then systems left to right, then the flows. Let the accent system land
with the others rather than last: the point is that it is already there.

## Anti-patterns

- Drawing the target state on the same frame. That is an architecture delta.
- Accenting every legacy system. If everything is a problem, nothing is.
- Protocol labels (`SFTP`, `JDBC`) where cadence would do. Nobody is moved by a
  protocol.
