import { cx } from "@/components/ui";

/**
 * One plugin, as a row: its mark, its name, one line about it, one action.
 *
 * Both tabs draw this — a catalog entry waiting to be added and a server
 * already running are the same object at different moments, and a user who
 * adds one should find it in the same shape on the other tab rather than
 * having to re-find it in a different layout.
 *
 * The row carries no border of its own. A list of bordered rows is a stack of
 * boxes competing with the icons for the eye; the hover tint is enough to say
 * where one row ends, and the whole column then reads as a single list.
 *
 * Given `onClick` the whole row is the button — a catalog row opens its
 * plugin's sheet, and the `+` at the end is an affordance inside that target
 * rather than the target itself. An installed row has no `onClick`: its
 * controls (the toggle, the menu, the tool list) are real buttons that a
 * wrapping one would swallow.
 */

/** Two columns on a wide panel, one when it narrows. Shared, so they line up. */
export const ROWS = "grid grid-cols-1 gap-x-6 lg:grid-cols-2";

export function PluginRow({
  id,
  icon,
  name,
  badge,
  detail,
  action,
  highlighted,
  onClick,
  label,
  children,
}: {
  id?: string;
  icon: React.ReactNode;
  name: string;
  /** A pill beside the name — what kind of plugin this is. */
  badge?: React.ReactNode;
  /** The second line: a description, or what the server is doing. */
  detail: React.ReactNode;
  action: React.ReactNode;
  highlighted?: boolean;
  /** Makes the whole row one button. Omit for a row with its own controls. */
  onClick?: () => void;
  /** What pressing the row does, for a screen reader. */
  label?: string;
  /** Anything that opens under the row, like a server's tool list. */
  children?: React.ReactNode;
}) {
  const inner = (
    <>
      {icon}
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="truncate text-[0.95rem] text-text-primary">{name}</span>
          {badge}
        </div>
        <div className="truncate text-[0.857rem] text-text-tertiary">{detail}</div>
      </div>
      {action}
    </>
  );
  const shell =
    "group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-surface-raised";

  return (
    <div id={id} className={cx("rounded-lg transition-colors duration-700", highlighted && "bg-accent/10")}>
      {onClick ? (
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cx(shell, "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent/40")}
        >
          {inner}
        </button>
      ) : (
        <div className={shell}>{inner}</div>
      )}
      {children}
    </div>
  );
}
