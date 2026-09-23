"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePlaybackStore, usePlaybackStoreApi, selectDisplayFrame } from "@genmotion/player";
import { framesToTimecode, globalToLocal, type SceneData } from "@genmotion/shared";
import { API_URL } from "@/lib/api";
import { useEditorStore, useEditorStoreApi, type ElementContext } from "@/stores/editor-store";
import { useTabActive } from "../../../tabs/active-tab";
import { PreviewMarkup } from "../preview-markup";

/**
 * The HyperFrames composition, in an iframe, wired to the tab's playback clock.
 *
 * The page is the loopback server's compile of the project (see
 * `electron/local-server.ts`, `previewRoutes`) with the HyperFrames runtime
 * in it. The runtime owns playback — it drives GSAP, keeps `<video>` and
 * `<audio>` in sync, and reports its position — and speaks to whoever
 * embeds it over `postMessage`: `hf-parent` control messages in, `hf-preview`
 * state out. This component is that parent. The store stays the source of
 * truth for the transport and the timeline; the runtime is told what the
 * store decided, and the store is told where the runtime got to.
 */

/** What the runtime's picker says about an element, in the iframe's own pixels. */
interface PickedElement {
  id: string | null;
  tagName: string;
  label: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  textContent: string | null;
}

/** What the runtime posts. Only the fields read here. */
type RuntimeMessage =
  | { source: "hf-preview"; type: "ready" }
  | {
      source: "hf-preview";
      type: "timeline";
      durationSeconds: number;
      durationInFrames: number;
      compositionWidth: number;
      compositionHeight: number;
      fps?: { numerator: number; denominator: number };
    }
  | {
      source: "hf-preview";
      type: "state";
      frame: number;
      isPlaying: boolean;
      fps?: { numerator: number; denominator: number };
    }
  | { source: "hf-preview"; type: "element-hovered"; elementInfo: PickedElement }
  | {
      source: "hf-preview";
      type: "element-pick-candidates";
      candidates: PickedElement[];
      point: { x: number; y: number };
    }
  | { source: "hf-preview"; type: "pick-mode-cancelled" }
  | { source: "hf-preview"; type: string };

/** A compiled page the stage is showing, or loading behind the one it shows. */
interface Page {
  revision: number;
  /** Its runtime has announced itself and been put at the current frame. */
  ready: boolean;
}

/** How long to wait for a reloaded page to confirm it is playing before showing it anyway. */
const PENDING_PLAY_TIMEOUT_MS = 800;

/** Purple, the same as the React inspector's. */
const HILITE = "#a855f7";
const BUBBLE_W = 300;
const BUBBLE_H = 68;

/** An open comment bubble, in the stage's own pixels. */
interface Draft {
  element: ElementContext;
  box: { left: number; top: number; width: number; height: number };
  anchor: { x: number; y: number };
  place: { left: number; top: number };
}

function SendGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function runtimeFps(fps: { numerator: number; denominator: number } | undefined): number {
  if (!fps || !fps.numerator || !fps.denominator) return 30;
  return fps.numerator / fps.denominator;
}

export function previewUrlFor(dir: string, revision: number): string {
  return `${API_URL}/api/projects${dir}/preview/index.html?r=${revision}`;
}

export function HyperframesStage({
  dir,
  revision,
  fps,
  width,
  height,
  scenes,
}: {
  dir: string;
  /** Bumped per compile; a new value reloads the page. */
  revision: number;
  /** The project's frame rate — what the store counts in. */
  fps: number;
  width: number;
  height: number;
  /** The scene chips, in order — a picked element is attributed to the one under the playhead. */
  scenes: SceneData[];
}) {
  const store = usePlaybackStoreApi();
  const frame = usePlaybackStore(selectDisplayFrame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const tabActive = useTabActive();
  const stageRef = useRef<HTMLDivElement>(null);

  // Two pages at most: the one on screen, and the next compile loading
  // behind it. The agent writes a composition a file at a time, so
  // revisions come in bursts; reloading the visible iframe on each would
  // flash black and drop the playhead every few seconds. The new page loads
  // hidden, is put at the current frame, and is swapped in on its ready
  // handshake — the old one goes only once the new one can take over. A
  // burst collapses: a further revision replaces the one still loading.
  const [live, setLive] = useState<Page | null>(null);
  const [pending, setPending] = useState<Page | null>(null);
  const liveRef = useRef<Page | null>(null);
  liveRef.current = live;
  const pendingRef = useRef<Page | null>(null);
  pendingRef.current = pending;
  const frames = useRef(new Map<number, HTMLIFrameElement>());
  const ready = live?.ready ?? false;
  const liveFrame = () => (liveRef.current ? frames.current.get(liveRef.current.revision) : undefined);

  // Element picking. The composition lives in a cross-origin iframe, so the
  // React inspector's DOM walk can't reach it; the runtime has a pick mode
  // for exactly this — it outlines what the pointer is over and reports the
  // click as a list of candidates, topmost first, with boxes in its own
  // pixels. This side turns that into the same comment bubble the React
  // preview opens, in the stage's pixels.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState("");
  const noteRef = useRef<HTMLInputElement>(null);
  const editorStore = useEditorStoreApi();
  const drawing = useEditorStore((s) => s.previewTool === "draw");
  // The drawing layer sits over the iframe and takes the pointer, so the
  // runtime's pick mode sees nothing while it is up; an open bubble goes too.
  useEffect(() => {
    if (drawing) setDraft(null);
  }, [drawing]);
  const addElement = useEditorStore((s) => s.addElement);
  const requestPrompt = useEditorStore((s) => s.requestPrompt);
  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;
  const sizeRef = useRef({ width, height });
  sizeRef.current = { width, height };
  /**
   * What the runtime is outlining under the pointer. Kept because its click
   * report leaves that very element out — the picker skips whatever carries
   * its highlight class — so a click on a heading comes back as the heading's
   * parent. The hovered element is the one the user means.
   */
  const hoveredRef = useRef<PickedElement | null>(null);
  /** The last frame the runtime told us about, so its echo isn't sent back as a seek. */
  const echoed = useRef<number | null>(null);
  /**
   * The pending page's revision, once it has been told to play and is
   * waiting for its own word that it actually is — see `swapIn` below.
   */
  const pendingAwaitingPlay = useRef<number | null>(null);
  const pendingSwapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const post = (target: HTMLIFrameElement | undefined, message: Record<string, unknown>) => {
    target?.contentWindow?.postMessage({ source: "hf-parent", type: "control", ...message }, "*");
  };
  const send = (message: Record<string, unknown>) => post(liveFrame(), message);

  /**
   * Put the pending page on screen and let the old one go.
   *
   * Called once the pending page is actually caught up — not the moment it
   * is told to be — so a swap never trades the old page's freeze for a new
   * one while a video or audio element is still seeking into place.
   */
  function swapIn(from: number) {
    // A newer revision can supersede this one while its timer or its "now
    // playing" confirmation is still in flight — the callback that reaches
    // here is then talking about a page whose iframe is already gone.
    // Swapping it in anyway would tear down the page actually on screen and
    // put up a blank one loading from scratch: a worse freeze than the one
    // this function exists to avoid.
    if (pendingRef.current?.revision !== from) return;
    if (pendingSwapTimer.current) {
      clearTimeout(pendingSwapTimer.current);
      pendingSwapTimer.current = null;
    }
    pendingAwaitingPlay.current = null;
    echoed.current = null;
    hoveredRef.current = null;
    setPending(null);
    setLive({ revision: from, ready: true });
  }
  const swapInRef = useRef(swapIn);
  swapInRef.current = swapIn;

  // A compile landed. The first is the page; every later one loads behind it.
  useEffect(() => {
    const current = liveRef.current;
    if (!current) {
      setLive({ revision, ready: false });
      return;
    }
    if (current.revision === revision) return;
    // This revision replaces whatever was still loading — an agent turn can
    // land several in a row. Its iframe unmounts, so a fallback timer or a
    // "now playing" flag still waiting on that one must go with it, or a
    // late timer fires `swapIn` for a page that is no longer there.
    if (pendingSwapTimer.current) {
      clearTimeout(pendingSwapTimer.current);
      pendingSwapTimer.current = null;
    }
    pendingAwaitingPlay.current = null;
    setPending({ revision, ready: false });
  }, [revision]);

  /** Everything a freshly loaded page is told before it may be looked at. */
  function handshake(target: HTMLIFrameElement | undefined) {
    const state = store.getState();
    // Land on the store's frame: a reload mid-scrub should not snap the
    // picture back to zero while the playhead says otherwise.
    post(target, { action: "seek", timeSeconds: state.frame / fps, seekMode: "commit" });
    post(target, { action: "set-muted", muted: !tabActiveRef.current });
    post(target, { action: "enable-pick-mode" });
    if (state.isPlaying) post(target, { action: "play" });
  }
  const tabActiveRef = useRef(tabActive);
  tabActiveRef.current = tabActive;
  const handshakeRef = useRef(handshake);
  handshakeRef.current = handshake;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Which of our pages is talking — the one on screen, or the one loading.
      let from: number | null = null;
      for (const [rev, el] of frames.current) {
        if (el.contentWindow === event.source) from = rev;
      }
      if (from === null) return;
      const data = event.data as RuntimeMessage | null;
      if (!data || data.source !== "hf-preview") return;
      const isLive = liveRef.current?.revision === from;
      const isPending = pendingRef.current?.revision === from;

      if (data.type === "timeline" && "durationSeconds" in data) {
        const seconds = Number.isFinite(data.durationSeconds) ? data.durationSeconds : 0;
        const total = Math.max(0, Math.round(seconds * fps));
        // The runtime re-announces its timeline as it goes — on play, on a
        // media settle — so only the first one after a load is the
        // handshake. Seeking on the later ones would pause playback.
        if (isLive) {
          store.getState().setTotalFrames(total);
          if (liveRef.current?.ready) return;
          handshakeRef.current(frames.current.get(from));
          setLive({ revision: from, ready: true });
          return;
        }
        if (isPending && !pendingRef.current?.ready) {
          // The next page is up: put it where the old one is. Marked ready
          // right away, same as the live branch above — the runtime re-announces
          // this while it is still settling, and re-handshaking on each one
          // would re-seek and re-send play into a page mid-seek, which is
          // exactly the kind of interruption that keeps it from ever
          // confirming it is playing before the fallback timer gives up on it.
          const state = store.getState();
          handshakeRef.current(frames.current.get(from));
          state.setTotalFrames(total);
          setPending({ revision: from, ready: true });
          if (state.isPlaying) {
            // Its seek can take a beat to decode — swap it in once it says
            // it is actually rolling, not the moment it is told to. A
            // runtime that never confirms still gets shown, after a wait.
            pendingAwaitingPlay.current = from;
            if (pendingSwapTimer.current) clearTimeout(pendingSwapTimer.current);
            pendingSwapTimer.current = setTimeout(() => swapInRef.current(from), PENDING_PLAY_TIMEOUT_MS);
            return;
          }
          swapInRef.current(from);
        }
        return;
      }
      if (
        data.type === "state" &&
        "frame" in data &&
        isPending &&
        pendingAwaitingPlay.current === from &&
        data.isPlaying
      ) {
        swapInRef.current(from);
        return;
      }
      // Everything else is only heard from the page on screen.
      if (!isLive) return;

      if (data.type === "pick-mode-cancelled") {
        // Escape inside the composition. Keep the mode on — it is how every
        // click gets reported — but let the bubble go the way Escape in it does.
        send({ action: "enable-pick-mode" });
        setDraft(null);
        return;
      }

      if (data.type === "element-hovered" && "elementInfo" in data) {
        hoveredRef.current = data.elementInfo;
        return;
      }

      if (data.type === "element-pick-candidates" && "candidates" in data) {
        // A click inside the iframe took the keyboard with it; the bubble is
        // out here, and so are Space and the arrow keys.
        window.focus();
        openDraftRef.current(data.candidates, data.point);
        return;
      }

      if (data.type === "state" && "frame" in data) {
        const seconds = data.frame / runtimeFps(data.fps);
        const next = Math.round(seconds * fps);
        const state = store.getState();
        if (state.isPlaying) {
          if (!data.isPlaying) {
            // Reached the end. The React player rewinds; do the same so the
            // next press of play starts over rather than sitting at the last frame.
            const atEnd = next >= state.totalFrames - 1;
            store.setState(atEnd ? { frame: 0, isPlaying: false } : { isPlaying: false });
            echoed.current = null;
            return;
          }
          if (next !== state.frame) {
            echoed.current = next;
            store.setState({ frame: next });
          }
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [store, fps]);

  // Transport: the store decides, the runtime follows.
  useEffect(() => {
    if (!ready) return;
    send(isPlaying ? { action: "play" } : { action: "pause" });
  }, [isPlaying, ready]);

  // Paused before a pending page confirmed it was playing: there is nothing
  // left to wait for, so stop it and show it as-is rather than sitting on
  // the old page until the fallback timer runs out.
  useEffect(() => {
    if (isPlaying) return;
    const from = pendingAwaitingPlay.current;
    if (from === null) return;
    post(frames.current.get(from), { action: "pause" });
    swapInRef.current(from);
  }, [isPlaying]);

  // Never leave a fallback swap timer running past the component's life.
  useEffect(() => {
    return () => {
      if (pendingSwapTimer.current) clearTimeout(pendingSwapTimer.current);
    };
  }, []);

  // Picking is always on, as it is in the React preview: hover outlines,
  // click asks.
  useEffect(() => {
    if (!ready) return;
    send({ action: "enable-pick-mode" });
  }, [ready]);

  // Playback resumed under an open bubble — its pinned outline no longer
  // matches what's on screen, so drop it.
  useEffect(() => {
    if (isPlaying) setDraft(null);
  }, [isPlaying]);

  useEffect(() => {
    if (draft) noteRef.current?.focus();
  }, [draft]);

  /**
   * Where the iframe's pixels land on the stage: the scaled box, centred.
   * Measured at pick time rather than derived, so it is right whatever the
   * container's rounding did.
   */
  function toStage(p: { x: number; y: number }): { x: number; y: number } {
    const stage = stageRef.current?.getBoundingClientRect();
    const box = liveFrame()?.getBoundingClientRect();
    if (!stage || !box) return p;
    return { x: box.left - stage.left + p.x * scale, y: box.top - stage.top + p.y * scale };
  }

  function openDraft(reported: PickedElement[], point: { x: number; y: number }) {
    const { width: w, height: h } = sizeRef.current;
    const hovered = hoveredRef.current;
    const under = (c: PickedElement) =>
      point.x >= c.boundingBox.x &&
      point.x <= c.boundingBox.x + c.boundingBox.width &&
      point.y >= c.boundingBox.y &&
      point.y <= c.boundingBox.y + c.boundingBox.height;
    const candidates = hovered && under(hovered) ? [hovered, ...reported] : reported;
    // Skip the full-frame elements — the composition root, a scene slot, a
    // background — for the same reason the React inspector does: the user
    // means the thing they clicked on, not the frame behind it.
    const picked = candidates.find(
      (c) => !(c.boundingBox.width >= w - 16 && c.boundingBox.height >= h - 16),
    );
    if (!picked) {
      setDraft(null);
      return;
    }
    store.getState().pause();

    const current = store.getState().frame;
    const list = scenesRef.current;
    const mapping = globalToLocal(list, current);
    const scene = mapping ? list[mapping.sceneIndex] : null;
    const text = (picked.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    const short = text.length > 24 ? `${text.slice(0, 24)}…` : text;
    const element: ElementContext = {
      id: crypto.randomUUID(),
      label: picked.id ? `#${picked.id}` : text ? `"${short}"` : `<${picked.tagName}>`,
      tag: picked.tagName,
      text,
      elementId: picked.id,
      sceneId: scene?.id ?? null,
      sceneName: scene?.name ?? "scene",
      timecode: framesToTimecode(current, fps),
    };

    const tl = toStage({ x: picked.boundingBox.x, y: picked.boundingBox.y });
    const box = {
      left: tl.x,
      top: tl.y,
      width: picked.boundingBox.width * scale,
      height: picked.boundingBox.height * scale,
    };
    const at = toStage(point);
    const stage = stageRef.current?.getBoundingClientRect();
    const sw = stage?.width ?? width;
    const sh = stage?.height ?? height;
    const left = Math.max(8, Math.min(at.x + 10, sw - BUBBLE_W - 8));
    const below = at.y + 14;
    const top = below + BUBBLE_H + 8 <= sh ? below : Math.max(8, at.y - BUBBLE_H - 14);

    setNote("");
    setDraft({ element, box, anchor: at, place: { left, top } });
  }

  // The message handler is bound once per page; it reaches the current
  // `openDraft` — and through it the current scale — by ref.
  const openDraftRef = useRef(openDraft);
  openDraftRef.current = openDraft;

  /** Enter in the bubble: attach the element as chat context, and send the note if there is one. */
  function commitDraft() {
    if (!draft) return;
    const key = draft.element.elementId
      ? `#${draft.element.elementId}`
      : `${draft.element.sceneId ?? ""}|${draft.element.tag}|${draft.element.text}`;
    const taken = new Set(
      editorStore.getState().selectedElements.map((c) =>
        c.elementId ? `#${c.elementId}` : `${c.sceneId ?? ""}|${c.tag}|${c.text}`,
      ),
    );
    if (!taken.has(key)) addElement(draft.element);
    const text = note.trim();
    if (text) requestPrompt(text);
    setDraft(null);
    setNote("");
  }

  // Position: a scrub, a hover, a jump — anything the store shows that the
  // runtime did not report itself. This includes a click on the timeline
  // while playing: `frame` tracks the store's `frame` during playback (see
  // `selectDisplayFrame`), and the runtime's own advance is echoed back into
  // it too — `echoed.current` is what tells those two apart, not `isPlaying`,
  // so a genuine jump during playback still reaches the runtime instead of
  // being swallowed by it.
  //
  // Coalesced to one seek per animation frame. A hover or a drag across a
  // zoomed-out timeline crosses many frames per pointermove, and each one
  // lands here as its own store update — pointermove fires far faster than
  // the runtime can settle a seek (it has real video/audio to decode), so
  // sending every intermediate frame queues seeks faster than they drain and
  // the preview lags behind wherever the pointer actually is. Only the
  // latest frame by the time a frame is due to be painted is still relevant.
  const pendingSeekFrame = useRef<number | null>(null);
  const seekRaf = useRef(0);
  useEffect(() => {
    if (!ready) return;
    if (echoed.current === frame) return;
    pendingSeekFrame.current = frame;
    if (seekRaf.current) return;
    seekRaf.current = requestAnimationFrame(() => {
      seekRaf.current = 0;
      const target = pendingSeekFrame.current;
      pendingSeekFrame.current = null;
      if (target === null) return;
      send({ action: "seek", timeSeconds: target / fps, seekMode: "commit" });
    });
  }, [frame, fps, ready]);

  useEffect(() => {
    return () => {
      if (seekRaf.current) cancelAnimationFrame(seekRaf.current);
    };
  }, []);

  // A hidden tab must not keep playing sound.
  useEffect(() => {
    if (!ready) return;
    send({ action: "set-muted", muted: !tabActive });
  }, [tabActive, ready]);

  // Scale-to-fit, exactly as the React player does.
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width: cw, height: ch } = entry.contentRect;
      setScale(Math.min(cw / width, ch / height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div
      ref={(el) => {
        containerRef.current = el;
        stageRef.current = el;
      }}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
    >
      <div
        style={{
          position: "relative",
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "center",
          flexShrink: 0,
          background: "#000",
          borderRadius: scale ? 12 / scale : 0,
          overflow: "hidden",
          visibility: scale === 0 ? "hidden" : "visible",
        }}
        onPointerLeave={() => {
          // The runtime's pick-mode outline only moves on mousemove inside
          // the iframe's own document — a cross-origin, separately rendered
          // realm that never gets a synthetic trailing mousemove (or its own
          // mouseleave) when the pointer exits fast. Left unhandled, the
          // outline is stranded on whatever was last under the cursor. The
          // host document, unlike the iframe's, reliably sees the pointer
          // leave this box, so a disable/enable round-trip is the cheapest
          // way to make the runtime drop it — `disablePickMode` clears the
          // highlighted node before `enablePickMode` re-arms hovering.
          if (!ready) return;
          hoveredRef.current = null;
          send({ action: "disable-pick-mode" });
          send({ action: "enable-pick-mode" });
        }}
      >
        {/* Sandboxed to scripts only: the composition is agent-authored, and
            an opaque origin keeps it out of this window even in a packaged
            build where the two would otherwise share one. Its own assets
            still load — the preview routes answer with CORS open. The pointer
            does reach it: that is how the runtime's pick mode sees hover and
            click, and the keyboard is taken back on every pick. */}
        {[live, pending].map(
          (page) =>
            page && (
              <iframe
                key={page.revision}
                ref={(el) => {
                  if (el) frames.current.set(page.revision, el);
                  else frames.current.delete(page.revision);
                }}
                title="Composition preview"
                src={previewUrlFor(dir, page.revision)}
                width={width}
                height={height}
                style={{
                  border: 0,
                  display: "block",
                  position: "absolute",
                  inset: 0,
                  // The loading page is present but unseen until it is
                  // ready; `opacity` rather than `visibility` so its runtime
                  // keeps a live clock and reports itself.
                  opacity: page === live ? 1 : 0,
                  pointerEvents: page === live ? "auto" : "none",
                }}
                sandbox="allow-scripts"
              />
            ),
        )}
      </div>

      {/* The Draw tool. No hit test here: the composition is a cross-origin
          iframe, so a mark carries its box and the picture, not what was
          under it — the agent finds that from the frame. */}
      {drawing && (
        <PreviewMarkup projectId={dir} width={width} height={height} fps={fps} scenes={scenes} />
      )}

      {/* The picked element, held under a solid outline, and the comment
          bubble anchored where the user clicked — the React preview's. */}
      {draft && (
        <>
          <div
            className="pointer-events-none absolute z-20 rounded-[3px]"
            style={{
              left: draft.box.left,
              top: draft.box.top,
              width: draft.box.width,
              height: draft.box.height,
              border: `1.5px solid ${HILITE}`,
              background: `${HILITE}1a`,
              boxShadow: `0 0 0 1px ${HILITE}55`,
            }}
          />
          <div
            className="pointer-events-none absolute z-40 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: draft.anchor.x,
              top: draft.anchor.y,
              background: HILITE,
              boxShadow: `0 0 0 3px ${HILITE}44`,
            }}
          />
          <form
            style={{ left: draft.place.left, top: draft.place.top, width: BUBBLE_W }}
            className="absolute z-40 flex cursor-auto select-text flex-col gap-1 rounded-xl border border-[#a855f7]/50 bg-surface/95 px-2.5 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-md"
            onSubmit={(e) => {
              e.preventDefault();
              commitDraft();
            }}
          >
            <span className="truncate text-[0.786rem]" style={{ color: "#cba3f5" }} title={draft.element.label}>
              {draft.element.label}
              <span className="text-[#a855f7]/70"> · {draft.element.timecode}</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                ref={noteRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation(); // don't let Escape clear the chat's pills
                  if (e.key === "Escape") setDraft(null);
                }}
                placeholder="Ask for a change…"
                className="min-w-0 flex-1 bg-transparent text-[0.929rem] text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <button
                type="submit"
                aria-label={note.trim() ? "Send" : "Add to chat context"}
                title={note.trim() ? "Send (⏎)" : "Add to chat context (⏎)"}
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cta text-background transition-colors hover:bg-cta-hover"
              >
                <SendGlyph />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
