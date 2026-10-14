---
"@genmotion/three-engine": patch
---

A render host taken down no longer throws out of its own teardown. `dispose`
is idempotent and detaches its canvas with `remove()` rather than
`container.removeChild`, which threw if anything else had already moved it.
Teardown runs in a React layout effect's cleanup, so that throw reached the
nearest error boundary and the editor showed the scene as having crashed,
reporting a DOM message in place of whatever the real problem was.
