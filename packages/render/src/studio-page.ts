/**
 * The `genmotion dev` studio: one static page that mounts the same host
 * bundle the renderer captures from, in preview mode, under a minimal player.
 *
 * Deliberately framework-free and self-contained — it ships inside the CLI as a
 * string, loads nothing from the network, and a file change reloads the page
 * at the frame you were on (`#f=<frame>`), which keeps every engine's mount and
 * teardown path the simple one.
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
  input[type=range] { flex: 1; accent-color: var(--accent); height: 30px; }
  #scenes { display: flex; gap: 2px; height: 24px; border-radius: 6px; overflow: hidden; }
  #scenes button { height: 24px; border-radius: 0; border: 0; min-width: 0; padding: 0 8px; background: #20202a;
    color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
  #scenes button.active { background: #2c3514; color: var(--accent); }
  .hint { color: var(--muted); font-size: 11px; margin-left: auto; }
  code { font: 11px ui-monospace, Menlo, monospace; color: var(--text); background: #1d1d26; padding: 1px 5px; border-radius: 4px; }
  @media (max-width: 640px) { .hint { display: none; } #time { min-width: 0; } }
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
  <div id="scenes"></div>
  <div class="row">
    <button id="play" title="Play / pause (space)">&#9654;</button>
    <button id="prev" title="Previous frame (&#8592;)">&#8249;</button>
    <button id="next" title="Next frame (&#8594;)">&#8250;</button>
    <input id="scrub" type="range" min="0" value="0" step="1" aria-label="Frame">
    <span id="time"></span>
    <span class="hint">Render with <code>npx genmotion render</code></span>
  </div>
</footer>
<script src="/__gm/host.js"></script>
<script>
(async () => {
  const $ = (id) => document.getElementById(id);
  const res = await fetch("/__gm/composition");
  const comp = await res.json();
  let frame = Number((location.hash.match(/f=(\\d+)/) || [])[1] || 0);

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
    location.hash = "f=" + frame;
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

  const chips = comp.scenes.map((scene) => {
    const b = document.createElement("button");
    b.textContent = scene.name;
    b.title = scene.file + " — " + (scene.durationInFrames / comp.fps).toFixed(2) + "s";
    b.style.flex = String(scene.durationInFrames);
    b.onclick = () => { pause(); seek(scene.startFrame); };
    $("scenes").appendChild(b);
    return b;
  });

  const scrub = $("scrub");
  scrub.max = String(total - 1);
  const fmt = (f) => {
    const s = f / comp.fps, m = Math.floor(s / 60);
    return m + ":" + (s - m * 60).toFixed(2).padStart(5, "0");
  };

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
    scrub.value = String(frame);
    $("time").innerHTML = "<b>" + fmt(frame) + "</b> / " + fmt(total) + " · frame " + frame;
    comp.scenes.forEach((s, i) => chips[i].classList.toggle("active", frame >= s.startFrame && frame < s.startFrame + s.durationInFrames));
    draw(frame, live);
  };
  const seek = (f) => { frame = Math.max(0, Math.min(total - 1, f)); render(false); };

  let playing = false, anchor = 0, anchorFrame = 0;
  const tick = (now) => {
    if (!playing) return;
    const next = anchorFrame + Math.floor(((now - anchor) / 1000) * comp.fps);
    if (next >= total) { anchor = now; anchorFrame = 0; frame = 0; } else frame = next;
    render(true);
    requestAnimationFrame(tick);
  };
  const play = () => {
    if (playing) return;
    if (frame >= total - 1) frame = 0;
    playing = true; anchor = performance.now(); anchorFrame = frame;
    $("play").innerHTML = "&#10074;&#10074;";
    requestAnimationFrame(tick);
  };
  const pause = () => { playing = false; $("play").innerHTML = "&#9654;"; render(false); };

  $("play").onclick = () => (playing ? pause() : play());
  $("prev").onclick = () => { pause(); seek(frame - 1); };
  $("next").onclick = () => { pause(); seek(frame + 1); };
  scrub.oninput = () => { if (playing) pause(); seek(Number(scrub.value)); };
  addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement && e.key !== " ") return;
    if (e.key === " ") { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key === "ArrowLeft") { pause(); seek(frame - (e.shiftKey ? comp.fps : 1)); }
    else if (e.key === "ArrowRight") { pause(); seek(frame + (e.shiftKey ? comp.fps : 1)); }
    else if (e.key === "Home") { pause(); seek(0); }
    else if (e.key === "End") { pause(); seek(total - 1); }
  });
  seek(frame);
})();
</script>
</body>
</html>
`;
