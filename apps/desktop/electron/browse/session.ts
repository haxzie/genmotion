import { BrowserWindow, session as electronSession, type NativeImage } from "electron";
import { toCdpCalls, type BrowseInput } from "./input";
import { PAGE_DESIGN, PAGE_TEXT, findTarget, isPresent } from "./scripts";
import { BrowseError, parseBrowseUrl } from "./url";

/**
 * The browser the agent looks at the web through.
 *
 * A real page, not fetched HTML: an offscreen `BrowserWindow` that loads the
 * site, runs its JavaScript, and can be photographed and clicked. That is the
 * difference that matters for making a video — a marketing site's hero is
 * usually three `<div>`s and a font, and `WebFetch` reads none of what it
 * looks like. It is also the only way a Codex turn can read a page at all:
 * that harness runs with `network_access=false`, so the page is loaded here,
 * in the main process, and handed over as text and pixels.
 *
 * Input goes through CDP (`webContents.debugger`), which Electron exposes on
 * every `webContents` — so a click is a real trusted mouse event at a real
 * coordinate and typing is a real text-input event, rather than a synthetic
 * `el.click()` that half the web ignores. Pixels come from `capturePage`,
 * the same call every export in this app already draws through.
 *
 * Containment, because this loads whatever the model asks for:
 *
 * - Its own non-persisted session partition. No cookie, token or cache of the
 *   user's app session is reachable from a page here, and nothing a page sets
 *   survives the app quitting.
 * - `sandbox: true`, no node integration, context isolation on.
 * - `http:`/`https:` only, every permission request denied, downloads
 *   cancelled, and `window.open` refused — a page cannot open a window the
 *   user never asked for, and cannot write a file by being visited.
 *
 * One window per open project, built on first use and closed when the project
 * closes or after `IDLE_MS` of nobody asking it anything.
 */

/**
 * One browsing profile for the whole app, kept on disk.
 *
 * `persist:` because the point of taking control of the page is to sign in to
 * something, and a sign-in that evaporates when the app quits is not worth
 * performing. Cookies, localStorage and service workers land in
 * `userData/Partitions/genmotion-browse` — Chromium's own store, under the
 * app's own data directory, which is also where the OS encrypts cookies at
 * rest on macOS. GenMotion never sees the password: the user types it into
 * the real site, and what persists is the site's own session cookie, exactly
 * as in any browser.
 *
 * One partition, not one per project, because a login is about the user and
 * the service, not about which video is open — signing in to GitHub once
 * should hold for every project. Windows are still per project; they share
 * this profile.
 */
const BROWSE_PARTITION = "persist:genmotion-browse";

/**
 * The viewport a page gets before anyone says otherwise.
 *
 * Normally nobody browses blind: the editor's Browser tab reports its own
 * panel size and the page is laid out at exactly that, so what is streamed
 * fills the panel with no letterboxing. This is the fallback for a page
 * opened by a tool while no tab is watching.
 */
export const DEFAULT_VIEWPORT = { width: 1280, height: 800 };

/** Bounds on the viewport, so a stray number can't ask for a 40000px window. */
const MIN_SIDE = 240;
const MAX_SIDE = 2000;

/**
 * How tall a full-page shot may get before it is cut off.
 *
 * Four viewports, capped. A landing page is routinely 14000px tall, and a
 * window that size both exhausts Chromium's tile memory (the capture comes
 * back with undrawn bands) and scales down to a 250px-wide sliver by the
 * time it fits a model's attention. Four screens is as much as one picture
 * can usefully say; past that the agent scrolls and shoots again.
 */
const MAX_FULL_PAGE_HEIGHT = 4000;
const MAX_FULL_PAGE_VIEWPORTS = 4;

/** How long a navigation gets before the page is reported as slow. */
const LOAD_TIMEOUT_MS = 30_000;

/** How long `wait_for` watches for something to appear. */
const WAIT_TIMEOUT_MS = 10_000;

/** Quiet period after load, for the fonts and hero animation to settle. */
const SETTLE_MS = 450;

/** An idle browser is closed rather than held open for the session. */
const IDLE_MS = 5 * 60_000;

/**
 * Frames per second sent to a watching editor tab.
 *
 * An offscreen window already paints on every damage, so the Browser tab is
 * only a subscriber to frames Chromium was producing anyway: watching costs
 * an encode rather than a second renderer.
 */
const WATCH_FPS = 10;

/**
 * And while the user is driving it themselves. Ten a second is fine for
 * watching someone else work and awful for typing, so the rate is raised for
 * a couple of seconds after any input and falls back on its own.
 */
const CONTROL_FPS = 30;
const CONTROL_MS = 2500;

/** A ceiling on the streamed frame, so a wide display cannot flood the pipe. */
const MAX_WATCH_WIDTH = 1600;
const WATCH_QUALITY = 62;




export interface Viewport {
  width: number;
  height: number;
}

/** One open page, as the tab strip draws it. */
export interface BrowseTab {
  id: string;
  url: string | null;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

/** What the editor's Browser tab shows above the picture. */
export interface BrowseState {
  open: boolean;
  url: string | null;
  title: string | null;
  width: number;
  height: number;
  /** The last page seen, which outlives the window the idle timer closed. */
  lastUrl: string | null;
  /** Whether there is a picture to show for it. */
  hasFrame: boolean;
  /** Every page open in this project's browser, in strip order. */
  tabs: BrowseTab[];
  activeId: string | null;
}

/**
 * How many pages one project's browser may hold.
 *
 * Each is a real renderer process, so this is a memory bound rather than a
 * taste one — six is more than any research trail needs and still well under
 * what an idle project should cost.
 */
const MAX_TABS = 6;

/** One page: its window, where it is, and whether CDP is attached to it. */
interface Page {
  id: string;
  window: BrowserWindow;
  url: string | null;
  attached: boolean;
}

let nextPageId = 1;

export interface PageText {
  title: string;
  url: string;
  text: string;
  truncated: boolean;
  scrollHeight: number;
  scrollY: number;
  viewportHeight: number;
}

export interface TargetHit {
  ok: true;
  x: number;
  y: number;
  rect: { x: number; y: number; width: number; height: number };
  tag: string;
  label: string;
  editable: boolean;
}

export interface TargetMiss {
  ok: false;
  offered: string[];
}

function clampSide(value: number | undefined, fallback: number): number {
  if (!value || !Number.isFinite(value)) return fallback;
  return Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.round(value)));
}

export class BrowseSession {
  /**
   * The open pages, and which one is in front.
   *
   * The tools and the picture always address the active page, which is why
   * `window`, `currentUrl` and `attached` below are accessors rather than
   * fields: everything written against a single window keeps working, and
   * switching tab is a one-line change of `activeId` plus a repaint.
   */
  private pages: Page[] = [];
  private activeId: string | null = null;

  private get active(): Page | null {
    const page = this.pages.find((candidate) => candidate.id === this.activeId) ?? null;
    return page && !page.window.isDestroyed() ? page : null;
  }

  private get window(): BrowserWindow | null {
    const page = this.active;
    return page && !page.window.isDestroyed() ? page.window : null;
  }

  /** The active page's `webContents`, which is what everything here drives. */
  private get contents(): Electron.WebContents | null {
    return this.window?.webContents ?? null;
  }

  private get attached(): boolean {
    return this.active?.attached ?? false;
  }

  private set attached(value: boolean) {
    const page = this.active;
    if (page) page.attached = value;
  }
  private viewport: Viewport = { ...DEFAULT_VIEWPORT };
  /**
   * True once a tool asked for a specific viewport.
   *
   * A tool that says `width: 390` means it: it wants the mobile layout, and
   * the panel must not quietly widen the page back out underneath it. The pin
   * lifts on the next navigation that does not ask for a size.
   */
  private pinned = false;
  /** Editor tabs watching this page, and the last frame sent to them. */
  private viewers = new Set<(frame: Buffer) => void>();
  private lastFrame: Buffer | null = null;
  private painting = false;
  private refreshing = false;
  private lastFrameAt = 0;
  /** While this is in the future, frames go out at `CONTROL_FPS`. */
  private controllingUntil = 0;
  /** Set while a full-page capture owns the window size. */
  private capturing = false;
  /** Pending post-resize captures, dropped if another resize lands first. */
  private resizeTimers: NodeJS.Timeout[] = [];
  private idleTimer: NodeJS.Timeout | null = null;
  /** Where the active page last went, for a tool call that expects one open. */
  private get currentUrl(): string | null {
    return this.active?.url ?? null;
  }

  private set currentUrl(value: string | null) {
    const page = this.active;
    if (page) page.url = value;
  }
  /** And where it went last of all, kept past the window's own life. */
  private lastUrl: string | null = null;
  private chain: Promise<unknown> = Promise.resolve();

  /**
   * One browsing call at a time.
   *
   * A harness is told to batch independent tool calls, and these are not
   * independent: they share one window. Two at once is a capture taken while
   * the other call is resizing for a full-page shot — a picture of neither
   * page. Queuing is both cheaper and more honest than locking.
   */
  serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.chain.then(work, work);
    this.chain = next.catch(() => undefined);
    return next;
  }

  /**
   * Live frames, for the editor's Browser tab. Returns an unsubscribe.
   *
   * Nothing is encoded unless somebody is watching: the `paint` listener is
   * attached on the first viewer and dropped with the last.
   */
  watch(onFrame: (frame: Buffer) => void): () => void {
    this.viewers.add(onFrame);
    this.bindPaint();
    if (this.lastFrame) onFrame(this.lastFrame);
    // `paint` only fires on damage, so a static page — or one opened before
    // anyone was watching — has nothing to send. Photograph it on demand.
    void this.refreshFrame();
    return () => {
      this.viewers.delete(onFrame);
      if (this.viewers.size === 0) this.unbindPaint();
    };
  }

  /** The most recent frame, if anything has been watching. */
  get frame(): Buffer | null {
    return this.lastFrame;
  }

  /** Photograph the page now and feed it to whoever is watching. */
  private async refreshFrame(): Promise<void> {
    if (this.viewers.size === 0 || this.refreshing) return;
    const window = this.window;
    if (!window || !this.currentUrl) return;
    this.refreshing = true;
    try {
      this.pushFrame(await window.webContents.capturePage());
    } catch {
      // The window went away mid-capture; the next event will catch up.
    } finally {
      this.refreshing = false;
    }
  }

  /** Encode one image for the watchers, and remember it as the latest. */
  private pushFrame(image: NativeImage): void {
    if (this.viewers.size === 0) return;
    const { width } = image.getSize();
    if (width === 0) return;
    // `capturePage` comes back at the display's pixel ratio; this is the one
    // scale step in the path, to one streamed pixel per CSS pixel.
    const target = Math.min(this.viewport.width, MAX_WATCH_WIDTH);
    const sized = width > target ? image.resize({ width: target, quality: "good" }) : image;
    const frame = sized.toJPEG(WATCH_QUALITY);
    this.lastFrame = frame;
    this.lastFrameAt = Date.now();
    for (const viewer of this.viewers) viewer(frame);
  }

  private onPaint = (_event: unknown, _dirty: unknown, image: NativeImage): void => {
    if (this.viewers.size === 0) return;
    const fps = Date.now() < this.controllingUntil ? CONTROL_FPS : WATCH_FPS;
    if (Date.now() - this.lastFrameAt < 1000 / fps) return;
    this.pushFrame(image);
  };

  private bindPaint(): void {
    if (this.painting || this.viewers.size === 0) return;
    const window = this.window;
    if (!window) return;
    window.webContents.on("paint", this.onPaint);
    this.painting = true;
  }

  private unbindPaint(): void {
    if (!this.painting) return;
    this.painting = false;
    const window = this.window;
    if (window) window.webContents.off("paint", this.onPaint);
  }

  /** The page's identity, for the tab's chrome. */
  get state(): BrowseState {
    const contents = this.contents;
    const live = this.open && contents !== null;
    return {
      open: Boolean(live),
      url: live ? this.currentUrl : null,
      title: live ? contents.getTitle() || null : null,
      width: this.viewport.width,
      height: this.viewport.height,
      lastUrl: this.lastUrl,
      hasFrame: true,
      tabs: this.tabs,
      activeId: this.activeId,
    };
  }

  get open(): boolean {
    return this.currentUrl !== null && this.window !== null;
  }

  /** What `browse_act` and `browse_capture` are acting on, for error text. */
  get url(): string | null {
    return this.open ? this.currentUrl : null;
  }

  private hardenPartition(): ReturnType<typeof electronSession.fromPartition> {
    const partition = electronSession.fromPartition(BROWSE_PARTITION);
    // Idempotent: setting a handler twice replaces it, and a session is
    // process-wide, so two projects browsing at once share this hardening.
    partition.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    partition.setPermissionCheckHandler(() => false);
    partition.on("will-download", (event) => event.preventDefault());
    return partition;
  }

  private ensureWindow(): BrowserWindow {
    const live = this.window;
    if (live) return live;
    return this.openPage().window;
  }

  /** A new page, made active. The strip's `+`, and the first page of all. */
  private openPage(): Page {
    this.hardenPartition();

    const window = new BrowserWindow({
      width: this.viewport.width,
      height: this.viewport.height,
      show: false,
      webPreferences: {
        // Offscreen rather than merely hidden, and this is the constraint the
        // whole design turns on: the tools have to lay a page out and
        // photograph it while the user is on another tab. A `WebContentsView`
        // laid over the editor would give native input, but it only lays out
        // and composites while it is attached and on screen — detached it
        // keeps its old size, resizing it does nothing, and capturing it
        // either hangs or segfaults (measured on Electron 40). An offscreen
        // window has none of those limits.
        offscreen: true,
        backgroundThrottling: false,
        partition: BROWSE_PARTITION,
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
    });
    window.setContentSize(this.viewport.width, this.viewport.height);

    const contents = window.webContents;
    // A popup would be a window nobody can see, which is how "Continue with
    // Google" dead-ends. Denying the window and taking the navigation in
    // place is what makes third-party sign-in work here, and still means a
    // page cannot conjure a window of its own.
    contents.setWindowOpenHandler(({ url: target }) => {
      if (/^https?:/i.test(target)) void this.goto(target).catch(() => {});
      return { action: "deny" };
    });
    contents.on("will-navigate", (event, candidate) => {
      if (!/^https?:/i.test(candidate)) event.preventDefault();
    });
    contents.setAudioMuted(true);

    // Drop the oldest rather than refuse: a browser that stops opening links
    // is more surprising than one that forgets the page you left behind.
    if (this.pages.length >= MAX_TABS) {
      const oldest = this.pages.shift();
      if (oldest) this.destroyPage(oldest);
    }

    const page: Page = { id: `p${nextPageId++}`, window, url: null, attached: false };
    this.pages.push(page);
    this.unbindPaint();
    this.activeId = page.id;
    this.bindPaint();
    return page;
  }

  /** The pages open here, newest last. */
  get tabs(): BrowseTab[] {
    return this.pages
      .filter((page) => !page.window.isDestroyed())
      .map((page) => ({
        id: page.id,
        url: page.url,
        title: page.window.webContents.getTitle() || "",
        loading: page.window.webContents.isLoading(),
        canGoBack: page.window.webContents.navigationHistory.canGoBack(),
        canGoForward: page.window.webContents.navigationHistory.canGoForward(),
      }));
  }

  /** Bring a page to the front: the picture and every tool follow it. */
  activate(id: string): void {
    const page = this.pages.find((candidate) => candidate.id === id);
    if (!page || page.window.isDestroyed() || this.activeId === id) return;
    this.touch();
    // The feed follows the active page: unbind from the old window before the
    // switch, bind to the new one after, and photograph it, because a static
    // page will not paint itself into the stream.
    this.unbindPaint();
    this.activeId = id;
    this.bindPaint();
    void this.refreshFrame();
  }

  /** Open a page, optionally at a URL, and make it active. */
  async newTab(url?: string): Promise<void> {
    this.touch();
    this.openPage();
    if (url && url.trim()) await this.goto(url);
    else void this.refreshFrame();
  }

  /** Close one page. The last one closing leaves the browser with none. */
  closeTab(id: string): void {
    const index = this.pages.findIndex((candidate) => candidate.id === id);
    if (index < 0) return;
    const [page] = this.pages.splice(index, 1);
    if (!page) return;
    const wasActive = this.activeId === page.id;
    if (wasActive) this.unbindPaint();
    this.destroyPage(page);
    if (wasActive) {
      // The neighbour to the left, as every browser does.
      this.activeId = this.pages[Math.max(0, index - 1)]?.id ?? null;
      this.bindPaint();
      void this.refreshFrame();
    }
  }

  /** Back, forward and reload, for the toolbar. */
  async history(action: "back" | "forward" | "reload"): Promise<void> {
    const window = this.requireOpen();
    const nav = window.webContents.navigationHistory;
    if (action === "back" && nav.canGoBack()) nav.goBack();
    else if (action === "forward" && nav.canGoForward()) nav.goForward();
    else if (action === "reload") window.webContents.reload();
    else return;
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    this.currentUrl = window.webContents.getURL() || this.currentUrl;
  }

  private async cdp(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const contents = this.ensureWindow().webContents;
    const debug = contents.debugger;
    if (!this.attached) {
      // `attach` throws if something else holds the debugger already (an
      // open devtools window on this page). Input is the only thing routed
      // through CDP, so the call that needs it fails with a sentence; reading
      // and photographing the page do not come through here and still work.
      try {
        if (!debug.isAttached()) debug.attach("1.3");
        this.attached = true;
      } catch (err) {
        throw new BrowseError(
          `Could not attach the debugger to the page: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return debug.sendCommand(method, params);
  }

  private touch(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      // Somebody is looking at it. Closing the page under an open Browser
      // tab is the one moment the idle timer must not fire.
      if (this.viewers.size > 0) {
        this.touch();
        return;
      }
      this.close();
    }, IDLE_MS);
    this.idleTimer.unref?.();
  }

  /**
   * The Browser tab's panel changed size, so the page should too.
   *
   * This is what removes the empty bands around the picture: the page is laid
   * out at the panel's own shape, so the frame fills it exactly rather than
   * being letterboxed inside it. It stands aside for a tool that pinned a
   * viewport or is mid-capture, both of which own the window size while they
   * last.
   */
  panelResized(width: number, height: number): void {
    if (this.pinned || this.capturing) return;
    const before = this.viewport;
    this.setViewport({ width, height });
    if (before.width === this.viewport.width && before.height === this.viewport.height) return;

    // Why not capture straight away: for about 30ms after `setContentSize`,
    // `capturePage` answers 0x0 — there is no surface at the new size yet —
    // and a resize fires exactly *one* paint event, which the frame-rate
    // throttle can swallow. Miss both and a static page sits at the old
    // shape forever.
    for (const timer of this.resizeTimers) clearTimeout(timer);
    this.resizeTimers = [120, 420].map((delay) => {
      const timer = setTimeout(() => void this.refreshFrame(), delay);
      timer.unref?.();
      return timer;
    });
  }

  /** Resize the viewport, which for an offscreen window is the window itself. */
  private setViewport(viewport: Partial<Viewport>): void {
    const next = {
      width: clampSide(viewport.width, this.viewport.width),
      height: clampSide(viewport.height, this.viewport.height),
    };
    if (next.width === this.viewport.width && next.height === this.viewport.height) return;
    this.viewport = next;
    const window = this.window;
    if (window && !window.isDestroyed()) window.setContentSize(next.width, next.height);
  }

  async goto(raw: string, viewport?: Partial<Viewport>): Promise<{ slow: boolean }> {
    const url = parseBrowseUrl(raw);
    this.touch();
    if (viewport && (viewport.width || viewport.height)) {
      this.setViewport(viewport);
      this.pinned = true;
    } else {
      this.pinned = false;
    }
    const contents = this.ensureWindow().webContents;

    // Held in an object because it is written from a listener: a plain `let`
    // narrows to `null` for the checker and the assignment below reads as dead.
    const outcome: { failure: string | null } = { failure: null };
    const onFail = (
      _event: unknown,
      code: number,
      description: string,
      failing: string,
      isMainFrame: boolean,
    ) => {
      // Sub-resources fail on half the web; only the document itself matters,
      // and -3 is ABORTED, which is what a redirect looks like from here.
      if (isMainFrame && code !== -3) outcome.failure = `${description} (${code}) loading ${failing}`;
    };
    contents.on("did-fail-load", onFail);

    let slow = false;
    try {
      await Promise.race([
        contents.loadURL(url.href),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            slow = true;
            resolve();
          }, LOAD_TIMEOUT_MS),
        ),
      ]);
    } catch (err) {
      // `loadURL` rejects on the same conditions `did-fail-load` reports; the
      // listener's message is the better one, so prefer it.
      outcome.failure ??= err instanceof Error ? err.message : String(err);
    } finally {
      contents.off("did-fail-load", onFail);
    }
    if (outcome.failure) throw new BrowseError(outcome.failure);

    this.currentUrl = contents.getURL() || url.href;
    this.lastUrl = this.currentUrl;
    await this.settle();
    // The new page is not going to paint itself if it is static.
    return { slow };
  }

  /** Let the page finish what loading started: fonts, hero animation, images. */
  private async settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    await this.evaluate<unknown>("document.fonts && document.fonts.ready ? document.fonts.ready.then(() => 1) : 1").catch(
      () => undefined,
    );
  }

  private requireOpen(): BrowserWindow {
    if (!this.open) {
      throw new BrowseError("No page is open — call browse_page with a URL first.");
    }
    this.touch();
    return this.ensureWindow();
  }

  async evaluate<T>(script: string): Promise<T> {
    const contents = this.ensureWindow().webContents;
    return (await contents.executeJavaScript(script, true)) as T;
  }

  /** The page's words, title and scroll position. */
  async read(): Promise<PageText> {
    this.requireOpen();
    return this.evaluate<PageText>(PAGE_TEXT);
  }

  /** Colours, type, logo files and nav, read from the live CSSOM. */
  async design(): Promise<unknown> {
    this.requireOpen();
    return this.evaluate<unknown>(PAGE_DESIGN);
  }

  async locate(target: string): Promise<TargetHit | TargetMiss> {
    this.requireOpen();
    const hit = await this.evaluate<TargetHit | TargetMiss>(findTarget(target));
    // Scrolling the target into view moved the page under the renderer; give
    // it a frame before anyone measures or photographs it.
    if (hit.ok) await new Promise((resolve) => setTimeout(resolve, 120));
    return hit;
  }

  async click(target: string): Promise<TargetHit | TargetMiss> {
    const hit = await this.locate(target);
    if (!hit.ok) return hit;
    const point = { x: Math.round(hit.x), y: Math.round(hit.y) };
    // A move first, so anything that only reveals itself on hover (a menu, a
    // tooltip the click is meant to land in) has happened by the press.
    await this.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", ...point, button: "none" });
    for (const type of ["mousePressed", "mouseReleased"]) {
      await this.cdp("Input.dispatchMouseEvent", {
        type,
        ...point,
        button: "left",
        buttons: type === "mousePressed" ? 1 : 0,
        clickCount: 1,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    this.currentUrl = this.contents?.getURL() || this.currentUrl;
    return hit;
  }

  /**
   * Type into whatever has focus, as text input rather than key-by-key.
   *
   * `Input.insertText` is one real text-input event, which is what a framework
   * listens for — character-by-character key events are slower and get eaten
   * by input masks. Keys that *mean* something (Enter, Tab) go through
   * `press`, where a key event is the point.
   */
  async type(value: string, into?: string): Promise<TargetHit | TargetMiss | null> {
    this.requireOpen();
    let hit: TargetHit | TargetMiss | null = null;
    if (into) {
      hit = await this.click(into);
      if (!hit.ok) return hit;
    }
    await this.cdp("Input.insertText", { text: value });
    return hit;
  }

  async press(key: string): Promise<void> {
    this.requireOpen();
    const spec = KEYS[key.toLowerCase()];
    if (!spec) {
      throw new BrowseError(`Can't press "${key}". Known keys: ${Object.keys(KEYS).join(", ")}.`);
    }
    for (const type of ["keyDown", "keyUp"] as const) {
      await this.cdp("Input.dispatchKeyEvent", {
        type,
        key: spec.key,
        code: spec.code,
        windowsVirtualKeyCode: spec.vk,
        nativeVirtualKeyCode: spec.vk,
        ...(spec.text && type === "keyDown" ? { text: spec.text } : {}),
      });
    }
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    this.currentUrl = this.contents?.getURL() || this.currentUrl;
  }

  /**
   * One input event from the user, who has taken control of the page.
   *
   * Deliberately outside `serial()`: that queue exists so two tool calls
   * cannot resize the window under each other, and a keystroke is neither.
   */
  async input(event: BrowseInput): Promise<void> {
    const window = this.requireOpen();
    this.controllingUntil = Date.now() + CONTROL_MS;
    for (const call of toCdpCalls(event, this.viewport)) {
      await this.cdp(call.method, call.params);
    }
    if (event.kind !== "move") {
      this.currentUrl = window.webContents.getURL() || this.currentUrl;
      void this.refreshFrame();
    }
  }

  /** Scroll by viewports, or to a named end of the page. */
  async scroll(by: number | "top" | "bottom"): Promise<void> {
    this.requireOpen();
    const script =
      by === "top"
        ? "window.scrollTo({ top: 0, behavior: 'instant' }), 1"
        : by === "bottom"
          ? "window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }), 1"
          : `window.scrollBy({ top: window.innerHeight * ${by}, behavior: 'instant' }), 1`;
    await this.evaluate<unknown>(script);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  /** Wait for a selector or a piece of text to turn up. Returns whether it did. */
  async waitFor(target: string): Promise<boolean> {
    this.requireOpen();
    const deadline = Date.now() + WAIT_TIMEOUT_MS;
    for (;;) {
      if (await this.evaluate<boolean>(isPresent(target)).catch(() => false)) return true;
      if (Date.now() > deadline) return false;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  /**
   * Photograph the page.
   *
   * A full-page shot grows the window to the document's height first, because
   * an offscreen window paints exactly its own size — there is no viewport to
   * capture beyond. It is put back afterwards so the next call still sees the
   * viewport it asked for.
   */
  async capture(options: { fullPage?: boolean; selector?: string } = {}): Promise<{
    image: NativeImage;
    clipped: string | null;
    /** CSS pixels of the page this shot covers. */
    height: number;
    /** And how tall the page is, when the shot does not reach the end of it. */
    pageHeight?: number;
  }> {
    const window = this.requireOpen();

    if (options.selector) {
      const hit = await this.locate(options.selector);
      if (!hit.ok) {
        throw new BrowseError(
          `Nothing on the page matches "${options.selector}".${hit.offered.length ? ` Things you could point at: ${hit.offered.slice(0, 8).join(", ")}.` : ""}`,
        );
      }
      const shot = await window.webContents.capturePage();
      const scale = shot.getSize().width / this.viewport.width || 1;
      const rect = {
        x: Math.max(0, Math.round(hit.rect.x * scale)),
        y: Math.max(0, Math.round(hit.rect.y * scale)),
        width: Math.round(hit.rect.width * scale),
        height: Math.round(hit.rect.height * scale),
      };
      if (rect.width < 2 || rect.height < 2) throw new BrowseError("That element has no size on screen.");
      return { image: shot.crop(rect), clipped: hit.label || options.selector, height: rect.height };
    }

    if (!options.fullPage) {
      return { image: await window.webContents.capturePage(), clipped: null, height: this.viewport.height };
    }

    const measured = await this.evaluate<number>(
      "Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)",
    ).catch(() => this.viewport.height);
    const pageHeight = Math.max(this.viewport.height, Math.round(measured));
    const height = Math.min(MAX_FULL_PAGE_HEIGHT, this.viewport.height * MAX_FULL_PAGE_VIEWPORTS, pageHeight);
    const was = this.viewport.height;
    this.capturing = true;
    try {
      window.setContentSize(this.viewport.width, height);
      // The resize is a relayout and a repaint: lazy images below the old fold
      // start loading here, and capturing immediately catches their holes.
      await new Promise((resolve) => setTimeout(resolve, 600));
      await this.evaluate<unknown>("window.scrollTo({ top: 0, behavior: 'instant' }), 1").catch(() => undefined);
      return { image: await window.webContents.capturePage(), clipped: null, height, pageHeight };
    } finally {
      this.capturing = false;
      if (!window.isDestroyed()) window.setContentSize(this.viewport.width, was);
    }
  }

  get size(): Viewport {
    return { ...this.viewport };
  }

  close(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    for (const timer of this.resizeTimers) clearTimeout(timer);
    this.resizeTimers = [];
    this.unbindPaint();
    const pages = this.pages;
    this.pages = [];
    this.activeId = null;
    for (const page of pages) this.destroyPage(page);
  }

  private destroyPage(page: Page): void {
    if (page.window.isDestroyed()) return;
    try {
      if (page.window.webContents.debugger.isAttached()) page.window.webContents.debugger.detach();
    } catch {
      // Detaching a debugger on a window that is going away anyway.
    }
    page.window.destroy();
  }
}

/** The keys worth pressing on a web page, by the name a model would use. */
const KEYS: Record<string, { key: string; code: string; vk: number; text?: string }> = {
  enter: { key: "Enter", code: "Enter", vk: 13, text: "\r" },
  return: { key: "Enter", code: "Enter", vk: 13, text: "\r" },
  tab: { key: "Tab", code: "Tab", vk: 9, text: "\t" },
  escape: { key: "Escape", code: "Escape", vk: 27 },
  esc: { key: "Escape", code: "Escape", vk: 27 },
  backspace: { key: "Backspace", code: "Backspace", vk: 8 },
  delete: { key: "Delete", code: "Delete", vk: 46 },
  arrowdown: { key: "ArrowDown", code: "ArrowDown", vk: 40 },
  arrowup: { key: "ArrowUp", code: "ArrowUp", vk: 38 },
  arrowleft: { key: "ArrowLeft", code: "ArrowLeft", vk: 37 },
  arrowright: { key: "ArrowRight", code: "ArrowRight", vk: 39 },
  pagedown: { key: "PageDown", code: "PageDown", vk: 34 },
  pageup: { key: "PageUp", code: "PageUp", vk: 33 },
  space: { key: " ", code: "Space", vk: 32, text: " " },
};

/**
 * One browser per open project, keyed by its folder.
 *
 * Per project rather than per app so that two tabs researching two different
 * products do not steer each other's page, and keyed by path rather than held
 * on `ProjectSession` so that nothing in the session's module graph has to
 * reach Electron's window APIs (see the note on `asset-writer.ts`).
 */
const SESSIONS = new Map<string, BrowseSession>();

export function browsingFor(projectDir: string): BrowseSession {
  const existing = SESSIONS.get(projectDir);
  if (existing) return existing;
  const created = new BrowseSession();
  SESSIONS.set(projectDir, created);
  return created;
}

/** Called when a project's tab closes: its browser goes with it. */
export function closeBrowsing(projectDir: string): void {
  SESSIONS.get(projectDir)?.close();
  SESSIONS.delete(projectDir);
}

/**
 * The sites the shared profile is signed in to, as far as it can be known.
 *
 * `httpOnly` is the filter: a cookie JavaScript is not allowed to read is
 * almost always the session one, where a cookie it can read is usually
 * analytics. It is a heuristic, which is why the UI says "saved sign-ins"
 * and shows the hosts rather than claiming an account.
 */
export async function savedSignIns(): Promise<string[]> {
  const partition = electronSession.fromPartition(BROWSE_PARTITION);
  const cookies = await partition.cookies.get({ httpOnly: true }).catch(() => []);
  const hosts = new Set<string>();
  for (const cookie of cookies) hosts.add(cookie.domain?.replace(/^\./, "") ?? "");
  hosts.delete("");
  return [...hosts].sort();
}

/**
 * Forget everything: every signed-in session, cookie and cached file.
 *
 * Closes the open windows first — a live page would write its session
 * straight back, and the whole point of the button is that afterwards the
 * profile is empty.
 */
export async function clearBrowsingProfile(): Promise<void> {
  for (const session of SESSIONS.values()) session.close();
  const partition = electronSession.fromPartition(BROWSE_PARTITION);
  await partition.clearStorageData();
  await partition.clearCache().catch(() => {});
}
