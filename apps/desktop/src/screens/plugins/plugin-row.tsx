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
  /** Anything that opens under the row, like a server's tool list. */
  children?: React.ReactNode;
}) {
  return (
    <div id={id} className={cx("rounded-lg transition-colors duration-700", highlighted && "bg-accent/10")}>
      <div className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-surface-raised">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[0.95rem] text-text-primary">{name}</span>
            {badge}
          </div>
          <div className="truncate text-[0.857rem] text-text-tertiary">{detail}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
