# Deployment

**Best for:** where software actually runs. Zones, hosts, replicas, ports.

## Layout

- **Zones are network boundaries here, not tiers.** Public, VPC, managed. The
  dashed one is the boundary that matters: what is outside it, and what is
  allowed to cross.
- **Nest them.** The managed-services zone usually sits inside the VPC zone;
  draw it that way rather than beside it.
- **Replica counts go in the name** (`app x3`), not in a badge. A reader
  scanning for capacity reads names, not decoration.
- **Ports go in the sublabel** (`:443`, `:8080`, `5432`) and in connector
  labels. This is the one type where that much protocol detail earns its place,
  because the diagram exists to be checked against a firewall rule.
- `security` kind for anything that terminates TLS or enforces a policy.

## Semantic pattern

The secure-paved-road pattern routes here: the permitted ingress path is the
accent, and anything forbidden is simply absent. Do not draw a crossed-out
arrow; an absent path is a stronger statement than a struck-through one.

## Budget

Five to six nodes, three zones, five connectors.

## The reveal

Zones outside in, then nodes in traffic order from the browser inward, then the
connectors along the request path.

## Anti-patterns

- Drawing the internet as a cloud glyph. A node named Browser is more honest.
- A zone per availability zone. That is a second diagram, and usually a table.
- Omitting the ports because they look technical. Without them this is an
  architecture diagram with worse names.
