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
| Encryption | A packet locked into a box whose key only one side holds; the box is visibly opaque in transit |
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
- **Labels sit on the thing**, never in a legend. Label type ≥40 px on 16:9 (≥32 px in a 9:16 frame at 1080 wide).
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
- **Sources** go on screen (24–28 px, muted) for any number a viewer might quote.

## 4. Hooks for explainers

The first 2–4 s (60–120f) earn the rest. Options, in order of how often they work:

1. **The question itself**, on screen and in the VO: "What actually happens when you press Send?"
2. **A surprising number**: "Every Google search uses this much energy." (Then show it.)
3. **A wrong intuition**: "Most people think a database is a spreadsheet. It isn't."
4. **The end state first**: the finished diagram for 30f, then erase and build it properly.

Never open on "In this video we will…", a logo or an agenda slide.
