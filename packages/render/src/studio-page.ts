/**
 * The `genmotion dev` studio: one static page that mounts the same host
 * bundle the renderer captures from, in preview mode, under a minimal player.
 *
 * Deliberately framework-free and self-contained — it ships inside the CLI as a
 * string, loads nothing from the network, and a file change reloads the page
 * at the frame you were on (`#f=<frame>`), which keeps every engine's mount and
 * teardown path the simple one.
 *
 * The footer is a timeline in the desktop app's shape: a scene track, then a
 * voiceover lane and the audio lanes from project.json, each clip drawn with
 * its waveform. Playback is clocked by the AudioContext when there is audio,
 * so picture and sound can't drift apart. Editing stays with the agent
 * (`genmotion audio …`); this page shows the result as it lands.
 */
export const STUDIO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GenMotion Studio</title>
<style>
  :root {
    --bg: #0b0b0f; --panel: #14141b; --line: #262631; --text: #ececf1; --muted: #8b8b99;
    --accent: #c6f91e; --accent-2: #16f5bd; --danger: #ff5a6a;
    color-scheme: dark;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: var(--bg); color: var(--text);
    font: 13px/1.4 Inter, -apple-system, "Segoe UI", system-ui, sans-serif; }
  body { display: grid; grid-template-rows: auto 1fr auto; }
  header { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--line); }
  header .logo { width: 10px; height: 10px; border-radius: 3px; background: linear-gradient(135deg, var(--accent), var(--accent-2)); }
  header h1 { font-size: 13px; font-weight: 600; }
  header .meta { color: var(--muted); margin-left: auto; font-variant-numeric: tabular-nums; }
  header .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-2); }
  header .dot.stale { background: var(--muted); }
  main { position: relative; overflow: hidden; display: grid; place-items: center; padding: 16px; }
  #stage { position: relative; box-shadow: 0 20px 60px rgba(0,0,0,.5); background:
    repeating-conic-gradient(#1a1a22 0% 25%, #121218 0% 50%) 50% / 24px 24px; }
  #scaler { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
  #errors { position: absolute; inset: 16px; overflow: auto; display: none; background: rgba(20,8,10,.96);
    border: 1px solid var(--danger); border-radius: 10px; padding: 18px; font: 12px/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; }
  #errors h2 { color: var(--danger); font: 600 13px/1.4 Inter, system-ui, sans-serif; margin-bottom: 10px; }
  footer { border-top: 1px solid var(--line); background: var(--panel); padding: 10px 16px 12px; display: grid; gap: 10px; }
  .row { display: flex; align-items: center; gap: 10px; }
  button { background: #1d1d26; color: var(--text); border: 1px solid var(--line); border-radius: 7px;
    height: 30px; min-width: 30px; padding: 0 10px; cursor: pointer; font: inherit; }
  button:hover { border-color: #3a3a48; }
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  #play { width: 38px; font-size: 14px; }
  #time { font-variant-numeric: tabular-nums; color: var(--muted); min-width: 170px; }
  #time b { color: var(--text); font-weight: 600; }
  #mute { font-size: 13px; }
  #mute.off { color: var(--muted); }
  #tl { position: relative; display: grid; grid-template-columns: 76px 1fr; row-gap: 3px; user-select: none; }
  #tl .label { color: var(--muted); font-size: 11px; height: 34px; display: flex; align-items: center; padding-right: 8px;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  #tl .label.ruler { height: 18px; }
  #tl .lane { position: relative; height: 34px; background: #101016; border-radius: 5px; overflow: hidden; cursor: pointer; }
  #tl .lane.scenes, #tl .label.scenes { height: 26px; }
  #ruler { height: 18px; display: block; width: 100%; cursor: pointer; }
  .clip { position: absolute; top: 0; bottom: 0; border-radius: 5px; overflow: hidden; font-size: 11px; color: var(--text);
    background: #1c2a33; border: 1px solid #2c4552; }
  .clip canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .clip span { position: absolute; left: 6px; top: 3px; right: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    text-shadow: 0 1px 2px #000; pointer-events: none; }
  .clip.voice { background: #2a2036; border-color: #4a3660; }
  .clip.muted { opacity: .45; }
  .clip.missing { background: #2a1416; border-color: var(--danger); }
  .clip.missing span { color: var(--danger); }
  .scene { position: absolute; top: 0; bottom: 0; border: 0; border-radius: 4px; padding: 0 8px; background: #20202a; color: var(--muted);
    font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; height: auto; min-width: 0; }
  .scene.active { background: #2c3514; color: var(--accent); }
  #playhead { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--accent); pointer-events: none; z-index: 2; }
  #playhead::before { content: ""; position: absolute; top: 0; left: -5px; border: 5px solid transparent; border-top: 6px solid var(--accent); }
  .hint { color: var(--muted); font-size: 11px; margin-left: auto; }
  code { font: 11px ui-monospace, Menlo, monospace; color: var(--text); background: #1d1d26; padding: 1px 5px; border-radius: 4px; }
  @media (max-width: 640px) { .hint { display: none; } #time { min-width: 0; } #tl { grid-template-columns: 0 1fr; } }
</style>
</head>
<body>
<header>
  <span class="logo"></span><h1 id="title">GenMotion Studio</h1>
  <span class="meta" id="meta"></span><span class="dot" id="live" title="Watching for changes"></span>
</header>
<main id="main">
  <div id="stage"><div id="scaler"><div id="root"></div></div></div>
  <div id="errors"></div>
</main>
<footer>
  <div class="row">
    <button id="play" title="Play / pause (space)">&#9654;</button>
    <button id="prev" title="Previous frame (&#8592;)">&#8249;</button>
    <button id="next" title="Next frame (&#8594;)">&#8250;</button>
    <button id="mute" title="Sound on / off (m)" aria-label="Sound on or off">&#128266;</button>
    <span id="time"></span>
    <span class="hint">Render with <code>npx @genmotion/cli render</code></span>
  </div>
  <div id="tl" role="slider" aria-label="Timeline" tabindex="-1"></div>
</footer>
<script src="/__gm/host.js"></script>
<script>
(async () => {
  const $ = (id) => document.getElementById(id);
  const res = await fetch("/__gm/composition");
  const comp = await res.json();
  let frame = Number((location.hash.match(/f=(\\d+)/) || [])[1] || 0);
  let playing = false;

  const showErrors = (title, lines) => {
    const box = $("errors");
    box.style.display = "block";
    box.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = title;
    box.appendChild(h);
    box.appendChild(document.createTextNode(lines.join("\\n\\n")));
  };

  const events = new EventSource("/__gm/events");
  events.addEventListener("change", () => {
    location.hash = "f=" + frame + (playing ? "&p=1" : "");
    location.reload();
  });
  events.onerror = () => $("live").classList.add("stale");
  events.onopen = () => $("live").classList.remove("stale");

  if (comp.error) return showErrors("Can't load the project", [comp.error]);
  $("title").textContent = comp.name;
  document.title = comp.name + " — GenMotion Studio";
  $("meta").textContent = comp.width + "×" + comp.height + " · " + comp.fps + " fps · " + comp.engine;
  if (comp.errors.length) {
    showErrors("Scene failed to compile", comp.errors.map((e) => e.file + "\\n" + e.message));
  }
  if (!comp.scenes.length) {
    if (!comp.errors.length) showErrors("Nothing to play", ["project.json lists no scenes yet."]);
    return;
  }

  const init = window.__gmInit({ scenes: comp.scenes, fps: comp.fps, width: comp.width, height: comp.height, mode: "preview" });
  if (init && init.error) return showErrors("Scene failed to load", [init.error]);
  const gm = window.__gm;
  const total = gm.getTotalFrames();

  const fit = () => {
    const main = $("main");
    const scale = Math.min((main.clientWidth - 32) / comp.width, (main.clientHeight - 32) / comp.height);
    $("stage").style.width = comp.width * scale + "px";
    $("stage").style.height = comp.height * scale + "px";
    $("scaler").style.transform = "scale(" + scale + ")";
  };
  new ResizeObserver(fit).observe($("main"));
  fit();

  const fps = comp.fps;
  const fmt = (f) => {
    const s = f / fps, m = Math.floor(s / 60);
    return m + ":" + (s - m * 60).toFixed(2).padStart(5, "0");
  };
  const pct = (f) => (f / total) * 100 + "%";

  // ---- The timeline: a ruler, the scene track, then the audio lanes.
  const tl = $("tl");
  const addRow = (label, kind) => {
    const l = document.createElement("div");
    l.className = "label" + (kind ? " " + kind : "");
    l.textContent = label;
    l.title = label;
    tl.appendChild(l);
    const lane = document.createElement(kind === "ruler" ? "canvas" : "div");
    if (kind === "ruler") lane.id = "ruler"; else lane.className = "lane " + (kind || "");
    tl.appendChild(lane);
    return lane;
  };
  const ruler = addRow("", "ruler");
  const sceneLane = addRow("Scenes", "scenes");
  const chips = comp.scenes.map((scene) => {
    const b = document.createElement("button");
    b.className = "scene";
    b.textContent = scene.name;
    b.title = scene.file + " — " + (scene.durationInFrames / fps).toFixed(2) + "s";
    b.style.left = pct(scene.startFrame);
    b.style.width = "calc(" + pct(scene.durationInFrames) + " - 2px)";
    // A scene jumps to its start; anywhere else on the timeline seeks to the pointer.
    b.onpointerdown = (e) => e.stopPropagation();
    b.onclick = () => { pause(); seek(scene.startFrame); };
    sceneLane.appendChild(b);
    return b;
  });

  const clips = comp.audio || [];
  const lanes = {};
  if (clips.some((c) => c.lane === "voice")) lanes.voice = addRow("Voiceover");
  const lastLane = clips.reduce((m, c) => (typeof c.lane === "number" ? Math.max(m, c.lane) : m), -1);
  for (let i = 0; i <= lastLane; i++) lanes[i] = addRow("Track " + i);
  const playhead = document.createElement("div");
  playhead.id = "playhead";
  tl.appendChild(playhead);

  // A voiceover plays to its own end, which only decoding tells us; until
  // then it is drawn to the end of the video.
  const clipFrames = (c) => {
    if (c.durationInFrames != null) return c.durationInFrames;
    if (c.buffer) return Math.max(1, Math.min(total - c.startFrame, Math.round((c.buffer.duration - c.startFrom) * fps)));
    return Math.max(1, total - c.startFrame);
  };
  // Fades as the render applies them: squeezed to fit when they overlap.
  const fades = (c, L) => {
    let fi = c.fadeInFrames / fps, fo = c.fadeOutFrames / fps;
    if (fi + fo > L && fi + fo > 0) { const k = L / (fi + fo); fi *= k; fo *= k; }
    return [fi, fo];
  };
  const envelope = (c, t, L) => {
    const [fi, fo] = fades(c, L);
    let g = 1;
    if (fi > 0 && t < fi) g = Math.min(g, t / fi);
    if (fo > 0 && t > L - fo) g = Math.min(g, (L - t) / fo);
    return Math.max(0, Math.min(1, g));
  };

  const place = (c) => {
    c.el.style.left = pct(c.startFrame);
    c.el.style.width = pct(clipFrames(c));
  };
  const paint = (c) => {
    const cv = c.canvas, w = cv.clientWidth, h = cv.clientHeight;
    if (!c.buffer || !w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const g = cv.getContext("2d");
    const buf = c.buffer, sr = buf.sampleRate;
    const chans = [];
    for (let i = 0; i < Math.min(2, buf.numberOfChannels); i++) chans.push(buf.getChannelData(i));
    const L = clipFrames(c) / fps;
    const from = Math.floor(c.startFrom * sr), span = L * sr, cols = cv.width, mid = cv.height / 2;
    const per = Math.max(1, Math.floor(span / cols)), stride = Math.max(1, Math.floor(per / 48));
    // Scaled to the file's own loudest sample, so a quiet file still shows its
    // shape; the gain below is what makes one clip read louder than another.
    if (buf.gmPeak === undefined) {
      let top = 0;
      for (const data of chans) for (let i = 0; i < data.length; i += 16) top = Math.max(top, Math.abs(data[i]));
      buf.gmPeak = top || 1;
    }
    g.fillStyle = c.lane === "voice" ? "rgba(196,160,255,.8)" : "rgba(22,245,189,.72)";
    for (let x = 0; x < cols; x++) {
      const a = from + Math.floor((x / cols) * span);
      if (a >= buf.length) break;
      let peak = 0;
      for (const data of chans) {
        for (let i = a; i < a + per && i < data.length; i += stride) {
          const v = Math.abs(data[i]);
          if (v > peak) peak = v;
        }
      }
      // Drawn at the level it plays: volume and fades shape the waveform.
      const gain = Math.min(1, c.volume) * envelope(c, (x / cols) * L, L);
      const hh = Math.max(0.5, (peak / buf.gmPeak) * gain * mid * 0.85);
      g.fillRect(x, mid - hh, 1, hh * 2);
    }
  };

  // ---- Sound. One AudioContext, created up front so files decode while the
  // page loads; it starts making sound on the first play (a user gesture).
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = clips.length && AC ? new AC() : null;
  const master = ctx ? ctx.createGain() : null;
  if (master) master.connect(ctx.destination);
  let soundOn = true;
  try { soundOn = localStorage.getItem("gm-studio-sound") !== "off"; } catch (e) {}
  const applySound = () => {
    if (master) master.gain.value = soundOn ? 1 : 0;
    $("mute").innerHTML = soundOn ? "&#128266;" : "&#128263;";
    $("mute").classList.toggle("off", !soundOn);
  };
  applySound();
  if (!clips.length) $("mute").style.display = "none";

  const decoded = {};
  clips.forEach((c) => {
    const el = document.createElement("div");
    el.className = "clip" + (c.lane === "voice" ? " voice" : "") + (c.muted ? " muted" : "");
    el.title = c.label + " · " + c.file + " · " + fmt(c.startFrame) +
      (c.volume !== 1 ? " · volume " + c.volume : "") + (c.muted ? " · muted" : "");
    const cv = document.createElement("canvas");
    const name = document.createElement("span");
    name.textContent = c.label;
    el.append(cv, name);
    lanes[c.lane].appendChild(el);
    c.el = el;
    c.canvas = cv;
    place(c);
    if (!ctx) return;
    decoded[c.url] = decoded[c.url] || fetch(c.url)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
      .then((bytes) => ctx.decodeAudioData(bytes));
    decoded[c.url].then(
      (buffer) => {
        c.buffer = buffer;
        place(c);
        paint(c);
        if (playing) startAudio(frame, now());
      },
      () => {
        el.classList.add("missing");
        el.title = "Can't load " + c.file;
      },
    );
  });

  let voices = [];
  const stopAudio = () => {
    voices.forEach((v) => { try { v.stop(); } catch (e) {} });
    voices = [];
  };
  // Schedules every clip from fromFrame, which plays at context time at.
  const startAudio = (fromFrame, at) => {
    if (!ctx) return;
    stopAudio();
    const t0 = fromFrame / fps;
    clips.forEach((c) => {
      if (!c.buffer || c.muted) return;
      const s0 = c.startFrame / fps, L = clipFrames(c) / fps;
      if (t0 >= s0 + L) return;
      const offset = Math.max(0, t0 - s0);
      const when = at + Math.max(0, s0 - t0);
      const src = ctx.createBufferSource();
      src.buffer = c.buffer;
      const gain = ctx.createGain();
      src.connect(gain);
      gain.connect(master);
      const [fi, fo] = fades(c, L);
      const points = [offset, L];
      if (fi > offset) points.push(fi);
      if (fo > 0 && L - fo > offset) points.push(L - fo);
      points.sort((a, b) => a - b).forEach((x, i) => {
        const v = c.volume * envelope(c, x, L);
        if (i === 0) gain.gain.setValueAtTime(v, when);
        else gain.gain.linearRampToValueAtTime(v, when + (x - offset));
      });
      src.start(when, c.startFrom + offset, L - offset);
      voices.push(src);
    });
  };

  const sizeRuler = () => {
    const w = ruler.clientWidth, h = ruler.clientHeight;
    if (!w) return;
    const dpr = window.devicePixelRatio || 1;
    ruler.width = Math.round(w * dpr);
    ruler.height = Math.round(h * dpr);
    const g = ruler.getContext("2d");
    g.scale(dpr, dpr);
    const seconds = total / fps;
    const step = [0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300].find((s) => (s / seconds) * w >= 64) || 600;
    g.font = "10px Inter, system-ui, sans-serif";
    g.textBaseline = "top";
    for (let t = 0; t <= seconds + 1e-6; t += step / 2) {
      const x = Math.round((t / seconds) * w) + 0.5;
      const major = Math.abs(t / step - Math.round(t / step)) < 1e-6;
      g.fillStyle = major ? "#4a4a58" : "#2c2c36";
      g.fillRect(x, major ? h - 7 : h - 4, 1, major ? 7 : 4);
      if (major && x < w - 24) {
        g.fillStyle = "#8b8b99";
        g.fillText(step < 1 ? t.toFixed(2) + "s" : fmt(Math.round(t * fps)).replace(/\\.00$/, ""), x + 3, 1);
      }
    }
  };
  const movePlayhead = () => {
    playhead.style.left = ruler.offsetLeft + (ruler.clientWidth * frame) / Math.max(1, total - 1) + "px";
  };
  new ResizeObserver(() => {
    sizeRuler();
    clips.forEach(paint);
    movePlayhead();
  }).observe(tl);

  // Click or drag anywhere on the timeline to seek.
  const frameAt = (e) => {
    const rect = ruler.getBoundingClientRect();
    return Math.round(((e.clientX - rect.left) / rect.width) * (total - 1));
  };
  let dragging = false;
  tl.addEventListener("pointerdown", (e) => {
    if (e.clientX < ruler.getBoundingClientRect().left) return;
    dragging = true;
    tl.setPointerCapture(e.pointerId);
    if (playing) pause();
    seek(frameAt(e));
  });
  tl.addEventListener("pointermove", (e) => { if (dragging) seek(frameAt(e)); });
  tl.addEventListener("pointerup", () => { dragging = false; });
  tl.addEventListener("pointercancel", () => { dragging = false; });

  frame = Math.min(total - 1, frame);
  let busy = false, queued = null;
  const draw = async (f, live) => {
    if (busy) { queued = [f, live]; return; }
    busy = true;
    try { await gm.setFrame(f, { live }); } catch (e) { console.error(e); }
    busy = false;
    const err = gm.getLastError();
    if (err) showErrors("Runtime error", [err]); else if (!comp.errors.length) $("errors").style.display = "none";
    if (queued) { const q = queued; queued = null; draw(q[0], q[1]); }
  };
  const render = (live) => {
    tl.setAttribute("aria-valuenow", String(frame));
    $("time").innerHTML = "<b>" + fmt(frame) + "</b> / " + fmt(total) + " · frame " + frame;
    comp.scenes.forEach((s, i) => chips[i].classList.toggle("active", frame >= s.startFrame && frame < s.startFrame + s.durationInFrames));
    movePlayhead();
    draw(frame, live);
  };
  const seek = (f) => { frame = Math.max(0, Math.min(total - 1, f)); render(false); };

  // With audio, the AudioContext is the clock: picture follows sound, so the
  // two can't drift apart over a long video.
  const now = () => (ctx ? ctx.currentTime : performance.now() / 1000);
  let anchor = 0, anchorFrame = 0;
  const tick = () => {
    if (!playing) return;
    const next = anchorFrame + Math.floor((now() - anchor) * fps);
    if (next >= total) {
      anchor = now(); anchorFrame = 0; frame = 0;
      startAudio(0, anchor);
    } else frame = next;
    render(true);
    requestAnimationFrame(tick);
  };
  const play = () => {
    if (playing) return;
    if (frame >= total - 1) frame = 0;
    if (ctx && ctx.state !== "running") ctx.resume();
    playing = true; anchor = now(); anchorFrame = frame;
    startAudio(frame, anchor);
    $("play").innerHTML = "&#10074;&#10074;";
    requestAnimationFrame(tick);
  };
  const pause = () => {
    playing = false;
    stopAudio();
    $("play").innerHTML = "&#9654;";
    render(false);
  };
  const toggleSound = () => {
    soundOn = !soundOn;
    try { localStorage.setItem("gm-studio-sound", soundOn ? "on" : "off"); } catch (e) {}
    applySound();
  };

  // A reload for a file change keeps playing when the browser lets this page
  // make sound again without a fresh click.
  let resumeWanted = /p=1/.test(location.hash);

  $("play").onclick = () => { resumeWanted = false; playing ? pause() : play(); };
  $("prev").onclick = () => { pause(); seek(frame - 1); };
  $("next").onclick = () => { pause(); seek(frame + 1); };
  $("mute").onclick = toggleSound;
  addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    resumeWanted = false;
    if (e.key === " ") { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key === "m") toggleSound();
    else if (e.key === "ArrowLeft") { pause(); seek(frame - (e.shiftKey ? fps : 1)); }
    else if (e.key === "ArrowRight") { pause(); seek(frame + (e.shiftKey ? fps : 1)); }
    else if (e.key === "Home") { pause(); seek(0); }
    else if (e.key === "End") { pause(); seek(total - 1); }
  });
  seek(frame);
  if (resumeWanted) {
    if (!ctx) play();
    else ctx.resume().then(() => { if (resumeWanted) play(); });
  }
})();
</script>
</body>
</html>
`;
