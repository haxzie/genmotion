import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cx } from "@/components/ui";
import { HOME_TAB, useTabsStore, type ProjectTab } from "./tabs-store";
import { ExportsButton } from "./exports-panel";

const isMac = navigator.platform.startsWith("Mac");

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

/**
 * The outward curve where a tab meets the content, one per side — the
 * Chrome shape. A square hanging off the tab's bottom corner, filled with the
 * content colour except for a quarter circle cut out of its top corner, so
 * the tab's edge appears to flare into the pane below it.
 */
function TabFlare({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className={cx("pointer-events-none absolute bottom-0 size-1.5", side === "left" ? "-left-1.5" : "-right-1.5")}
      style={{
        background: `radial-gradient(circle at ${side === "left" ? "0 0" : "100% 0"}, transparent 6px, var(--color-background) 6.5px)`,
      }}
    />
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
        // Nearly the strip's full height, so the label sits at its centre
        // rather than in the lower two thirds; the 4px left over is the
        // frame showing above the tab.
        "group relative flex h-9 max-w-52 shrink-0 items-center gap-1.5 rounded-t-lg pl-2.5 text-[0.857rem]",
        "transition-colors duration-150",
        onClose ? "pr-1" : "pr-2.5",
        // The active tab is the content colour and runs straight into the
        // pane beneath with no edge between them — the strip is the frame
        // around the page, and this tab is the page. Inactive tabs sit on
        // the frame and only pick up a tint on hover.
        active
          ? "bg-background text-text-primary"
          : "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary",
        className,
      )}
    >
      {active && <TabFlare side="left" />}
      {active && <TabFlare side="right" />}
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
        className="flex min-w-0 items-center gap-1.5 outline-none"
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

  return (
    // The frame: a step darker than the page, with the tabs standing on its
    // bottom edge so the active one reads as part of the pane below — the way
    // a browser draws its tab strip. Nothing separates the two; the active
    // tab's colour is the pane's colour.
    <div
      role="tablist"
      className={cx(
        "titlebar-drag flex h-10 shrink-0 items-end bg-black pr-2",
        isMac ? "pl-[78px]" : "pl-2",
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
      <div className="flex min-w-0 flex-1 items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              // Room on both sides for the active tab's flares, which hang
              // outside its box; the same room is the spacing between tabs.
              className="flex shrink-0 items-end overflow-hidden px-1.5"
            >
              {/* A short rule before every tab — between Home and the first,
                  and between neighbours — the way a browser separates its
                  tabs. Inside the wrapper so it collapses with the tab. */}
              <div className="mb-2.5 mr-3 h-4 w-px shrink-0 bg-border" />
              <TabButton
                active={activeId === tab.dir}
                onSelect={() => onActivate(tab.dir)}
                onClose={() => onClose(tab.dir)}
                label={tab.name}
              >
                <Activity tab={tab} />
                <span className={cx("truncate", tab.project === null && "italic text-text-tertiary")}>
                  {tab.name}
                </span>
              </TabButton>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mb-1 self-end">
        <ExportsButton onOpenProject={onOpenProject} onShowAll={onShowAllExports} />
      </div>
    </div>
  );
}
