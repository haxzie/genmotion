---
"@genmotion/desktop": patch
---

The voice picker plays its previews again. Nothing in the chain from the play
button to object storage had a deadline, so a store that stopped answering
left the button spinning rather than falling back to the source — the
`.catch(() => null)` that was supposed to handle exactly that can only run if
the read fails, and an unreachable store does not fail, it waits. Cache reads
now give up after three seconds and the desktop's binary requests time out
with an error the picker can show.
