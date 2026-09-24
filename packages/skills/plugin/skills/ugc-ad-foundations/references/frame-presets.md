# The four looks

Four design directions that cover almost every UGC ad. Each is a palette, a type spec, and a caption treatment, portable to whatever engine is building the scene. None of them requires a specific file format: carry the values the way this project already keeps its design decisions, whether that is a shared tokens file, a components/brand module, or consistent inline values repeated scene to scene.

## `ugc-native`

The default. Reads as a phone recording, not a production.

- **Palette**: near-black text on off-white or the subject's own footage; one accent colour used only for the caption highlight word, never for background fills.
- **Type**: the platform's own system sans (SF Pro / Roboto stand-ins are fine), nothing with personality. Headlines are bold, body text is medium weight.
- **Captions**: two to three words per card, centred, 60 to 70 percent down the frame. White text, a 6 to 8px black stroke, no background plate.
- **Chrome**: none. No logo, no lower third, no watermark until the end card.
- **Motion**: hard cuts, no dissolves. A caption card snaps in, it does not fade.

## `ugc-bold-caption`

Loud, fast, hook-led. For a cold-traffic opener or a listicle.

- **Palette**: high contrast. A single saturated accent (yellow, lime, hot pink) against near-black or near-white.
- **Type**: a heavy, condensed display face for the caption word; body captions in the same family, lighter weight.
- **Captions**: word-by-word, one to two words per card, oversized (12 to 16 percent of frame height), thick stroke or a solid colour block behind. The emphasis word in the accent colour, everything else in white or black.
- **Chrome**: a small persistent counter or progress mark is acceptable for a listicle; nothing else.
- **Motion**: every caption card lands with a hard snap and a slight overshoot. Punch-ins on emphasis words.

## `ugc-clean-demo`

Screen-recording-led. The interface is the star; the design gets out of the way.

- **Palette**: neutral grey or off-white background behind the device frame, so the captured UI's own colours read true. No accent colour competing with the product's brand.
- **Type**: restrained system sans, small, used only for the narration caption strip, not for decoration.
- **Captions**: a single line, bottom third but clear of the true bottom edge, plain white on a translucent dark bar. No word-by-word animation; it would compete with the UI motion.
- **Chrome**: a simple device frame (rounded rect, thin border, soft shadow) around the capture. A title bar or URL chip if it helps orient the viewer.
- **Motion**: cuts and punch-ins on the interface itself carry the pacing; the caption strip stays still.

## `ugc-camcorder`

Retro, handheld, deliberately degraded. For nostalgia, authenticity, or a pattern interrupt.

- **Palette**: slightly desaturated, a warm or green colour cast, crushed blacks.
- **Type**: a monospace or timestamp-style face for any on-screen text, echoing a camcorder overlay.
- **Captions**: small, plain, positioned like a camcorder timestamp (a corner) or as a single centred line low in the frame, never the bold word-by-word style, which breaks the illusion.
- **Chrome**: a timestamp overlay (`REC ● 00:14:22`), light film grain, occasional scan-line or chroma-bleed texture at transitions.
- **Motion**: slight frame jitter, a soft vignette, cuts with a one-or-two-frame glitch rather than a clean snap.

## Picking one

Match the look to the format, not to taste alone:

| Format tends to want | Look |
| --- | --- |
| Testimonial, founder story, street interview | `ugc-native` |
| Hook-heavy listicle, pattern-interrupt opener | `ugc-bold-caption` |
| Screen demo, tutorial, app walkthrough | `ugc-clean-demo` |
| Unboxing, day-in-the-life, nostalgia angle | `ugc-camcorder` |

A single ad uses one look throughout. Switching looks mid-ad is a code for "this was made by committee," which is exactly the ad-not-a-person problem `ugc-ad-foundations` exists to avoid.
