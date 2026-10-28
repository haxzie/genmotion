---
"@genmotion/desktop": patch
---

The template galleries are laid out by a real masonry grid. Cards fill left to
right, newest first, each pulled up under the one above it — rather than CSS
columns, which filled one column top to bottom before starting the next and so
put the newest template beside the oldest. Every card declares its own aspect
ratio, so the layout no longer waits on a poster decoding or on a `matchMedia`
list that only resolves after hydration, and the grid stops jumping on load.
