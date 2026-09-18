import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { API_URL } from "@/lib/api";
import { cx } from "@/components/ui";
import { api } from "../api";
import { HOME_TAB, useTabsStore, type ProjectTab } from "./tabs-store";
import { ExportsButton } from "./exports-panel";

const isMac = navigator.platform.startsWith("Mac");

/**
 * Whether the window is in macOS full screen — where the traffic lights are
 * hidden and the strip has no reason to leave their corner empty.
 */
function useFullScreen(): boolean {
  const [fullScreen, setFullScreen] = useState(false);
  useEffect(() => {
    if (!isMac) return;
    void api.fullScreen().then(setFullScreen);
    return api.onFullScreen(setFullScreen);
  }, []);
  return fullScreen;
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/** The activity mark: a spinner mid-turn, a dot for a finished turn nobody has seen. */
function Activity({ tab }: { tab: ProjectTab }) {
  if (tab.busy) {
    return (
      <span
        aria-label="Agent working"
        className="size-2.5 shrink-0 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent"
      />
    );
  }
  if (tab.unread) {
    return <span aria-label="Finished" className="size-1.5 shrink-0 rounded-full bg-accent" />;
  }
  return null;
}

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4" />
    </svg>
  );
}

/**
 * The project's card image, small, or a film glyph until there is one.
 *
 * Fetched from the local server rather than carried in the tab store — the
 * picture is the heaviest thing about a project and the tab re-renders on
 * every activity tick. Re-requested when a turn ends, since that is when
 * the picture is most likely to have changed.
 */
function TabThumb({ tab }: { tab: ProjectTab }) {
  const [version, setVersion] = useState(0);
  const [missing, setMissing] = useState(false);
  const retries = useRef(0);
  const wasBusy = useRef(tab.busy);
  useEffect(() => {
    if (wasBusy.current && !tab.busy) {
      setVersion((v) => v + 1);
      setMissing(false);
    }
    wasBusy.current = tab.busy;
  }, [tab.busy]);
  // A project opened for the first time has no picture yet; one is captured
  // a few seconds after it opens. Look again, a few times, then give up.
  useEffect(() => {
    if (!missing || retries.current >= 3) return;
    const t = setTimeout(() => {
      retries.current += 1;
      setVersion((v) => v + 1);
      setMissing(false);
    }, 5000);
    return () => clearTimeout(t);
  }, [missing]);

  return (
    <span className="flex h-4 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-white/[0.08] text-text-tertiary">
      {missing ? (
        <FilmIcon className="size-3" />
      ) : (
        <img
          src={`${API_URL}/api/projects/${tab.dir}/thumbnail?v=${version}`}
          alt=""
          draggable={false}
          onError={() => setMissing(true)}
          className="size-full object-cover"
        />
      )}
    </span>
  );
}

function TabButton({
  active,
  onSelect,
  onClose,
  label,
  children,
  className,
}: {
  active: boolean;
  onSelect: () => void;
  onClose?: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tab"
      aria-selected={active}
      aria-label={label}
      className={cx(
        "group relative flex h-7 max-w-56 shrink-0 items-center gap-2 rounded-lg pl-2 text-[0.857rem]",
        "transition-colors duration-150",
        onClose ? "pr-1" : "pr-2",
        // The active tab is a rounded card one step up from the strip, the
        // app's raised surface — the same material as the chat's input box,
        // lifted enough to read against black, with no outline. Inactive
        // tabs only pick up a tint on hover.
        active
          ? "bg-surface-raised text-text-primary"
          : "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary",
        className,
      )}
    >
      {/* The tab's face is a button so the drag strip lets clicks through (see
          `.titlebar-drag button` in styles.css). Middle-click closes, as
          browsers do. */}
      <button
        type="button"
        onClick={onSelect}
        onAuxClick={(e) => {
          if (e.button === 1) onClose?.();
        }}
        title={label}
        className="flex min-w-0 items-center gap-2 outline-none"
      >
        {children}
      </button>
      {onClose && (
        <button
          type="button"
          aria-label={`Close ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cx(
            "flex size-5 shrink-0 items-center justify-center rounded text-text-tertiary",
            "opacity-0 transition-opacity hover:bg-surface-hover hover:text-text-primary",
            "group-hover:opacity-100 focus-visible:opacity-100",
            active && "opacity-100",
          )}
        >
          <CloseIcon className="size-3" />
        </button>
      )}
    </div>
  );
}

/**
 * The window's top row: Home, one tab per open project, and the export queue.
 *
 * It owns the frameless window's drag strip for every screen — `.titlebar-drag`
 * makes the row draggable and its buttons clickable — and on macOS leaves room
 * for the traffic lights, which sit over the top-left corner.
 */
export function TabStrip({
  onActivate,
  onClose,
  onOpenProject,
  onShowAllExports,
}: {
  onActivate: (id: string) => void;
  onClose: (dir: string) => void;
  /** From the exports panel — the project may not have a tab yet. */
  onOpenProject: (dir: string) => void;
  /** The panel's "Show all": the Exports page on the Home tab. */
  onShowAllExports: () => void;
}) {
  const tabs = useTabsStore((s) => s.tabs);
  const activeId = useTabsStore((s) => s.activeId);
  const reduceMotion = useReducedMotion();
  const fullScreen = useFullScreen();

  return (
    // The frame: a step darker than the page, with the tabs sitting in its
    // middle as rounded cards, the active one lit.
    <div
      role="tablist"
      className={cx(
        "titlebar-drag flex h-10 shrink-0 items-center bg-black pr-2",
        isMac && !fullScreen ? "pl-[78px]" : "pl-2",
      )}
    >
      <div className="px-1.5">
        <TabButton
          active={activeId === HOME_TAB}
          onSelect={() => onActivate(HOME_TAB)}
          label="Home"
        >
          <HomeIcon className="size-4" />
        </TabButton>
      </div>

      {/* Scrolls sideways when the row overflows; the export button stays put. */}
      <div className="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* A tab grows in from nothing and shrinks away when closed, with
            its neighbours sliding to fill the gap — so opening a project
            reads as a tab arriving, and closing one as the row closing
            up, rather than the strip re-laying itself out in one frame.
            The gap lives on each wrapper rather than the row, so it
            collapses with the tab instead of leaving a stray space. */}
        <AnimatePresence initial={false}>
          {tabs.map((tab) => (
            <motion.div
              key={tab.dir}
              layout
              initial={reduceMotion ? false : { width: 0, opacity: 0, scale: 0.92 }}
              animate={{ width: "auto", opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { width: 0, opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex shrink-0 items-center overflow-hidden pr-1"
            >
              {/* A short rule before every tab — between Home and the first,
                  and between neighbours — the way a browser separates its
                  tabs, 6px from each. Inside the wrapper so it collapses
                  with the tab. */}
              <div className="mr-1 h-4 w-px shrink-0 bg-border" />
              <TabButton
                active={activeId === tab.dir}
                onSelect={() => onActivate(tab.dir)}
                onClose={() => onClose(tab.dir)}
                label={tab.name}
              >
                <TabThumb tab={tab} />
                <Activity tab={tab} />
                <span className={cx("truncate", tab.project === null && "italic text-text-tertiary")}>
                  {tab.name}
                </span>
              </TabButton>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div>
        <ExportsButton onOpenProject={onOpenProject} onShowAll={onShowAllExports} />
      </div>
    </div>
  );
}
