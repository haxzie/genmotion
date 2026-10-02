# Captions: word-timed, in the scene, inside the safe zone

Read this when an edit gets captions. Burned-in captions are mandatory on TikTok, Reels, Shorts and LinkedIn (feeds autoplay muted); YouTube long-form and podcasts get an SRT sidecar instead. Frame counts are at 30 fps; at 24 fps multiply them by 0.8 (times in seconds stay as they are).

## Styles by platform

The social word-pop spec is the pack's one caption spec for **word-timed captions over footage in a social feed**, and it lives in `ugc-craft` (grouping, timing, pop, size, weight, stroke, position). Edited footage uses it unchanged on TikTok, Reels, Shorts and podcast clips; this table only adds the other placements an edit ships to. Its heavy weight (700–900) and stroke are the one sanctioned exception to the house type rule (weight ≤500, no outlined text): captions must read over a moving picture at phone size. Designed text in the same video (hook title, identity pop, end card) follows the caption style when it sits over footage, and `three-type` everywhere else.

| Style | Use for | Spec |
|---|---|---|
| Word pop | TikTok, Reels, Shorts, podcast clips, Gen Z | per `ugc-craft`: 1–3 words, ≤15 characters, one line; breaks at punctuation, any pause ≥5 f, or 3 words; each group on its first word's start frame, hard-killed at the next group's start or 6 f after its last word; 4 f pop 0.9 → 1 outCubic; 76–96 px at 1080 wide (Bold caption up to 110); heavy sans 700–900; 8 px black stroke; one highlight colour |
| Clean subtitle | LinkedIn, Meta feed, course, corporate | sentence case, up to 2 lines of ≤42 characters, 52–60 px, white on a 60% black rounded box, no word pop |
| Karaoke line | music-led social, reaction | the whole group shown at once (`revealAll`), the active word tinted; same geometry as word pop |
| Film subtitle | trailer, film cut, documentary excerpt, any dialogue in a cinematic picture | sentence case, 44–52 px at 1080p (48–52 if it will be watched on phones), weight 500, white, no box; centred in the lower letterbox bar when the picture is scope (y ≈ 1000 of 1080 for a 2.40:1 picture), otherwise baseline 70–100 px above the bottom with the halo below; up to 2 lines of ≤42 characters; cues follow the supplied subtitle file (below). **9:16 cutdown:** there is no usable lower bar (it is under the platform UI), so 60–64 px, weight 500–600, ≤2 lines of ≤28 characters, centred in the lower part of the picture (baseline y 1100–1180 of 1920); move a line to the top of the readable zone (y 300–450) only while a close-up puts the mouth in the lower band, never as the default |
| SRT only | YouTube long-form, podcasts, accessibility copy | sidecar file, ≤42 characters × 2 lines, not burned |

Rules that hold for all of them:

- **One highlight colour** per video. Rainbow karaoke reads as 2021.
- **Emoji:** 0–1 per group, only on a keyword, 1.2× the text size.
- **Captions match the audio exactly.** A word appears on its own start frame, never early, and never two groups at once. Stale captions are the classic seek bug.
- **Captions may drop fillers the speaker says** ("so I, uh, tried it" → "I tried it") but never change meaning, and never contradict the audio.
- **Contrast:** text sits on a stroke, a box or a halo, never bare on footage. **Film-subtitle halo** (no box, still readable over snow, sky or fire): the line drawn three times under itself with a black shadow at 85–90% opacity and blur 4, 10 and 18 px (on a canvas texture: `shadowColor = "rgba(0,0,0,0.88)"`, `shadowBlur` 4 / 10 / 18, then the white fill once more on top). A single 50% shadow leaves white text near 3:1 over a bright plate. Check it on the brightest frame each line sits on: `capture-frames` there, crop a 12 px band directly above the cap line and one below the baseline, and read `signalstats` YAVG (as in `ffmpeg-recipes.md` §6); both ≤ 115 means white text clears 4.5:1. If the plate is too bright for the halo, use a 40–50% black box behind the line instead.
- **Fonts: ship and load the face before drawing it.** The capture machine has almost no fonts, so a family name alone silently becomes a default sans and every width changes. Put Inter's variable woff2 (or the brand face) in `assets/` and wrap each scene's builder in `three-type`'s `withFonts` (its type kit), so no caption texture is drawn before the face lands. The component below draws in Inter for that reason; change `FONT` only together with the file you ship.
- On Three.js the captions are a layer above the footage plate that never moves with a punch-in. If you zoom by moving the camera instead of scaling the plate, parent the captions to the camera.

## Reading rate

| Caption kind | Limit |
|---|---|
| Word pop | follows speech; the `ugc-craft` grouping keeps it readable |
| Subtitle lines | ≤17 characters per second (the subtitle standard), each cue at least 0.83 s (20 f at 24 fps, 25 f at 30) and at most 7 s; ≤42 characters a line, 2 lines |
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

## Subtitle files (TTML, SRT, VTT) as the source of words

A subtitle file the user supplies, or one that ships with an open film, gives **cue** times, not word times: each cue spans a line of speech, often with a little air. Use it as it is for subtitles (film style, clean subtitle, SRT); for word-pop captions it needs `transcribe` or the 2.5 words/s estimate inside each cue, checked on three words.

Its times are in the **source file's** clock. If your source is an excerpt of the film (a file cut from 1:30), subtract that offset first; then re-time every cue through the cut list exactly like a word: `new_t = segment_start + (src_t − in)`, clipped to the shot it lands in. A cue that spans a cut is split, or kept only on the shot where most of it is spoken.

Then fix the reading rate: a cue shorter than 0.83 s or faster than 17 characters per second is held longer, past the speech, up to the shot's end or the next cue, whichever comes first; never start a cue before its speech. Check every cue's start against the waveform (the `astats` RMS at 50 ms, or a silence map) before trusting it: shipped files are often a few hundred ms off, and one tested cue started 0.45 s after its line.

The conversion, as inline commands (no script file), tested on a 71-cue TTML and a two-shot cut list:

```sh
# 1) TTML -> tab-separated cues in source seconds (offset = where your source file starts in the film's clock, 90 here);
#    <br/> inside a cue becomes "|"; handles begin/end clock times HH:MM:SS.mmm
tr -d '\r\n\t' < assets/source/film.ttml | sed 's#<p #\n<p #g' | sed -n 's#^<p begin="\([0-9:.]*\)" end="\([0-9:.]*\)"[^>]*>\(.*\)</p>.*#\1\t\2\t\3#p' | sed -e 's#<br */>$##' -e 's#<br */>#|#g' -e 's#<[^>]*>##g' | awk -F'\t' -v off=90 'function s(x, a){split(x,a,":"); return a[1]*3600+a[2]*60+a[3]} {b=s($1)-off; e=s($2)-off; if (b>=0) printf "%.3f\t%.3f\t%s\n", b, e, $3}' > edit/cues.tsv
# 2) re-time through the cut list (edit/cutlist.tsv: in, out, start per segment, seconds), clipped to each shot;
#    the third column is the shot's end in the edit
awk -F'\t' 'NR==FNR{i[++n]=$1; o[n]=$2; st[n]=$3; next} {for(k=1;k<=n;k++){b=($1>i[k]?$1:i[k]); e=($2<o[k]?$2:o[k]); if (e-b>=0.2) printf "%.3f\t%.3f\t%.3f\t%s\n", st[k]+b-i[k], st[k]+e-i[k], st[k]+o[k]-i[k], $3}}' edit/cutlist.tsv edit/cues.tsv | sort -n > edit/edit-cues.tsv
# 3) SRT, each cue held to >= 0.83 s and <= 17 cps where the shot and the next cue allow
awk -F'\t' '{b[NR]=$1; e[NR]=$2; se[NR]=$3; t[NR]=$4} END{for(k=1;k<=NR;k++){c=length(t[k]); need=(c/17>0.83?c/17:0.83); lim=se[k]; if (k<NR && b[k+1]<lim) lim=b[k+1]; if (e[k]-b[k]<need) e[k]=(b[k]+need<lim?b[k]+need:lim); gsub(/\|/,"\n",t[k]); printf "%d\n%s --> %s\n%s\n\n", k, ts(b[k]), ts(e[k]), t[k]}} function ts(x,  h,m,s,ms){ms=int(x*1000+0.5); h=int(ms/3600000); m=int(ms/60000)%60; s=int(ms/1000)%60; return sprintf("%02d:%02d:%02d,%03d",h,m,s,ms%1000)}' edit/edit-cues.tsv > deliver/edit.srt
# 4) check it parses
ffmpeg -v error -y -i deliver/edit.srt edit/srt-check.ass && grep -c Dialogue edit/srt-check.ass
```

- An SRT or VTT input skips step 1: ffmpeg converts either to the other (`ffmpeg -i in.vtt out.srt`), and the cue lines are `HH:MM:SS,mmm --> HH:MM:SS,mmm`; turn them into the same three columns before step 2.
- TTML that uses frames (`00:00:23:12` with `ttp:frameRate`) or ticks (`230000000t` with `ttp:tickRate`) needs those units converted in the `s()` function: frames ÷ frame rate, ticks ÷ tick rate.
- The cue rows in `edit/edit-cues.tsv` are also what a scene's subtitle layer reads: `from = round(start × fps)`, `to = round(end × fps)` per cue.
- Check the result: in the test, a 29-character line over 1.5 s of speech (19 cps) was held to 1.71 s by step 3, and a cue that started 0.4 s before a cut was clipped to the shot.

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
  fps: number; size?: number; stroke?: number; y: number; maxWords?: number; maxGap?: number; highlight?: string; gap?: number; revealAll?: boolean; maxWidth: number; x?: number;
}) {
  const { fps, size = 88, stroke = 8, y, maxWords = 3, highlight = "#FFE500", gap = 22, revealAll = false, maxWidth, x: centreX = 0 } = opts;
  // Timings are seconds in the spec (pause 0.17 s, pop 0.13 s, tail 0.2 s), so they hold at 24, 25, 30 or 60 fps.
  const maxGap = opts.maxGap ?? Math.round(fps * 0.17);
  const pop = Math.max(2, Math.round(fps * 0.133));
  const tail = Math.round(fps * 0.2);
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
  // Up until the next group starts, but never more than `tail` frames past the last word.
  const ends = built.map((b, i) =>
    Math.min(built[i + 1]?.from ?? Infinity, b.items[b.items.length - 1]!.w.to + tail),
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
        // Entrance: pop 0.9 -> 1 over `pop` frames (4 at 30 fps, 3 at 24), outCubic, from the word's start frame.
        const p = Math.min(1, Math.max(0, (frame - it.w.from) / pop));
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
  const captions = createCaptions(WORDS, { fps: ctx.fps, x: 480 - width / 2, y: height / 2 - 1160, size: 88, maxWidth: 720 });
  captions.root.position.z = 1;          // above the footage plate
  scene.add(captions.root);
  return ({ frame }) => { /* footage seek … */ captions.update(frame); };
});
```

`fps` is the project's (`ctx.fps`); every timing inside is derived from it, so the same component is right at 24 and 30 fps. `maxGap` (default 0.17 s: 5 f at 30, 4 f at 24) is `ugc-craft`'s "break at any pause ≥5 f". It decides where caption groups break, and is unrelated to the cut list's merge threshold (main skill, Step 5).

Variants:

- **Film subtitle:** the clean-subtitle changes below with weight 500, size 44–52 (60–64 in 9:16), no box but the three-pass halo, cues instead of words (one group per cue from `edit/edit-cues.tsv`), and `y` in the letterbox bar (9:16: baseline y 1100–1180, or y 300–450 while a close-up's mouth is in the lower band).
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
