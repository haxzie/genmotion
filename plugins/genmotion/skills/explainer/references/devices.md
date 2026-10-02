# Visual devices and data-viz rules for explainers

Read this when a scene has to show something invisible (a system, a protocol, an abstraction) or a number. Frames at 30 fps. Timings for every move are in `motion-language`.

Contents: 1 Metaphors for common concepts · 2 Diagram grammar · 3 Data-viz rules · 4 Hooks for explainers

---

## 1. Metaphors for common concepts

Pick one per concept and keep it for the whole film. The metaphor must survive the swap test: built from the subject's own nouns, not a generic icon set.

| Concept | Device that shows it |
| --- | --- |
| Request / response, APIs | A packet (one recurring shape) travelling a path between two labelled boxes; the response is the same packet returning changed |
| Caching | A shelf beside the road: the second trip stops at the shelf and comes back in a third of the time (show the time) |
| Encryption (symmetric, session traffic) | A packet sealed in a box that **both ends open with the same key**; the key itself never travelled; the box is visibly opaque in transit |
| Key exchange (Diffie–Hellman) | Paint mixing: each side mixes its private colour into the other's public mix and both arrive at the same colour; an eavesdropper holding both public mixes cannot unmix them. Call them "public shares", **never "halves" of a key** |
| Public-key signatures, certificates | **Show the attack it stops first** (an impostor in the middle swapping in its own key share), then the check that stops it: the server **signs the handshake, including the key shares it saw**, with the private key that its authority-signed certificate names. Label what is signed (`sig(shares)`, not a bare "sig ✓"). If the impostor relays that signature, the client's check **fails**, because the share the client received is not the share that was signed: ✗ at the client, connection closed. The impostor cannot sign its own share without the private key. Never show a ✓ while a swapped share is in place, and never let the keys "heal" without a fresh exchange: show a clean rerun with no impostor, and only then the ✓ and the agreed key |
| Sync, replication | Two (or three) identical boards; a stroke drawn on one appears on the others with a visible delay |
| Queues, backpressure | Items lining up at a narrow gate; the line grows when arrivals outpace the gate |
| Load balancing | One stream splitting across N lanes; one lane fails and its items re-route |
| Databases by type | One record drawn as a row (relational), a document card (document), nodes and edges (graph), a key tag on a value (key-value) |
| Machine learning training | A dial being nudged toward a target over many small steps; the error line falling |
| Compound growth | A stack that adds a proportion of itself each step, the steps getting visibly larger |
| Latency, distance | A literal road whose length is the delay; shorten the road, not a number |
| Permissions | Doors with badges; a badge opens some doors and not others |

## 2. Diagram grammar

- **Build order is reading order**: left to right, top to bottom, cause before effect. The first element to draw is the one the VO names first.
- **Labels sit on the thing**, never in a legend, at `three-type`'s label size (28–34 px) in full-contrast ink, not the muted tone. If a part must be studied, make the part bigger, not its label: at the click, the parts that matter are ≥ 15% of the frame's height.
- **Parked objects get a reserved slot** that clears every label: an object waiting "inside" a node larger than the node is hidden while parked, not just overlapped.
- **At most 5 boxes on screen at once**; a bigger system is shown as a whole (pulled back, details unreadable on purpose) and then entered part by part with a push.
- **Arrows draw in the direction of flow** over 8–12f, outCubic; the head appears in the last 3f.
- **Emphasis** is one colour (the red pen in family F, the brand accent elsewhere) on one element at a time.
- **Diagrams clear** when the idea ends (board erase, or exit-then-cut); never leave an old diagram dimmed in the background "for context".

## 3. Data-viz rules

- **One number per scene**, huge, counted up (40–48f for a small stat, 120–210f for a hero number, ease-out cubic) and held ≥30f after it lands.
- **Bars over pies.** A pie with more than 2 slices cannot be read in 3 seconds. Bars start at zero.
- **No legends**: label each series at its end. **No dual axes.** **No dashboards**: one chart per scene, at most two series.
- **Give the number a unit the viewer can feel**: "enough water for 2,000 homes" beats "1.2 million litres", shown beside the exact figure.
- **Lines draw on with the count**: the chart's head and the counter run off the same eased progress so they settle together.
- **Comparisons share an axis and a beat**: both bars grow at once on the same easing; the difference is what lands.
- **Sources** go on screen (28 px, the floor; muted, still ≥ 4.5:1) for any number a viewer might quote.

## 4. Hooks for explainers

The first 2–4 s (60–120f) earn the rest. Options, in order of how often they work:

1. **The question itself**, on screen and in the VO: "What actually happens when you press Send?"
2. **A surprising number**: "Every Google search uses this much energy." (Then show it.)
3. **A wrong intuition**: "Most people think a database is a spreadsheet. It isn't."
4. **The end state first**: the finished diagram for 30f, then erase and build it properly.
5. **The danger, happening**: the failure or attack the film defends against, already in motion at frame 0 (a leak spreading across a dependency graph, a stampede of requests hitting one database, a forged message being accepted), with the question or the cost on screen by 1 s. Best for security and reliability topics, where the threat is the reason to watch.

For YouTube as much as feeds: the tension is on screen by 1 s (30f) and frame 0 is already moving; a headline typing in over an empty diagram is setup, not a hook.

Never open on "In this video we will…", a logo or an agenda slide.
