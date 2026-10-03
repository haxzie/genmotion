---
"@genmotion/cli": minor
---

The bundled skill pack is rebuilt around direction and taste. A new `direction` skill is read before any owner is chosen; `launch-taste` teaches when each launch-film style fits a message (including short title-card launches for X and feeds); `motion-language` and `sound-design` carry the house timing and mix numbers; `video-editing` edits footage the user brings (podcasts, talking heads, trailers, launch cuts, social edits); `device-mockup` draws a modern phone frame and app UI kit for screen-led films, with 9:16 feed framing that keeps the product clear of platform UI. Every existing skill is rewritten with frame-budgeted beat sheets and verifiable checks. Adds the `music` and `transcribe` capabilities.

Sound: with no track supplied, `sound-design` now finds a free CC0 / CC BY track on the web, verifies its licence and credits it, detects its tempo, downbeats and drop, and fits the scenes to its beat. Feed films master to −14 LUFS with a recipe tested on real recorded effects. Whoosh/swoosh effects and synthesised noise beds (room tone, "air") are banned outright.

MP4 and MOV renders now keep `+faststart` through the segment join and the audio mux, so a browser can start playing before the whole file has downloaded.

A render's audio now runs the full length of the picture: when the last clip ends early, the mix is padded with silence instead of ending short.
