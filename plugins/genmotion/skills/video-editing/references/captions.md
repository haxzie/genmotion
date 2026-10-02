# Captions: word-timed, in the scene, inside the safe zone

Read this when an edit gets captions. Burned-in captions are mandatory on TikTok, Reels, Shorts and LinkedIn (feeds autoplay muted); YouTube long-form and podcasts get an SRT sidecar instead.

## Styles by platform

The social word-pop spec is the pack's one caption spec for **word-timed captions over footage in a social feed**, and it lives in `ugc-craft` (grouping, timing, pop, size, weight, stroke, position). Edited footage uses it unchanged on TikTok, Reels, Shorts and podcast clips; this table only adds the other placements an edit ships to. Its heavy weight (700–900) and stroke are the one sanctioned exception to the house type rule (weight ≤500, no outlined text): captions must read over a moving picture at phone size. Designed text in the same video (hook title, identity pop, end card) follows the caption style when it sits over footage, and `three-type` everywhere else.

| Style | Use for | Spec |
|---|---|---|
| Word pop | TikTok, Reels, Shorts, podcast clips, Gen Z | per `ugc-craft`: 1–3 words, ≤15 characters, one line; breaks at punctuation, any pause ≥5 f, or 3 words; each group on its first word's start frame, hard-killed at the next group's start or 6 f after its last word; 4 f pop 0.9 → 1 outCubic; 76–96 px at 1080 wide (Bold caption up to 110); heavy sans 700–900; 8 px black stroke; one highlight colour |
| Clean subtitle | LinkedIn, Meta feed, course, corporate | sentence case, up to 2 lines of ≤42 characters, 52–60 px, white on a 60% black rounded box, no word pop |
| Karaoke line | music-led social, reaction | the whole group shown at once (`revealAll`), the active word tinted; same geometry as word pop |
| SRT only | YouTube long-form, podcasts, accessibility copy | sidecar file, ≤42 characters × 2 lines, not burned |

Rules that hold for all of them:

- **One highlight colour** per video. Rainbow karaoke reads as 2021.
- **Emoji:** 0–1 per group, only on a keyword, 1.2× the text size.
- **Captions match the audio exactly.** A word appears on its own start frame, never early, and never two groups at once. Stale captions are the classic seek bug.
- **Captions may drop fillers the speaker says** ("so I, uh, tried it" → "I tried it") but never change meaning, and never contradict the audio.
- **Contrast:** text sits on a stroke or a box, never bare on footage.
- **Fonts: ship and load the face before drawing it.** The capture machine has almost no fonts, so a family name alone silently becomes a default sans and every width changes. Put Inter's variable woff2 (or the brand face) in `assets/` and wrap each scene's builder in `three-type`'s `withFonts` (its type kit), so no caption texture is drawn before the face lands. The component below draws in Inter for that reason; change `FONT` only together with the file you ship.
- On Three.js the captions are a layer above the footage plate that never moves with a punch-in. If you zoom by moving the camera instead of scaling the plate, parent the captions to the camera.

## Reading rate

| Caption kind | Limit |
|---|---|
| Word pop | follows speech; the `ugc-craft` grouping keeps it readable |
| Subtitle lines | ≤17 characters per second (the subtitle standard), each cue at least 20 f (0.83 s) and at most 7 s; ≤42 characters a line, 2 lines |
| Hook / title text | 5–10 words, held at least 1 s per 3–4 words and never under 18 f |
| On-screen text overall | at most 5–10 words per second (TikTok creative guidance) |

## Safe zones (keep captions, hook text and faces inside)

**9:16, 1080×1920** (the pack's numbers, from `direction`'s pacing reference):

| Platform | Top | Bottom | Left | Right |
|---|---|---|---|---|
| Instagram Reels | 270 px | 672 px | 65 px | 65 px |
| TikTok in-feed | 250 px | 710 px | 120 px | 240 px (the action column) |
| YouTube Shorts | use the TikTok margins | | | |

- **One rule for all three: everything readable inside x 120–840, y 270–1210.** One export usually goes to all three platforms.
- **Captions:** one line centred at **y 1160** (the block inside y 1110–1210); a second line grows upward to y 1040. Centre them on the readable column, x 480, with a maximum width of 720 px.
- **Hook text:** just below the top band, y 270–450.
- **Faces:** eyes at y 500–750; never put a caption over the mouth.
- In the scene's orthographic coordinates (origin at the centre, y up), a top-down pixel `(px, py)` is `(px − width / 2, height / 2 − py)`: the caption centre (480, 1160) is `(−60, −200)`.

**16:9, 1920×1080:** title-safe is the inner 90% (96 px left/right, 54 px top/bottom). Subtitles sit with their baseline 70–100 px above the bottom; lower thirds start at x ≥ 96 and stay below y 780. On YouTube, keep the bottom-right 20% clear in the last 5–20 s if end screens are used.

**1:1 (1080×1080) and 4:5 (1080×1350), LinkedIn and Meta feed:** clean subtitles centred in the lower part of the central 1080×1080 (y ≈ 800 on 1:1; on 4:5 the central square spans y 135–1215, so y ≈ 935); headline bar in the top 15%.

## From transcript to frames

1. Words come from `transcribe` in **source** seconds (`edit/words.json`: `{ w, s, e }`).
2. Map each word through the cut list (`edit/cutlist.json`, each segment `{ in, out, start }`): if `in ≤ s < out`, then `t = start + (s − in)`; words in removed ranges are dropped.
3. Convert to frames and to the scene's own timeline: `from = round(t × fps) − sceneStartFrame`, `to = round((start + (e − in)) × fps) − sceneStartFrame`.
4. Write the result as a TypeScript array per scene in `components/words.ts` (`export const WORDS_SECTION_2: Word[] = [...]`), so the scene imports it and the editor can show it. Fix the transcript's spelling of names and brands here, not in the audio.
5. Spot-check three words against the waveform: the frame at `from` should be the first frame the word is audible (± 2 frames). Whisper word times can be 100–300 ms off; nudge from there.

## The caption component (Three.js), tested

Rendered at 1080×1920 and checked with frame captures: groups break on punctuation and pauses, each word pops in on its start frame, the active word tints while the stroke stays black, and a group wider than the safe column shrinks instead of bleeding off it. Put it in `components/captions.ts`.

```ts
import * as THREE from "three";

/** One spoken word, in composition frames (scene-local). */
export interface Word { text: string; from: number; to: number }

// Inter must be loaded by the scene (withFonts) before createCaptions runs.
const FONT = '900 {size}px Inter, "Helvetica Neue", Arial, sans-serif';

/** A word drawn once: white fill, black stroke. Tinting the material recolours the fill only. */
function wordMesh(text: string, size: number, stroke: number) {
  const font = FONT.replace("{size}", String(size));
  const m = new OffscreenCanvas(8, 8).getContext("2d")!;
  m.font = font;
  const pad = stroke + 8;
  const w = Math.ceil(m.measureText(text).width) + pad * 2;
  const h = Math.ceil(size * 1.25) + pad * 2;
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d")!;
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineWidth = stroke * 2;
  g.strokeStyle = "#000";
  g.strokeText(text, w / 2, h / 2);
  g.fillStyle = "#fff";
  g.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.name = `caption-${text.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
  return { mesh, mat, width: w };
}

/**
 * Word-timed captions: groups of up to `maxWords`, broken on punctuation and
 * on gaps longer than `maxGap` frames; the active word is tinted and popped.
 */
export function createCaptions(words: Word[], opts: {
  size?: number; stroke?: number; y: number; maxWords?: number; maxGap?: number; highlight?: string; gap?: number; revealAll?: boolean; maxWidth: number; x?: number;
}) {
  const { size = 88, stroke = 8, y, maxWords = 3, maxGap = 5, highlight = "#FFE500", gap = 22, revealAll = false, maxWidth, x: centreX = 0 } = opts;
  const root = new THREE.Group();
  root.name = "captions";
  const groups: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    const prev = cur[cur.length - 1];
    if (prev && (cur.length >= maxWords || w.from - prev.to > maxGap || /[.?!,]$/.test(prev.text))) {
      groups.push(cur);
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) groups.push(cur);

  const hi = new THREE.Color(highlight);
  const white = new THREE.Color("#ffffff");
  const built = groups.map((group) => {
    const g = new THREE.Group();
    const items = group.map((w) => ({ w, ...wordMesh(w.text.toUpperCase(), size, stroke) }));
    const total = items.reduce((n, it) => n + it.width, 0) + gap * (items.length - 1);
    let x = -total / 2;
    for (const it of items) {
      it.mesh.position.set(x + it.width / 2, 0, 0);
      x += it.width + gap;
      g.add(it.mesh);
    }
    g.position.set(centreX, y, 0);
    // Shrink a group that would overrun the safe width rather than letting it bleed off the frame.
    g.scale.setScalar(Math.min(1, maxWidth / total));
    g.visible = false;
    root.add(g);
    return { g, items, from: group[0]!.from };
  });
  // Up until the next group starts, but never more than 6 frames past the last word.
  const ends = built.map((b, i) =>
    Math.min(built[i + 1]?.from ?? Infinity, b.items[b.items.length - 1]!.w.to + 6),
  );

  function update(frame: number) {
    built.forEach((b, i) => {
      const on = frame >= b.from && frame < ends[i]!;
      b.g.visible = on;
      if (!on) return;
      for (const it of b.items) {
        const active = frame >= it.w.from && (frame < it.w.to || it === b.items[b.items.length - 1]);
        const shown = revealAll || frame >= it.w.from;
        it.mat.opacity = shown ? 1 : 0.0;
        it.mat.color.copy(active ? hi : white);
        // Entrance: 4-frame pop 0.9 -> 1, outCubic, from the word's start frame.
        const p = Math.min(1, Math.max(0, (frame - it.w.from) / 4));
        it.mesh.scale.setScalar(0.9 + 0.1 * (1 - Math.pow(1 - p, 3)));
      }
    });
  }
  return { root, update };
}
```

Use (9:16), inside the scene's `withFonts` builder:

```ts
import interUrl from "../assets/InterVariable.woff2";
// ...
return withFonts(ctx, [{ family: "Inter", url: interUrl }], () => {
  const captions = createCaptions(WORDS, { x: 480 - width / 2, y: height / 2 - 1160, size: 88, maxWidth: 720 });
  captions.root.position.z = 1;          // above the footage plate
  scene.add(captions.root);
  return ({ frame }) => { /* footage seek … */ captions.update(frame); };
});
```

`maxGap` (default 5 f, about 0.17 s) is `ugc-craft`'s "break at any pause ≥5 f". It decides where caption groups break, and is unrelated to the cut list's merge threshold (main skill, Step 5).

Variants:

- **Clean subtitle:** drop `.toUpperCase()`, weight 600, `stroke: 0`, size 52–60, draw a rounded 60% black box behind each group (one more canvas texture per group), raise `maxWords` and break on punctuation and 42 characters instead, and set the scale to 1 (no pop).
- **Keyword colour:** pass a per-word colour in the word list for the 1–2 words per sentence that carry the meaning, instead of tinting every active word.
- Words are drawn once in the builder; memory is about 250 KB per word texture, so a 60 s clip (~150 words) costs ~40 MB. Split long videos into scenes so only one section's words exist at a time.

**HyperFrames:** one `<span>` per word inside a caption `<div>` positioned in the band; the scene's paused timeline sets each span's colour and scale at the word's start time (seconds, `from / fps`). **React:** map the word list to spans and derive colour and scale from `useCurrentFrame()`.

## Fallback: ASS burn-in with ffmpeg

For the ffmpeg-only long-form path, or when a caption pass must happen outside the project. Verified with libass on ffmpeg 6.1; the rendered frame was inspected.

```
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Word,Inter,88,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,8,0,2,120,240,710,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:00.30,Word,,0,0,0,,{\c&H0000E5FF&\fscx108\fscy108}THIS{\r} IS WHY
Dialogue: 0,0:00:00.30,0:00:00.45,Word,,0,0,0,,THIS {\c&H0000E5FF&\fscx108\fscy108}IS{\r} WHY
```

- One `Dialogue` per word, showing the whole group with the active word overridden.
- Colours are `&HAABBGGRR`: #FFE500 is `&H0000E5FF`.
- `Alignment=2, MarginV=710` at PlayResY 1920 puts the bottom of the line at y 1210, so one line fills the 1110–1210 band; `MarginL=120, MarginR=240` keep it inside x 120–840 (bottom-centre alignment centres it at x 480).
- `BorderStyle=3` turns the outline into an opaque box (clean subtitle style). Pop-in: `{\fscx80\fscy80\t(0,80,\fscx100\fscy100)}`.
- ASS times are centiseconds; scene captions are frame-exact, which is why they are the default.
- Burn: `ffmpeg -i in.mp4 -vf "subtitles=caps.ass:fontsdir=./fonts" -c:a copy out.mp4`. Ship the TTF in `fontsdir` (Inter's release has `InterVariable.ttf`; libass needs a TTF or OTF, not woff2); libass silently substitutes a missing font.
- SRT with `force_style` scales against a 384×288 default PlayRes (so FontSize ≈ 22 means large); prefer ASS with explicit PlayRes.

## SRT sidecar

```
1
00:00:00,000 --> 00:00:02,400
Nobody tells you that raising money

2
00:00:02,400 --> 00:00:04,100
is the easy part.
```

Build cues from the re-timed words: break at sentence ends, at gaps over 0.6 s, and before 42 characters; keep each cue 0.83–7 s. Upload it with the video; don't burn it into long-form.
