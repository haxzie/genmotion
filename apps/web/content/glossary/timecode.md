---
term: "Timecode"
description: "A standardized way of labeling a precise position in a video, usually as hours:minutes:seconds:frames."
faqs:
  - q: "What does timecode look like?"
    a: "Timecode is written HH:MM:SS:FF — hours, minutes, seconds, and frames. The frames field counts up to the frame rate before the seconds roll over, so at 30fps 00:00:01:00 follows 00:00:00:29."
  - q: "How do I convert timecode to frames?"
    a: "Multiply out the hours, minutes, and seconds into total seconds, multiply by the frame rate, and add the frames field. Our free Timecode ↔ Frames converter does this at any frame rate."
---

**Timecode** is a notation for pinpointing an exact position in a video, typically written `HH:MM:SS:FF` — hours, minutes, seconds, and frames. The frames component counts up to the project's [frame rate](/glossary/frame-rate) before rolling the seconds over (so at 30 fps, `00:00:01:00` follows `00:00:00:29`).

Timecode is essential for talking precisely about *when* something happens. Our free [Timecode ↔ Frames converter](/tools/timecode-frames-converter) translates between timecode and a raw frame count at any frame rate.

See also: [Frame](/glossary/frame), [Frame Rate](/glossary/frame-rate).
