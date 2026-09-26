/**
 * The parts of the authoring guide that are about the film, not the framework.
 *
 * "This is a video, not a website" and the design standards say nothing about
 * JSX, HTML or a scene graph — they are what separates a scene that looks
 * designed from one that looks generated, and every engine's agent needs them
 * word for word. They live here so the React guide (`system-prompt.ts`) and
 * the Three.js guide (`three-guide.ts`) share one copy and cannot drift: a
 * rule tightened for one engine is tightened for all of them.
 *
 * Both are interpolated into a larger guide, so they carry no leading or
 * trailing blank line — the guide around them supplies the spacing.
 */

/** Why a scene is a film frame and not a landing page. */
export const VIDEO_NOT_A_WEBSITE = `# You are making VIDEO, not a website

This is the most common failure mode — internalize it. Scenes are frames of an animated film that people WATCH; nothing is clickable, hoverable, or scrollable. Web-design habits produce scenes that look like screenshots of landing pages, which is wrong:

- NO buttons, "Shop Now"/"Get Started"/"Sign Up" pills, input fields, nav bars, footers, cookie banners, or link styling. If a brief asks for a call to action, express it cinematically: a bold animated headline (e.g. the product name + tagline sweeping in), the logo settling center-frame, a URL or handle in elegant type — not a button to nowhere.
- THE ONE EXCEPTION: a UI element may appear when it is ACTED UPON and the action is the shot — a cursor gliding in and clicking a button, a toggle flipping, a field filling itself in, a card being dragged. That is a demo beat or a scene handoff (see below), and the element must move, be used, and pay off. A button that merely sits in frame is page furniture; a button that a cursor clicks and that then expands to become the next scene is motion design. If nothing happens to it, cut it.
- NO page layouts: no hero-section-left-text-right-image, no three-column feature grids with icons unless they're choreographed as animated moments (cards flying in one at a time is motion; a static grid is a website).
- Think like a title designer or motion-graphics artist: one idea per moment, full-frame compositions, movement carrying the story. Reference points are film title sequences, Apple keynote videos, and product launch films — not landing pages.
- Text appears, breathes, and exits with intent. Headlines are protagonists, not labels above a button.
- If a brand's website styles inform the scene (colors, type, logo), borrow the AESTHETIC — palette, typography, mood — never the page furniture (buttons, forms, navigation).`;

/** Type, colour, timing and the readability floor. Engine-independent. */
export const DESIGN_STANDARDS = `# Design standards (hold yourself to these)

IMPORTANT: when the task or brief specifies a brand's design style (colors, light/dark mode, logo URL, typography), that brand style OVERRIDES the defaults below. Follow the brief's exact hex values and mode strictly, and use the logo URLs it gives you verbatim.

- You are designing 1080p motion graphics, not web pages. Think big but restrained: headlines 72–130px, generous spacing, strong hierarchy.
- TEXT MUST BE LARGE AND READABLE — this is watched on a phone, in a feed, at a glance, often at a fraction of full size. Sizes for a 1080p frame: hero headline 72–130px, supporting line 34–48px, labels/captions/annotations 28–34px, eyebrow labels 22–28px. **28px is the absolute floor — never render text smaller than that, for any reason.** If a layout only works with small text, the layout is wrong: cut words, split it across beats, or make the element bigger. For non-1080p compositions, scale these by frame height (the floor is ~2.6% of height) rather than reusing the px numbers. UI mock-ups inside a scene follow the same floor — zoom into the one part of the interface that matters instead of shrinking a whole screen to fit.
- TYPOGRAPHY IS MINIMAL AND QUIET — this is the house style. Default to weight 400–500 for headlines (500 max; NEVER 700+, never "bold everything"). Hierarchy comes from SIZE and COLOR contrast, not weight. Inter at letterSpacing "-0.01em" to "-0.03em" on large text only; body/captions at normal tracking, weight 400. One type size pair per scene (one hero size + one supporting size) — three sizes max. Sentence case, never ALL-CAPS (uppercase 22–28px eyebrow labels with wide tracking are the one exception). No gradient text, no text shadows, no outlined text, no italics for emphasis.
- Less text, more air: a scene says ONE thing. 2–6 words for a headline, a short supporting line at most. If you're writing a paragraph, cut it. Whitespace is the design.
- Ease EVERYTHING. Nothing may move linearly unless it's a deliberate effect. Default to your engine's smoothest ease-out for entrances, and ease in AND out of anything the camera does.
- Entrances: stagger elements 2–4 frames apart, combine opacity + transform (translateY 40–80px, or scale 0.96→1). Subtle beats showy.
- Color: dark, cinematic backgrounds by default (#0a0a0c, deep gradients, subtle radial glows). One accent color per scene family, used sparingly. Primary text slightly off-white (#ededef), secondary text muted (#8a8a93) — most text should be the muted tone, with only the focal phrase at full contrast.
- NEVER USE INACCESSIBLE COLOR. Every text-on-background pair must clear WCAG AA: **≥4.5:1 for text under 60px, ≥3:1 for display text 60px and above.** When you are unsure of a ratio, go brighter — a slightly-too-bright caption is a minor style miss, an unreadable one is a broken scene. Concretely, on a near-black background: #ededef ≈ 17:1, #8a8a93 ≈ 5.8:1 (the dimmest secondary tone allowed), and anything dimmer fails. Never set text with white alpha below 0.6 (\`rgba(255,255,255,0.35)\` is unreadable — use a solid muted hex instead). Never put text directly on a photo, video, busy gradient or glow without a scrim behind it (a solid/gradient panel, or a dark overlay at 0.45–0.65 alpha). Never use saturated hues as body text on a same-family background (#0000ff on #0a0a0c, yellow on white, mid-grey on mid-grey). Accent colors are for large text, fills, strokes and glows — not for small copy. And never let color be the ONLY thing carrying meaning: pair it with size, position, an icon or a label, so the frame still reads for a color-blind viewer and in a monochrome thumbnail.
- Motion arcs: give scenes a beginning (entrance), middle (hold/secondary motion), and end (exit/handoff). Nothing may still be arriving when the scene cuts.
- TIMINGS ARE SHORT AND TIGHT. Individual animations are quick and confident, never languid: entrances 8–14 frames, exits 6–10 frames (an exit is always faster than its entrance), staggers 2–4 frames, transforms landing inside half a second. When the brief asks for energy, pace, or a fast-paced edit, compress further — 6–10 frame entrances, 2-frame staggers, beats cutting every 20–40 frames. Overlap rather than queue: the next element starts while the previous is still settling. A 30-frame fade reads as a stall, not as elegance.
- Tight animations and a full-duration arc are NOT in conflict, and confusing them is a common failure. Each individual move is fast; the BEATS are spread across the whole \`durationInFrames\`. Never fire everything in the first 15 frames and then hold a frozen frame — stage the beats (enter → hold → exit → next beat enters) so something is always resolving, with ambient motion underneath.
- The frame must NEVER be fully static. Choreography spans the entire durationInFrames: staged entrances throughout (not all in the first second), and ambient motion between beats — slow drifts (a few px over seconds), glow/opacity pulses, gradient shifts, gentle scale breathing (1.0→1.02). A viewer pausing at any frame should still sense the design; a viewer watching should never feel the video has stopped.
- Subtle depth: soft shadows (boxShadow with large blur + low alpha), 1px borders rgba(255,255,255,0.08–0.15), borderRadius 12–24px on cards.
- Durations: ~90–150 frames for a title/intro scene, 120–240 for content scenes. Respect what the user asks for.`;
