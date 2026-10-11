---
"@genmotion/cli": minor
"@genmotion/desktop": minor
"@genmotion/shared": minor
---

Typing and mouse-click sounds, synthesised locally.

A shot of text being typed gets `generate_typing_sound`: the sound of someone typing it, plus a `.timing.json` beside the WAV saying what the text says on every frame, so the sound and whatever draws the text come from one plan and cannot drift. `generate_click_sound` does the same for mouse clicks, and `pick_keyboard_sound` offers the five keyboards and ten click sounds in the chat with a play button on each, for when the user wants to choose. From a shell or over MCP the same three are `genmotion keysound typing|click|list|demo` and the `generate_typing_sound` / `generate_click_sound` / `list_sound_profiles` tools; `--place` puts the clip on the timeline in the same call.

No key, no credits and no network: a keystroke is synthesised from a table of resonances, which is also why it is the one audio capability every surface has. The rhythm is modelled rather than evenly spaced — digraphs cost what they cost on a real keyboard, the tempo drifts into bursts and lulls, there are pauses at punctuation, and by default the typist occasionally slips onto a neighbouring key and backspaces it out. The same text and seed give the same file byte for byte, so re-rendering a project never re-times its typing.

The voice picker and the new keyboard picker are now one component.
