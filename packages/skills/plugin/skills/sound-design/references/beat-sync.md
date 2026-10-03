# Beat sync: fitting the picture to a track

Read this once you have a candidate track (sourced, generated or the user's) and before you write the beat table: it finds the track's tempo, downbeats, sections and button with `ffmpeg` and a short inline `node` snippet (nothing installed, nothing saved as a script), checks the grid, then fits scene lengths, the peak, the name reveal and the end card to it. Frames at 30 fps unless stated.

The order is **track first, picture second**. A library track has its own bars, drop and ending; the film's scenes are cut to them, not the other way round. Only a generated track can be ordered to fit a beat table already written.

## 1. Envelopes (one `ffmpeg` pass, two files)

First read the file's own tag: `ffprobe -v error -show_entries format_tags=TBPM,TBP,bpm -of default=nw=1 assets/track.mp3` (Incompetech MP3s carry `TBP`). A tag or a library page's BPM is a hint to confirm, not the answer: one library page listed 121 BPM for a file that measures 120.000 (the grid check reads 11 ms median at 120 and 35 ms at 121).


10 ms rows of RMS level: the kick band (low-passed at 150 Hz) and the full band. Mono, resampled to 48 kHz, timestamps rebuilt so row *i* is exactly *i* × 10 ms.

```
ffmpeg -v error -i assets/track.mp3 -filter_complex "[0:a]aformat=channel_layouts=mono,aresample=48000,asetnsamples=n=480:p=0,asetpts=N/SR/TB,asplit[a][b];[a]lowpass=f=150,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=assets/beat-low.txt[x];[b]astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=assets/beat-full.txt[y]" -map "[x]" -f null - -map "[y]" -f null -
```

About 6 s per minute of audio (18 s for a 5-minute MP3). Without `asetpts` the null muxer floods the log with non-monotonic timestamp errors on MP3 input.

## 2. Detector: tempo, downbeat, sections, button

```
node - assets/beat-low.txt assets/beat-full.txt 30 <<'EOF'
const fs = require("fs"); const [lowF, fullF, fpsArg] = process.argv.slice(2), fps = +(fpsArg || 30), H = 0.01;
const env = (f) => fs.readFileSync(f, "utf8").split("\n").filter((l) => l.includes("RMS_level"))
  .map((l) => { const v = parseFloat(l.split("=")[1]); return Number.isFinite(v) ? Math.max(v, -90) : -90; });
const low = env(lowF), full = env(fullF), n = Math.min(low.length, full.length), T = n * H;
const rise = (e, i) => (i < 3 ? 0 : Math.max(0, e[i] - Math.max(e[i - 1], e[i - 2], e[i - 3]))); // dB jump over 30 ms
const mk = (f) => Array.from({ length: n }, (_, i) => f(i));
const onMix = mk((i) => 2 * rise(low, i) + rise(full, i)), onFull = mk((i) => rise(full, i));
const comb = (on, bpm) => { // best phase for a tempo; score = mean onset on the beats / mean onset overall
  const P = 60 / bpm, avg = on.reduce((a, b) => a + b, 0) / n;
  const at = (t) => { const x = t / H, i = Math.floor(x), f = x - i; return i + 1 < n ? on[i] * (1 - f) + on[i + 1] * f : 0; };
  let top = { s: -1, ph: 0 };
  for (let ph = 0; ph < P; ph += H / 2) { let s = 0, c = 0; for (let t = ph; t < T; t += P) { s += at(t); c++; } if (s / c > top.s) top = { s: s / c, ph }; }
  return { bpm, P, ph: top.ph, score: top.s / avg };
};
const refine = (on, b) => { let r = comb(on, b);
  for (let x = b * 0.97; x <= b * 1.03; x += 0.02) { const c = comb(on, x); if (c.score > r.score) r = c; }
  for (let x = r.bpm - 0.02; x <= r.bpm + 0.02; x += 0.002) { const c = comb(on, x); if (c.score > r.score) r = c; } return r; };
// 1. coarse tempo: autocorrelation over lags for 60-180 BPM, mildly preferring 90-140
const m = onMix.reduce((a, b) => a + b, 0) / n, d = onMix.map((v) => v - m); let coarse = { s: -1e18, bpm: 120 };
for (let lag = 33; lag <= 100; lag++) { let s = 0; for (let i = lag; i < n; i++) s += d[i] * d[i - lag];
  const bpm = 6000 / lag, w = Math.exp(-0.5 * (Math.log2(bpm / 115) / 0.9) ** 2); if (s * w > coarse.s) coarse = { s: s * w, bpm }; }
// 2. 3:2 check (swing and dotted rhythms lock onto 2/3 of the tempo), then fine tempo and beat phase over the whole track
const pick = [1, 1.5, 1 / 1.5].map((r) => coarse.bpm * r).filter((b) => b >= 60 && b <= 180).map((b) => refine(onFull, b)).sort((a, b) => b.score - a.score)[0];
const { bpm, P } = refine(onMix, pick.bpm), ph = comb(onMix, bpm).ph + H / 2; // +5 ms: an onset sits mid-row
// 3. downbeat: the beat position with the strongest kick accent plus the most section entries
const pw = (e, a, b) => { let p = 0; for (let i = a; i < b; i++) p += 10 ** (e[i] / 10); return 10 * Math.log10(p / Math.max(1, b - a)); };
const beats = []; for (let i = 0, t = ph; t + P <= T; i++, t = ph + i * P) { const a = Math.round(t / H), b = Math.round((t + P) / H); beats.push({ t, f: pw(full, a, b), k: pw(low, a, b), acc: Math.max(...[-2, -1, 0, 1, 2].map((o) => rise(low, a + o))) }); }
const kick = [0, 0, 0, 0], ent = [0, 0, 0, 0], entries = [];
beats.forEach((b, j) => { kick[j % 4] += b.acc; if (j < 2 || j + 2 > beats.length - 1) return;
  const dd = (x) => (beats[j][x] + beats[j + 1][x]) / 2 - (beats[j - 1][x] + beats[j - 2][x]) / 2, jump = Math.max(dd("f"), dd("k"));
  if (jump >= 3) { ent[j % 4] += jump; entries.push({ t: b.t, jump }); } });
const nz = (a) => { const mx = Math.max(...a.map(Math.abs)) || 1; return a.map((v) => v / mx); }, kn = nz(kick), en = nz(ent);
const k0 = [0, 1, 2, 3].sort((a, b) => kn[b] + en[b] - (kn[a] + en[a]))[0], first = ph + k0 * P;
const where = (t) => { const q = Math.round((t - first) / P); return `bar ${Math.floor(q / 4) + 1} beat ${(((q % 4) + 4) % 4) + 1}`; };
// 4. sections: loudness per bar from the first downbeat; the last strong hit is the button candidate
const bars = []; for (let i = 0, t = first; t + 4 * P <= T; i++, t = first + 4 * i * P) { const a = Math.round(t / H), b = Math.round((t + 4 * P) / H); bars.push({ t, f: pw(full, a, b), k: pw(low, a, b) }); }
let last = 0; const strong = Math.max(...onMix) * 0.35; for (let i = 0; i < n; i++) if (onMix[i] > strong) last = i;
console.log(`BPM ${bpm.toFixed(3)} (also reads as ${(bpm / 2).toFixed(1)} / ${(bpm * 2).toFixed(1)})  grid strength ${pick.score.toFixed(1)}${pick.score < 3.5 ? "  WEAK: no trustworthy grid, cut on phrases" : ""}`);
console.log(`beat ${(P * 1000).toFixed(1)} ms = ${(fps * P).toFixed(3)} f @${fps}; first beat ${ph.toFixed(3)} s; first downbeat ${first.toFixed(3)} s`);
console.log(`drop candidates: ${[...entries].sort((a, b) => b.jump - a.jump).slice(0, 4).map((e) => `${e.t.toFixed(2)} s (${where(e.t)}, +${e.jump.toFixed(1)} dB)`).join(", ")}`);
console.log(`last strong hit ${(last * H).toFixed(3)} s (${where(last * H)}); file ends ${T.toFixed(2)} s`);
bars.forEach((b, i) => { const p = bars[i - 1]; if (!p) return; const tag = (b.f - p.f >= 3 ? "UP " : p.f - b.f >= 3 ? "DOWN " : "") + (b.k - p.k >= 4 ? "KICK-IN" : "");
  if (tag) console.log(`bar ${i + 1} at ${b.t.toFixed(3)} s: ${tag} (${p.f.toFixed(1)} -> ${b.f.toFixed(1)} dB)`); });
for (let i = 0; i < bars.length; i += 8) console.log(`bars ${i + 1}-${Math.min(i + 8, bars.length)} dB: ${bars.slice(i, i + 8).map((b) => b.f.toFixed(0)).join(" ")}`);
EOF
```

About 1 s per track. Delete `beat-low.txt` and `beat-full.txt` when the beat table is written.

### Reading the output

| Line | Use it for |
|---|---|
| `BPM` | the tempo; ×2 and ÷2 are the same grid at another level, choose by genre (Choosing table). The 3:2 check already ran (a swung jazz track read 86.7 instead of 130 before it). |
| `grid strength` | under 3.5: no trustworthy grid (orchestral, ambient, rubato); cut on phrases and swells and join inside decays (`mix-and-loudness.md`, Beatless music). A swung acoustic kit reads 4–5 and is usable with care; programmed and electronic tracks read 6–16. |
| `first downbeat` | the grid's anchor: bar N starts at `first + (N−1) × 4 × 60/BPM`. Compute every bar from it; never add rounded bars. |
| `drop candidates` | the biggest section entries. An entry on beat 4 followed by one on beat 1 of the next bar is a pickup into that bar: the drop is the beat 1. |
| `last strong hit` | the button candidate. It need not sit on the grid (a final hit after a dropout often lands between beats): use this measured time, not a computed bar. |
| `bar … UP / DOWN / KICK-IN` | the section map: intro, build, drop (UP with KICK-IN), breakdown (DOWN), return. A single DOWN bar right before an UP is a ready-made breath. |
| `bars … dB` | the energy curve, 8 bars a line (a phrase); compare its shape with the film's energy curve from `direction`. |

## 3. Check the grid (the click-track test, numerically)

You cannot listen, so measure: for each beat, the strongest transient within half a sixteenth (±P/8) of a 2 ms full-band envelope, and its distance from the beat.

```
ffmpeg -v error -i assets/track.mp3 -af "aformat=channel_layouts=mono,aresample=48000,asetnsamples=n=96:p=0,asetpts=N/SR/TB,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=assets/beat-fine.txt" -f null -
node - assets/beat-fine.txt 117.000 0.030 <<'EOF'
const fs = require("fs"); const [f, b, fb, t0 = 0, t1 = 1e9] = process.argv.slice(2), H = 0.002, P = 60 / +b, F = +fb;
const e = fs.readFileSync(f, "utf8").split("\n").filter((l) => l.includes("RMS_level")).map((l) => { const v = parseFloat(l.split("=")[1]); return Number.isFinite(v) ? Math.max(v, -90) : -90; });
const rise = (i) => (i < 4 || i >= e.length ? 0 : Math.max(0, e[i] - Math.min(e[i - 1], e[i - 2], e[i - 3])));
const err = []; let beats = 0;
for (let k = 0, t = F; t < Math.min(+t1, e.length * H - P); k++, t = F + k * P) { if (t < +t0 || t < P) continue; beats++;
  let best = { r: 0, t }; for (let i = Math.round((t - P / 8) / H); i <= Math.round((t + P / 8) / H); i++) if (rise(i) > best.r) best = { r: rise(i), t: i * H };
  if (best.r >= 6) err.push(best.t - t); }
const a = err.map(Math.abs).sort((x, y) => x - y), s = [...err].sort((x, y) => x - y);
console.log(`beats ${beats}, with a transient ${(err.length / beats).toFixed(2)}, median |error| ${(a[a.length >> 1] * 1000).toFixed(1)} ms, median signed ${(s[s.length >> 1] * 1000).toFixed(1)} ms, within 20 ms ${(a.filter((x) => x <= 0.02).length / a.length).toFixed(2)}`);
EOF
```

It takes about 5 s per minute of audio: on a long track, analyse the stretch you use (`-ss <start> -t <length>` before `-i`, then subtract the start from the first beat). The arguments are the detector's BPM and **first beat** (not the first downbeat), then optionally a window `t0 t1` in seconds to check one stretch (an edit point). Pass: **median |error| ≤ 20 ms** on a track with programmed or electronic drums (tested: 2.5–19 ms on six such tracks); an acoustic or swung track reads higher (22 ms folk, 26 ms swing jazz), so there compare readings instead: on every tested track the right grid read lowest, and wrong tempos or a grid shifted by a sixteenth read 22–43 ms. An orchestral score read 54 ms and was already flagged WEAK. A median signed error far from 0 near an edit point means the grid drifts there: move that edit point by it.

To let the user audition the grid, mix a click on every beat (3 kHz on the downbeat, 1.5 kHz on the others) under the track; `F` is the first downbeat and 117 the BPM:

```
ffmpeg -i assets/track.mp3 -f lavfi -i "aevalsrc='if(gte(t,0.030),0.35*sin(2*PI*(1500+1500*lt(mod(t-0.030,4*60/117),60/117))*t)*exp(-150*mod(t-0.030,60/117)),0)':s=48000:d=30" -filter_complex "[0:a]atrim=0:30,aresample=48000[m];[1:a]aformat=channel_layouts=stereo[c];[m][c]amix=inputs=2:normalize=0" assets/check-clicks.wav
```

## 4. Fit the picture to the track

1. **Anchor the track.** From the detector: the drop's downbeat D, the phrase starts (every 4 or 8 bars from the first downbeat, confirmed by the UP/DOWN bars), the quiet bar before the drop if any (the breath), and the button B (last strong hit, measured).
2. **Choose the stretch.** The film's peak frame (from `direction`'s energy curve) goes on D. Count whole bars back from D to the in point and set `startFrom` to that bar's downbeat, so frame 0 is a downbeat in a section with energy (a KICK-IN bar beats the soft intro). If that leaves the film too long or short, change the number of bars before the peak, never the bar length.
3. **Scene lengths in whole bars** (hook 1–2 bars, setup 1–2 bars, the breath 1 bar or the track's own dip, montage cuts every 2 beats or every beat, name reveal on a phrase start). At 117 BPM a bar is 61.54 f; scene lengths come out uneven by a frame, which is correct.
4. **Back-time the ending.** If B is not reached by playing on from the peak, edit: keep the peak's phrase, join at a later phrase start into the stretch that carries B (downbeat to downbeat), so B lands on the end-card frame and its tail rings 1–3 s past it. The peak wins over the button when you can only have one unedited stretch (SKILL.md, Peak alignment vs back-timing).
5. **Frames from times.** For each event, `exact = fps × (track time − startFrom)` on the edited timeline; `round(exact)` for ordinary cuts. For the cuts that carry the film (the peak, the name, the end card, any montage hit) read the measured transient from the check above in that window and use `floor(fps × transient)`, so the cut is never after the sound (tested: plain rounding put one cut 35 ms after its transient; flooring the grid put another 45 ms before it).
6. **SFX on the grid.** A visible event that is also on a beat (a tap, a pop on a card's arrival) takes the same frame as the cut; its sound file must start on its transient (no silent head). Keep accents ≤ 0.7 on a pre-mastered music bed, and do not stack a heavy hit on the drop itself: the drop is already the loudest moment.

**Edit with the crossfade centred on both downbeats.** `acrossfade` overlaps the last `d` of A with the first `d` of B, so a plain cut at both downbeats moves B's downbeat `d` early (a 30 ms crossfade puts it one frame early). End A `d/2` after its out-downbeat and start B `d/2` before its in-downbeat:

```
ffmpeg -i assets/track.mp3 -filter_complex "[0:a]aresample=48000,asplit[x][y];[x]atrim=8.220:20.558,asetpts=PTS-STARTPTS[a];[y]atrim=start=295.401,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=0.03:c1=tri:c2=tri,atrim=0:20,afade=t=out:st=19.7:d=0.3[out]" -map "[out]" -c:a pcm_s16le assets/track-edit.wav
```

Here A runs from bar 5 (8.235 s) to bar 11 (20.543 s) and B from bar 145 (295.416 s); the film's grid is then `0.015 + k × 60/BPM` s. Pre-master the edit (SKILL.md, Pre-master what the SFX sit on) and place it at 1.0 with `startFrom` 0.

## 5. Worked example (tested)

A 20 s launch film at 30 fps for a fictional team-updates app, on "Ethernight Club" by Kevin MacLeod (CC BY 4.0, 117 BPM on the incompetech page; detected 117.000, grid strength 15.7, check 2.5 ms median). The detector's map: soft intro bars 1–4, KICK-IN at bar 5, a dip at bar 8 (−20.5 dB, kick −38.6), the drop at bar 9 (16.44 s, +7.7 dB full band, +24 dB kick band), 8-bar phrases to a breakdown at bar 144 and a final hit at 300.795 s after a half-second dropout (between beats: it is measured, not on the grid).

| Film bar | Track | Event | Exact frame | Frame used | Cut − music transient |
|---|---|---|---|---|---|
| 1 | bar 5 downbeat (`startFrom` 8.220) | hook card, frame 0 on the kick's return | 0.45 | 0 | −12 ms |
| 2 | bar 6 | cut + UI click (0.6) | 61.99 | 62 (transient 62.34) | −11 ms |
| 3 | bar 7 | cut: "There is a better way" | 123.53 | 122 (transient 122.94) | −31 ms |
| 4 | bar 8, the track's dip | the breath: picture holds | 185.07 | 185 | −5 ms |
| 5 | bar 9, the drop | **peak**: product reveal; soft thud 0.5 | 246.60 | 246 | −18 ms |
| 5 beat 3, 6, 6 beat 3 | bars 9–10 | montage cuts, a pop each (0.42–0.46) | 277.37, 308.14, 338.91 | 277, 308, 338 | −11, −3, −31 ms |
| 7 | join → bar 145 (phrase start of the ending) | **name reveal**; glass bell 0.6 | 369.68 | 369 | −20 ms |
| — | final hit 300.795 s | **end card on the button**; tail rings to frame 600 | 531.06 | 531 | −2 ms |

Every cut lands 0–31 ms before its musical transient, never after. Measured on the export: −13.9 LUFS integrated, −1.8 dBTP, LRA 5.1 LU, re-master `linear`; no stretch of 0.3 s under −60 dBFS, no 0.5 s under −50 dB; no noise bed anywhere.

`VIDEO.md` for it:

```
## Music
Brief: 110–125 BPM electronic, kick-driven, a clear drop for the reveal, a hard ending; 20 s.
Track: "Ethernight Club", Kevin MacLeod — https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2100002 — CC BY 4.0
Grid: 117.000 BPM (15.385 f/beat), first downbeat 0.030 s, check 2.5 ms median; drop bar 9 (16.440 s); button 300.795 s.
Edit: 8.220–20.558 s + 295.401 s–end, 30 ms crossfade centred on the bar 11 / bar 145 downbeats; pre-mastered −15 LUFS / −3 dBTP.
## Credits
- Music: "Ethernight Club" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/ — in the video description
- SFX: Kenney Interface / UI / Impact Sounds (kenney.nl), CC0 1.0 — no credit required, listed for provenance
```
