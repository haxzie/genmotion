---
"@genmotion/desktop": patch
---

Template videos play again. The app's loopback proxy now forwards `Range`
upstream and passes `Content-Length` back down, so a `<video>` can do the
seek it was already being told (by `Accept-Ranges`) that it could — until
now it asked for a slice and was handed the whole file from byte zero, which
no template whose `moov` atom sits at the end of the file can start from. The
30-second deadline on the request now covers the headers rather than the
whole transfer, so a large template is no longer cut off mid-stream, and an
abandoned preview stops pulling bytes instead of running to completion.
