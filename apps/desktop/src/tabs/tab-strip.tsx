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
        "group relative flex h-7 max-w-52 shrink-0 items-center gap-1.5 rounded-md pl-2.5 text-[0.857rem]",
        "transition-colors duration-150",
        onClose ? "pr-1" : "pr-2.5",
        // The strip is the darkest surface in the app, so the active tab takes
        // the hover tone — two steps up — to read as the one in front.
        active
          ? "bg-surface-hover text-text-primary"
          : "text-text-secondary hover:bg-surface hover:text-text-primary",
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

  return (
    <div
      role="tablist"
      className={cx(
        "titlebar-drag flex h-10 shrink-0 items-center gap-1 bg-background pr-2",
        isMac ? "pl-[78px]" : "pl-2",
      )}
    >
      <TabButton
        active={activeId === HOME_TAB}
        onSelect={() => onActivate(HOME_TAB)}
        label="Home"
      >
        <HomeIcon className="size-4" />
      </TabButton>

      <div className="mx-1 h-4 w-px shrink-0 bg-border" />

      {/* Scrolls sideways when the row overflows; the export button stays put. */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <TabButton
            key={tab.dir}
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
        ))}
      </div>

      <ExportsButton onOpenProject={onOpenProject} onShowAll={onShowAllExports} />
    </div>
  );
}
