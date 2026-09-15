"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePlaybackStore, usePlaybackStoreApi, selectDisplayFrame } from "@genmotion/player";
import { framesToTimecode, globalToLocal, type SceneData } from "@genmotion/shared";
import { API_URL } from "@/lib/api";
import { useEditorStore, useEditorStoreApi, type ElementContext } from "@/stores/editor-store";
import { useTabActive } from "../../../tabs/active-tab";

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

  const post = (target: HTMLIFrameElement | undefined, message: Record<string, unknown>) => {
    target?.contentWindow?.postMessage({ source: "hf-parent", type: "control", ...message }, "*");
  };
  const send = (message: Record<string, unknown>) => post(liveFrame(), message);

  // A compile landed. The first is the page; every later one loads behind it.
  useEffect(() => {
    const current = liveRef.current;
    if (!current) {
      setLive({ revision, ready: false });
      return;
    }
    if (current.revision === revision) return;
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
          // The next page is up: put it where the old one is, then swap.
          handshakeRef.current(frames.current.get(from));
          store.getState().setTotalFrames(total);
          echoed.current = null;
          hoveredRef.current = null;
          setPending(null);
          setLive({ revision: from, ready: true });
        }
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
  // runtime did not report itself.
  useEffect(() => {
    if (!ready || isPlaying) return;
    if (echoed.current === frame) return;
    send({ action: "seek", timeSeconds: frame / fps, seekMode: "commit" });
  }, [frame, fps, isPlaying, ready]);

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
