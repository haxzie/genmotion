# @genmotion/three-engine

## 0.2.0

### Minor Changes

- 15355a0: Add layout, frame-math primitives and a layout audit.

  Three.js scenes had no layout primitive: a canvas texture is drawn top-left
  with y down, a plane is positioned from its centre with y up, and every UI
  element crossed that boundary by hand. Container sizes were declared
  (`const H = 600`) rather than derived, so adding a row to a card overflowed it
  into the footer with nothing to report it.

  - `solve(spec)` — a deterministic flex/stack solver with intrinsic sizing, so a
    container is as big as its children. `place()` does the centre-origin,
    y-up conversion once; `mount()` positions a whole tree of `Element`s.
  - `Element` — `{ object, size }`, the protocol that lets the solver measure a
    label, a chip or a device mockup without being told their dimensions.
  - `auditRects()` — layout problems as `AuditFinding`s (partial overlaps,
    near-miss alignment, off-grid edges, invisible boxes). A free function over
    named rects, so the same rules run on the solved tree and on the boxes
    projected out of a rendered frame. Findings carry a severity: an overlap is
    a fact, a near-miss is a heuristic.
  - `prog` / `between` — frame progress. Two names because the templates
    disagreed about whether a third positional number was a duration or an end
    frame, and both readings are plausible at a call site.
  - `clamp01`, `lerp`, `hash1`/`hash2` (a deterministic stand-in for
    `Math.random`), `track` (monotone-cubic keyframes), `springValue`/`springIn`
    (closed form, so a spring survives a seek).
  - `Easing` gains `inCubic`, `outCubic`, `inOutCubic`, `outQuad`, `outQuart`,
    `outExpo`, `inOutSine`, `outBack`, plus `trunc` and `bezier`. Additive — the
    four original curves are unchanged.

  All of these were being re-derived per project: an audit of the 14 Three.js
  templates found ten copies of `measure`, seven of `prog` and five of
  `withFonts`, no two alike.

### Patch Changes

- Updated dependencies [93c8127]
- Updated dependencies [75b522f]
  - @genmotion/shared@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [5ba9426]
  - @genmotion/shared@0.2.0

## 0.1.0

### Minor Changes

- 4169473: First public release: the `genmotion` CLI (init, dev, render, still, check, info,
  scene add, mcp, skills, templates, browser, doctor), `npm create genmotion`, and
  the Three.js engine runtime that scenes are written against.

### Patch Changes

- Updated dependencies [4169473]
  - @genmotion/shared@0.1.0
