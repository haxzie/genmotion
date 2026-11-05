---
name: polished-screen-demo
description: "A product demo that looks screen-recorded in a tool like Screen Studio, but is built rather than captured: the real interface photographed through the browser, a synthetic cursor that moves and clicks, push-in zooms on whatever is being done, keystroke and click sounds on the exact frames, and one continuous voiceover. Optionally a talking head in the corner, lip-synced to it. Load it whenever someone wants a demo, walkthrough or tutorial of software that should look recorded (like Screen Studio, or record the flow), and there is no recording to work from."
---

# Polished screen demo

A real screen recording is a person's mouse, a person's typing, and a camera that never moves. What people mean by "make it look like Screen Studio" is the opposite: the cursor glides, the frame pushes into whatever matters, keystrokes and clicks are audible, and nothing is ever hunted for. That film is not recorded. It is built, from real screens.

This skill builds it: `browse-site` walks the actual product, `browse-capture` photographs each step, and the scenes put those screens inside a window with a cursor, a camera and sound on top.

## When to use

- A demo, walkthrough or tutorial of software, where the result should read as a recording.
- The user says Screen Studio, Loom, Arcade, "record the flow", "a screen recording of".
- There is no recording, or the one there is was shot at the wrong size, has the wrong account in it, or cannot be shot again.

Not this skill:

- A real recording exists and only needs trimming, cropping and captions: that is `screen-capture` plus `video-editing`.
- A phone app's store listing: `app-store-preview`.
- A narrated tour in chapters where the interface is incidental: `demo-walkthrough`.
- A founder talking to camera with the product behind them: `ugc-screen-demo`.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The real flow | `browse-site` to walk it, step by step | Ask for a screen recording or a screenshot of every step, named; never invent a screen |
| The screens | `browse-capture` into `assets/` | Ask for the screenshots, or rebuild the interface from the product's own design |
| A flow behind a login | `request-takeover` | Ask them in your reply to sign in and do it, and end the turn. Never ask for a password |
| The product's colours and type | `brand-assets` | Ask for the hex values; never eyedrop them from a capture |
| Clicks and typing | `keystroke-sound` | none needed: synthesised locally, with the timings the typing animation is drawn from |
| Narration | `pick-voice`, then `voiceover` | Step captions carry the structure on their own |
| Sound on the timeline | `place-audio` | none: a sound only in `assets/` is silent in the export |
| A presenter | `mcp:fal` for MiniMax lip-sync, and an image model for the still | Skip the head; it is the optional half of this format |
| Logos, avatars, the synced clip | `save-asset` | — |
| Seeing it | `capture-frames` | None |
| Scenes that build | `validate` | None |
| Moves, mix, cut | `three-camera`, `sound-design`, `screen-capture` | — |

## What makes it read as recorded

Four things, in the order people notice them missing:

1. **The camera moves to the work.** A static 1920 frame of a dashboard is a screenshot. A slow push into the button being clicked, held while it is clicked, then a pull back, is a recording made by someone who cared.
2. **The cursor is a character.** It travels, it slows as it arrives, it presses, it leaves. It never teleports, and it never sits still in the middle of the screen.
3. **Sound is tied to frames, not sprinkled.** The click lands on the frame of the press. Typing is the sound of that exact string being typed, and the characters appear on the frames the sound says they do.
4. **One continuous voice.** Narration recorded as one take over the whole cut, not one clip per scene. Shot-by-shot voiceover is the single clearest tell that a demo was assembled.

## The process

### 1. Script first, before anything is captured

Write the narration as one continuous script, in the order the flow happens, and show it to the user before recording anything. Roughly 2.5 words per second: a 60s demo is about 150 words.

Mark the steps in the script, because those marks become the shots:

```
(1) Dodo Payments keeps every product you sell in one place.
(2) A new one starts here, with a name and a price,
(3) and the moment you save it you get a checkout link to share.
```

Three marks, three shots. The script decides the shot list, never the other way round.

### 2. Walk the real flow in the browser

Open the product with `browse-site` and go through the flow yourself, step by step, exactly as the script describes it. Look at what comes back before moving on: a flow you have not seen is a flow you will get wrong.

- **Sign-ins belong to the user.** When the flow is behind a login, call `request-takeover` with what you need done ("Sign in to Dodo Payments so I can walk the product flow"). They sign in, you carry on, and the session is remembered for later. Never ask for a password in the chat, and never type one.
- **Set the viewport to the video's shape** so the captures need no cropping: a 16:9 video wants a 16:9 page. A 9:16 video is the one case for a narrow viewport (around 430 wide), which also gets you the mobile layout.
- **Dismiss the furniture first**: cookie banners, "what's new" dialogs, a half-finished onboarding checklist. A real recording would not have them, and they date the film.
- **Watch for the user's own data.** Real names, real emails, real customers and real balances cannot go in a published video. Use a demo account, or capture and then cover them in the scene.

### 3. Photograph each step

`browse-capture` each step into `assets/`, named for the step: `01-products-empty.png`, `02-new-product-form.png`, `03-checkout-link.png`.

- **Shoot the element, not the viewport**, when the shot is about one thing: a pricing card, a form, a row in a table. A tight crop reads at phone size; a whole page does not.
- **One capture per state**, including the states between: the empty form, the form with the name typed, the form saved. The scene animates between them.
- **Full-page captures are for structure**, not for the cut. Use them to decide what the shot should be, then go back and shoot the part that matters.

### 4. Build the shot

Each script mark becomes one scene. The engine does not matter much; the shape of a shot does. The kit, with code, is in `references/shot-kit.md`: the window chrome, the stage camera, the cursor with its click ripple, keycaps, and the step caption.

The shape of every shot:

- The capture sits inside a **window** (a macOS browser frame with a title bar), on a desktop background, never full-bleed to the video edge. The frame around it is what says "a screen", and it gives the camera somewhere to push into.
- A **camera move**, keyed to the action: hold wide, push in as the cursor approaches, hold through the click, pull back as the result appears. Keyframes, not a constant drift.
- The **cursor** travels to the target with an eased move that slows on arrival, presses, and a ripple leaves it.
- A **step caption** bottom-left ("Step 2: Name the product") for a tutorial. Leave it out for a launch film.

Where a step is typed rather than clicked, draw the text from the keystroke timings rather than spacing the characters evenly. Evenly spaced typing is the single thing that marks a typing shot as fake.

### 5. Sound, placed

Three layers, and all three must end up on the **timeline**, not merely in `assets/`. A sound sitting in `assets/` is silent in the export. The reference project on this machine generated every click and keystroke sound correctly and shipped with an empty audio array, which is a silent film with the sound effects still in the folder.

- `keystroke-sound` for every typed string, and for the clicks. It is local, free and deterministic, and it writes a `.timing.json` beside the WAV saying what the text reads on each frame. Drive the on-screen text from that file.
- `voiceover` for the narration, as one continuous take, generated once the script is agreed. One voice for the whole project.
- Room tone, whooshes and musical stings are not what a screen recording sounds like. A music bed under narration is fine at 0.15 to 0.35; a transition gets the sound of the thing that happened, or nothing.

Place the click on the frame of the press, not the frame the result appears.

### 6. Optional: the talking head

A presenter in the corner, lip-synced to the narration already recorded. The whole recipe, including the fal calls, is in `references/talking-head.md`. In short: voiceover first, a presenter still second, MiniMax lip-sync third, and the result comes into `assets/` and plays in a corner inset. Never generate a face for a real named person.

### 7. Check it

- `validate` every scene you write, and never end a turn with one that does not build.
- `capture-frames` at the moments that matter: the push-in at its tightest, the frame of the click, the result. Interface text is judged on rendered frames.
- Read the captions and any UI text at the size it will be watched. Interface text comfortable on a desktop is illegible at 1080 wide on a phone.

## Checks before you finish

1. `validate` passes on every scene, and `capture-frames` has been run on the tightest push-in of each shot.
2. Capture the press frame and press +3 for every click: the ripple is on the press, the interface has changed by +3, and the click sound sits on the press frame.
3. The cursor is on screen and moving before every click, and arrives 2 to 4 frames ahead of it.
4. Typed text matches its `.timing.json` frame for frame. Spot-check three frames against the file.
5. `project-overview`: the narration is one continuous file, not one per scene, and every sound is on the timeline rather than only in `assets/`.
6. No cookie banner, no bookmarks bar, no real customer name, email or balance in any capture.
7. Any caption or interface text in the final frame measures at least 24px tall at the composition size.
8. A window parked across a cut is at identical coordinates on both sides.
9. If there is a presenter: the clip's own audio is muted, its duration matches the voiceover, and the mouth stops when the narration does.

## What gives it away

- Narration recorded per scene, so the pace and room change at every cut.
- A cursor that appears already at its target, or that is absent during a click.
- Evenly spaced typing.
- The camera pushing in on nothing, or drifting constantly because the drift was easier than deciding.
- A cookie banner, a browser bookmarks bar full of the user's tabs, or a real customer's email.
- Sounds generated and never placed.
