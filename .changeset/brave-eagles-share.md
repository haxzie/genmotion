---
"@genmotion/desktop": patch
---

Template video moves to a bucket of its own. The main bucket also holds
`projects/` and `shares/`, which stay private only because every read of them
goes through an authenticated, org-scoped route — so it can never carry a
public hostname. `TEMPLATES_BUCKET` holds the world-readable objects and
nothing else, which is what makes serving them from a CDN safe: a bucket with
nothing private in it cannot leak anything private, however it is fronted.
Unset, it falls back to the main bucket and nothing changes.
