import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";

/**
 * The three dots on a project: Rename, Duplicate, Delete.
 *
 * One component for both places a project is named — the cards and rows on the
 * Projects screen, and the title over the editor's chat — because they are the
 * same three actions and a menu that differs between them is a menu the user
 * has to read twice.
 *
 * It owns the menu and nothing else. Rename is handed back as a callback
 * rather than performed here: on the Projects screen it turns the card's title
 * into an input, and in the editor it starts the title's own inline edit,
 * which is already there. Delete raises its confirmation in the main process
 * (see `deleteProject`), so there is none here.
 */

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16z" />
      <path d="M14.5 5.5 18.5 9.5" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5A1.5 1.5 0 0 0 5.5 15" />
    </svg>
  );
}

export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h16M10 4h4M9.5 7l.6 12M14.5 7l-.6 12M6.5 7l.8 13.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L17.5 7" />
    </svg>
  );
}

function Item({
  icon,
  label,
  onClick,
  tone = "default",
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[0.857rem]",
        "transition-colors duration-150",
        disabled
          ? "cursor-default text-text-tertiary"
          : tone === "danger"
            ? "text-danger hover:bg-danger/10"
            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
      )}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      {label}
    </button>
  );
}

export function ProjectActions({
  name,
  onRename,
  onDuplicate,
  onDelete,
  duplicating = false,
  className,
  placement = "down",
}: {
  /** Only for the labels a screen reader reads out — several of these can be on screen. */
  name: string;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** The copy is being written; the row says so rather than running twice. */
  duplicating?: boolean;
  className?: string;
  /** "up" where the trigger sits at the foot of a card and there is no room below. */
  placement?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Click-away and Escape, bound only while open — the Projects screen can
  // have a dozen of these mounted at once.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /** Every row closes the menu first, then acts. */
  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    // Every click here is stopped: on the Projects screen the whole card is a
    // click target that opens the project, so without this the menu would
    // open it on the way past.
    <div
      ref={root}
      className={cx("relative", className)}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${name}`}
        title="More"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "flex size-7 items-center justify-center rounded text-text-tertiary",
          "transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          open && "bg-surface-hover text-text-primary",
        )}
      >
        <DotsIcon className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          className={cx(
            "absolute right-0 z-50 w-44 rounded-lg border border-border bg-surface-raised p-1.5",
            "shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
            placement === "up" ? "bottom-9" : "top-9",
          )}
        >
          <Item icon={<PencilIcon className="size-4" />} label="Rename" onClick={() => run(onRename)} />
          <Item
            icon={<CopyIcon className="size-4" />}
            label={duplicating ? "Duplicating…" : "Duplicate"}
            disabled={duplicating}
            onClick={() => run(onDuplicate)}
          />
          <div className="my-1.5 border-t border-border" />
          <Item
            icon={<TrashIcon className="size-4" />}
            label="Delete"
            tone="danger"
            onClick={() => run(onDelete)}
          />
        </div>
      )}
    </div>
  );
}
