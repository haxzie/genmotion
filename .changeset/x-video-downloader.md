---
"@genmotion/desktop": patch
"@genmotion/cli": patch
"@genmotion/shared": patch
---

Agents can pull the video out of a post on X. In the studio, paste an x.com link in the chat and `download_x_video` lands the clip in the project's `assets/`, with who posted it and what the post said, so it can be quoted on screen. The CLI has the same thing without an account: `genmotion x-video <post url>`, and `download_x_video` over MCP. Posts are resolved through X's own embed endpoint, which needs no key and no login, and the file comes straight from `video.twimg.com`, so no video passes through our servers. The best rendition is taken by default (`--quality smallest` for a clip that plays inside a phone mock), stepping down the ladder when the top one is over 100MB. Skills name it as the `x-video` capability.
