"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { API_URL, api } from "@/lib/api";
import { useEditorStore } from "@/stores/editor-store";
import { Button, cx } from "@/components/ui";

/**
 * The page the agent is looking at — and, when you take control, the page you
 * are driving yourself.
 *
 * The browser is an offscreen window in the main process (see
 * `electron/browse/session.ts`): it has to be offscreen, because the tools
 * must keep working while this tab is on Preview and nothing is painting to
 * screen. So this is a view onto it rather than the thing itself — an MJPEG
 * stream of the frames Chromium is already producing, which an `<img>`
 * renders natively, with input sent back the other way as CDP events.
 *
 * Why a mode rather than always-live input: while the agent is working, this
 * panel is something you read over its shoulder, and a stray scroll or a
 * click on a link would move the page out from under its next tool call.
 * Taking control is a deliberate act, which is also the honest framing for
 * the thing it is mostly for — signing in to a site on the agent's behalf.
 */
interface BrowseTab {
  id: string;
  url: string | null;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

interface BrowseState {
  open: boolean;
  url: string | null;
  title: string | null;
  width: number;
  height: number;
  lastUrl: string | null;
  hasFrame: boolean;
  tabs: BrowseTab[];
  activeId: string | null;
}

/** CDP's modifier bitmask, which is what the main process forwards. */
const MOD = { alt: 1, ctrl: 2, meta: 4, shift: 8 };

/** Mouse moves sent per second while driving. */
const MOVE_HZ = 20;

/**
 * How long the panel must hold still before the page is laid out again.
 *
 * A drag of the chat splitter fires a resize per frame, and each one is a
 * full relayout and repaint of a real web page in another process. Waiting
 * for the drag to finish turns sixty of those into one; the picture simply
 * scales in the meantime, which is what a browser window does anyway.
 */
const RESIZE_SETTLE_MS = 140;

/**
 * Sizes are snapped to this, so a one-pixel wobble — a scrollbar appearing,
 * a sub-pixel layout — cannot cost a relayout.
 */
const SIZE_STEP = 8;

function BrowserGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
      <path d="M2.5 9h19" />
      <circle cx="6" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8.8" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** `https://stripe.com/pricing` → host in full strength, path dimmed. */
function Address({ url }: { url: string }) {
  const parts = useMemo(() => {
    try {
      const parsed = new URL(url);
      return { host: parsed.host, rest: `${parsed.pathname === "/" ? "" : parsed.pathname}${parsed.search}` };
    } catch {
      return { host: url, rest: "" };
    }
  }, [url]);
  return (
    <span className="truncate font-mono text-[0.786rem]">
      <span className="text-text-primary">{parts.host}</span>
      <span className="text-text-tertiary">{parts.rest}</span>
    </span>
  );
}

/**
 * Whether a page is open, and which.
 *
 * Polled rather than streamed: it is three short strings, and a navigation
 * the tab must not miss is already visible in the picture. One key and one
 * interval, because the tab strip watches it too — that is what puts the
 * live dot on the Browser pill while you are on Preview.
 */
export function useBrowseState(projectId: string) {
  return useQuery({
    queryKey: ["browse-state", projectId],
    queryFn: () => api<BrowseState>(`/api/browse?projectId=${encodeURIComponent(projectId)}`),
    refetchInterval: 1500,
  });
}

/**
 * Where the pointer is on the page, as a fraction of the viewport.
 *
 * The picture is letterboxed by `object-contain` at whatever size the panel
 * happens to be, so the drawn rectangle has to be worked out from the frame's
 * own dimensions — and it is worked out here rather than in the main process,
 * which has no idea how wide the panel is.
 */
function normalize(img: HTMLImageElement, clientX: number, clientY: number) {
  const rect = img.getBoundingClientRect();
  const nw = img.naturalWidth || rect.width || 1;
  const nh = img.naturalHeight || rect.height || 1;
  const scale = Math.min(rect.width / nw, rect.height / nh);
  const drawnW = nw * scale;
  const drawnH = nh * scale;
  const left = rect.left + (rect.width - drawnW) / 2;
  const top = rect.top + (rect.height - drawnH) / 2;
  return { x: (clientX - left) / drawnW, y: (clientY - top) / drawnH };
}

/** Back, forward, reload — drawn the way every browser draws them. */
function NavGlyph({ kind, className }: { kind: "back" | "forward" | "reload"; className?: string }) {
  if (kind === "reload") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.5 8a5.5 5.5 0 1 1-1.7-3.97" />
        <path d="M13.6 2.6v3.2h-3.2" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={kind === "back" ? "M10 3.2 5 8l5 4.8" : "M6 3.2 11 8l-5 4.8"} />
    </svg>
  );
}

/** The little globe a tab wears before anything is loaded in it. */
function TabFavicon({ loading }: { loading: boolean }) {
  if (loading) {
    return <span className="size-3 shrink-0 animate-spin rounded-full border border-text-tertiary border-t-transparent" />;
  }
  return (
    <svg className="size-3 shrink-0 text-text-tertiary" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6.2" />
      <path d="M1.9 8h12.2M8 1.8c1.7 1.9 2.6 4 2.6 6.2S9.7 12.3 8 14.2C6.3 12.3 5.4 10.2 5.4 8S6.3 3.7 8 1.8Z" />
    </svg>
  );
}

/** What a tab is called: the page's title, else its host, else "New tab". */
function tabLabel(tab: BrowseTab): string {
  if (tab.title) return tab.title;
  if (tab.url) {
    try {
      return new URL(tab.url).host;
    } catch {
      return tab.url;
    }
  }
  return "New tab";
}

/**
 * The tab strip.
 *
 * Chrome's shape, in the app's palette: the active tab is a raised surface
 * continuous with the toolbar beneath it, the rest sit back. Tabs belong to
 * the project's browser, not to the editor — closing the last one leaves an
 * empty browser, the same as closing the last tab in a window.
 */
function TabStrip({
  tabs,
  activeId,
  onActivate,
  onClose,
  onNew,
  full,
}: {
  tabs: BrowseTab[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  full: boolean;
}) {
  return (
    <div className="flex h-9 shrink-0 items-end gap-0.5 overflow-x-auto px-2 pt-1.5">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={active}
            tabIndex={0}
            onClick={() => onActivate(tab.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onActivate(tab.id);
            }}
            className={cx(
              "group flex h-[30px] min-w-0 max-w-[220px] flex-1 cursor-default items-center gap-1.5 rounded-t-lg px-2.5 text-[0.786rem] transition-colors",
              active
                ? "bg-surface-raised text-text-primary"
                : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
            )}
            title={tab.url ?? "New tab"}
          >
            <TabFavicon loading={tab.loading} />
            <span className="min-w-0 flex-1 truncate">{tabLabel(tab)}</span>
            <button
              type="button"
              aria-label="Close tab"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              className={cx(
                "-mr-1 grid size-4 shrink-0 place-items-center rounded text-text-tertiary opacity-0 transition hover:bg-white/10 hover:text-text-primary group-hover:opacity-100",
                active && "opacity-70",
              )}
            >
              <svg viewBox="0 0 16 16" className="size-2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        );
      })}
      <button
        type="button"
        aria-label="New tab"
        onClick={onNew}
        disabled={!full}
        className="mb-0.5 ml-0.5 grid size-6 shrink-0 place-items-center rounded-md text-text-tertiary hover:bg-white/[0.06] hover:text-text-primary disabled:opacity-30"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
      </button>
    </div>
  );
}

export function BrowserView({ projectId }: { projectId: string }) {
  const { data, isPending } = useBrowseState(projectId);
  const client = useQueryClient();
  // Shared, because `request_takeover`'s card in the chat turns it on.
  const control = useEditorStore((state) => state.browserControl);
  const setControl = useEditorStore((state) => state.setBrowserControl);
  const [profileOpen, setProfileOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const lastMove = useRef(0);

  const base = `?projectId=${encodeURIComponent(projectId)}`;
  const streamUrl = `${API_URL}/api/browse/stream${base}`;
  const frameUrl = `${API_URL}/api/browse/frame${base}`;

  /** Fire and forget: an input event the page never saw is not worth a dialog. */
  const send = useCallback(
    (event: Record<string, unknown>) => {
      void fetch(`${API_URL}/api/browse/input${base}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
      }).catch(() => {});
    },
    [base],
  );

  const point = (e: PointerEvent<HTMLElement>) => {
    const img = imgRef.current;
    return img ? normalize(img, e.clientX, e.clientY) : { x: 0, y: 0 };
  };
  const mods = (e: { altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) =>
    (e.altKey ? MOD.alt : 0) | (e.ctrlKey ? MOD.ctrl : 0) | (e.metaKey ? MOD.meta : 0) | (e.shiftKey ? MOD.shift : 0);

  // While you are driving the page, the keyboard belongs to the page.
  //
  // A capture listener on `window`, not React's `onKeyDown`, because the
  // editor's own shortcuts live on `window` too and only stand aside for an
  // INPUT or a TEXTAREA. This surface is a div, so Space was toggling
  // playback, the arrows were seeking the timeline, and Delete was deleting
  // the selected scenes. Capturing first and calling `stopImmediatePropagation`
  // is what makes typing here mean typing here.
  useEffect(() => {
    if (!control) return;
    const owned = (target: EventTarget | null) =>
      target instanceof Node && surfaceRef.current?.contains(target);
    const onKey = (e: KeyboardEvent) => {
      if (!owned(e.target)) return;
      // Command chords stay with the app: ⌘Q, ⌘W, and ⌘V, whose paste event
      // is how a password manager fills a field in here.
      if (e.metaKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      send({
        kind: "key",
        action: e.type === "keyup" ? "up" : "down",
        key: e.key,
        code: e.code,
        modifiers:
          (e.altKey ? MOD.alt : 0) |
          (e.ctrlKey ? MOD.ctrl : 0) |
          (e.metaKey ? MOD.meta : 0) |
          (e.shiftKey ? MOD.shift : 0),
      });
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
    };
  }, [control, send]);

  // Scrolling works whether or not you have taken control: it is the one
  // input that only moves the viewport, so there is no reason to make
  // somebody claim the page before they can read the rest of it.
  //
  // A native non-passive listener because React's synthetic one cannot
  // `preventDefault`, so the editor's own panel would scroll instead.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    // Momentum scrolling fires upwards of sixty events a second, and one HTTP
    // post each would be both wasteful and jerky. They are summed and flushed
    // on a frame instead.
    let pendingX = 0;
    let pendingY = 0;
    let at = { x: 0.5, y: 0.5 };
    let frame = 0;
    const flush = () => {
      frame = 0;
      const deltaX = pendingX;
      const deltaY = pendingY;
      pendingX = 0;
      pendingY = 0;
      if (deltaX || deltaY) send({ kind: "wheel", ...at, deltaX, deltaY });
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const img = imgRef.current;
      if (img) at = normalize(img, e.clientX, e.clientY);
      pendingX += e.deltaX;
      pendingY += e.deltaY;
      if (!frame) frame = requestAnimationFrame(flush);
    };
    surface.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      surface.removeEventListener("wheel", onWheel);
    };
  }, [send]);

  // Lay the page out at the size it is drawn at, so the frame fills the panel
  // instead of being letterboxed inside it.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = "";
    const snap = (value: number) => Math.max(SIZE_STEP, Math.round(value / SIZE_STEP) * SIZE_STEP);
    const report = () => {
      const { width, height } = surface.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      const size = { width: snap(width), height: snap(height) };
      const key = `${size.width}x${size.height}`;
      if (key === last) return;
      last = key;
      void fetch(`${API_URL}/api/browse/viewport${base}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(size),
      }).catch(() => {});
    };
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(report, RESIZE_SETTLE_MS);
    });
    observer.observe(surface);
    report();
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [base]);

  const refresh = () => client.invalidateQueries({ queryKey: ["browse-state", projectId] });
  const post = <T,>(path: string, json?: unknown, method?: string) =>
    api<T>(`/api/browse/${path}${path.includes("?") ? "&" : base}`, { ...(json ? { json } : {}), ...(method ? { method } : {}) });

  const navigate = useMutation({
    mutationFn: (url: string) => post<{ ok: boolean; error?: string }>("navigate", { url }),
    onSuccess: refresh,
  });
  const newTab = useMutation({ mutationFn: () => post<unknown>("tabs", {}), onSuccess: refresh });
  const closeTab = useMutation({
    mutationFn: (id: string) => post<unknown>(`tabs/${encodeURIComponent(id)}`, undefined, "DELETE"),
    onSuccess: refresh,
  });
  const activateTab = useMutation({
    mutationFn: (id: string) => post<unknown>(`tabs/${encodeURIComponent(id)}/activate`, {}),
    onSuccess: refresh,
  });
  const history = useMutation({
    mutationFn: (action: "back" | "forward" | "reload") => post<unknown>("history", { action }),
    onSuccess: refresh,
  });

  if (isPending && !data) return <div className="min-h-0 flex-1" />;

  const tabs = data?.tabs ?? [];
  const activeTab = tabs.find((tab) => tab.id === data?.activeId) ?? null;
  const shown = data?.url ?? activeTab?.url ?? data?.lastUrl ?? "";
  const blankTab = Boolean(activeTab && !activeTab.url);
  const stale = !data?.open && tabs.length === 0;

  const toolbar = (
    <div className="flex h-10 shrink-0 items-center gap-1.5 bg-surface-raised px-2">
      <NavButton label="Back" kind="back" disabled={!activeTab?.canGoBack || history.isPending} onClick={() => history.mutate("back")} />
      <NavButton label="Forward" kind="forward" disabled={!activeTab?.canGoForward || history.isPending} onClick={() => history.mutate("forward")} />
      <NavButton label="Reload" kind="reload" disabled={!data?.open || history.isPending} onClick={() => history.mutate("reload")} />
      <Omnibox current={shown} busy={navigate.isPending || Boolean(activeTab?.loading)} onGo={(url) => navigate.mutate(url)} />
      {data?.open && !control && (
        <span className="flex shrink-0 items-center gap-1.5 px-1 text-[0.786rem] text-text-tertiary">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-success" />
          </span>
          {data.width}×{data.height}
        </span>
      )}
      <Button size="sm" variant={control ? "primary" : "secondary"} onClick={() => setControl(!control)}>
        {control ? "Done" : "Take control"}
      </Button>
      <button
        type="button"
        onClick={() => setProfileOpen((open) => !open)}
        aria-label="Browsing profile"
        className={cx(
          "grid size-7 shrink-0 place-items-center rounded-full border text-[0.714rem] font-semibold",
          profileOpen
            ? "border-accent/60 bg-accent-muted text-text-primary"
            : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
        )}
        title="Browsing profile — shared by every project"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="5.6" r="2.6" />
          <path d="M2.8 13.6c.6-2.6 2.6-4 5.2-4s4.6 1.4 5.2 4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );

  const body = () => {
    if (blankTab || (!data?.open && !data?.hasFrame)) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <BrowserGlyph className="size-8 text-text-tertiary" />
          <p className="text-[0.929rem] text-text-secondary">{tabs.length ? "New tab" : "No page open"}</p>
          <p className="max-w-sm text-[0.857rem] text-text-tertiary">
            {tabs.length
              ? "Type an address above to go somewhere."
              : "Ask for a video about a real product and the agent opens its site here."}{" "}
            <b className="font-medium text-text-secondary">Take control</b> to drive it yourself, which is how you sign
            in to a service the agent should be able to use.
          </p>
        </div>
      );
    }
    return (
      <>
        {data?.hasFrame && (
          <img
            src={`${frameUrl}&at=${encodeURIComponent(`${data.activeId ?? ""}:${data.url ?? ""}`)}`}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        <img
          ref={imgRef}
          key={data?.activeId ?? "none"}
          src={streamUrl}
          alt={data?.title ?? "The page the agent is looking at"}
          className={cx("relative h-full w-full object-contain", stale && "opacity-55", control && "cursor-default")}
          draggable={false}
        />
      </>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border bg-surface-raised/60">
        <TabStrip
          tabs={tabs}
          activeId={data?.activeId ?? null}
          onActivate={(id) => activateTab.mutate(id)}
          onClose={(id) => closeTab.mutate(id)}
          onNew={() => newTab.mutate()}
          full={tabs.length < 6}
        />
        {toolbar}
        {control && (
          <p className="border-t border-accent/25 bg-accent-muted/40 px-3 py-1 text-center text-[0.786rem] text-text-secondary">
            You are driving this page — clicks, typing and keys go to it. A sign-in here is remembered for every
            project.
          </p>
        )}
      </div>
      {profileOpen && <ProfilePanel onDone={() => setProfileOpen(false)} />}
      <div className="relative min-h-0 flex-1 overflow-hidden p-4">
        <div
          ref={surfaceRef}
          tabIndex={control ? 0 : -1}
          role={control ? "application" : undefined}
          aria-label={control ? "The page — your keyboard and mouse go to it" : undefined}
          onPointerDown={
            control
              ? (e) => {
                  surfaceRef.current?.focus();
                  const at = point(e);
                  send({ kind: "move", ...at });
                  send({ kind: "down", ...at, clickCount: e.detail || 1, modifiers: mods(e) });
                }
              : undefined
          }
          onPointerUp={
            control ? (e) => send({ kind: "up", ...point(e), clickCount: e.detail || 1, modifiers: mods(e) }) : undefined
          }
          onPointerMove={
            control
              ? (e) => {
                  const now = performance.now();
                  if (now - lastMove.current < 1000 / MOVE_HZ) return;
                  lastMove.current = now;
                  send({ kind: "move", ...point(e), buttons: e.buttons });
                }
              : undefined
          }
          onPaste={
            control
              ? (e: ClipboardEvent<HTMLDivElement>) => {
                  const text = e.clipboardData.getData("text/plain");
                  if (!text) return;
                  e.preventDefault();
                  // Pasting is how a password manager fills a login here, so
                  // it goes in as one text event rather than as keystrokes.
                  send({ kind: "text", text });
                }
              : undefined
          }
          className={cx(
            "gm-dot-canvas relative flex h-full items-start justify-center overflow-hidden rounded-xl border outline-none",
            control ? "border-accent/70 ring-1 ring-accent/30" : "border-border",
          )}
        >
          {body()}
        </div>
      </div>
    </div>
  );
}

/** One round toolbar button. */
function NavButton({
  label,
  kind,
  disabled,
  onClick,
}: {
  label: string;
  kind: "back" | "forward" | "reload";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 shrink-0 place-items-center rounded-full text-text-secondary transition-colors hover:bg-white/[0.07] hover:text-text-primary disabled:pointer-events-none disabled:opacity-30"
    >
      <NavGlyph kind={kind} className="size-4" />
    </button>
  );
}

/**
 * The URL bar.
 *
 * A pill, like every browser's, and it behaves like one: it shows where you
 * are until you start typing, selects everything on focus so a new address
 * replaces the old, and takes a bare host (`github.com/login`) because that
 * is what people type. Escape puts the real URL back.
 */
function Omnibox({
  current,
  busy,
  onGo,
}: {
  current: string;
  busy: boolean;
  onGo: (url: string) => void;
}) {
  const [value, setValue] = useState(current);
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    if (!edited) setValue(current);
  }, [current, edited]);
  return (
    <form
      className="min-w-0 flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onGo(value.trim());
        setEdited(false);
      }}
    >
      <div
        className={cx(
          "flex h-7 items-center gap-1.5 rounded-full border border-transparent bg-surface px-3 transition-colors focus-within:border-accent/60",
          busy && "opacity-70",
        )}
      >
        <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-text-tertiary" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3.4" y="7" width="9.2" height="6.2" rx="1.6" />
          <path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7" />
        </svg>
        <input
          value={value}
          onChange={(e) => {
            setEdited(true);
            setValue(e.target.value);
          }}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEdited(false);
              setValue(current);
              e.currentTarget.blur();
            }
            // The page must not see the address bar's keystrokes.
            e.stopPropagation();
          }}
          placeholder="Search or enter address"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent font-mono text-[0.786rem] text-text-primary outline-none placeholder:text-text-tertiary"
        />
      </div>
    </form>
  );
}

/**
 * The shared profile: which sites it is signed in to, and the way to forget
 * them.
 *
 * One profile for the whole app, so this says so plainly — a sign-in
 * performed in one project's tab is a sign-in every project has.
 */
function ProfilePanel({ onDone }: { onDone: () => void }) {
  const client = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const { data } = useQuery({
    queryKey: ["browse-profile"],
    queryFn: () => api<{ signedIn: string[] }>("/api/browse/profile"),
  });
  const clear = useMutation({
    mutationFn: () => api<{ ok: boolean }>("/api/browse/profile", { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["browse-profile"] });
      setConfirming(false);
      onDone();
    },
  });
  const hosts = data?.signedIn ?? [];
  return (
    <div className="shrink-0 border-b border-border bg-surface-hover/40 px-3 py-2.5 text-[0.857rem]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-text-secondary">
            One browsing profile, shared by every project. GenMotion never sees a password — you sign in to the real
            site and its session cookie is kept, as in any browser.
          </p>
          <p className="mt-1.5 truncate font-mono text-[0.786rem] text-text-tertiary">
            {hosts.length ? `Sites with a saved session: ${hosts.join(", ")}` : "Nothing saved yet."}
          </p>
        </div>
        <Button
          size="sm"
          variant={confirming ? "danger" : "secondary"}
          disabled={clear.isPending}
          onClick={() => (confirming ? clear.mutate() : setConfirming(true))}
        >
          {confirming ? "Really forget everything?" : "Clear browsing data"}
        </Button>
      </div>
    </div>
  );
}
