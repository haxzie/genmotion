---
"@genmotion/desktop": patch
---

Gallery cards play a small preview rendition on hover instead of the full
video. A card is a few hundred pixels wide and the full file is the same
footage at up to eighty times the weight — fetching it was most of why
hovering the gallery felt broken. Falls back to the full video for any
template that has not been re-rendered yet, so nothing waits on the catalog.
