import { useEffect, useRef, useState } from "react";
import type { McpServerView } from "@genmotion/shared";
import { Spinner, cx } from "@/components/ui";
import { ServerIcon, statusLine } from "./server-icon";

/**
 * The user's servers, grouped by what they need from them.
 *
 * "Needs attention" comes first because it is the only group with something
 * to do; "Connected" is the reassurance; "Disabled" is the drawer. A group
 * with nothing in it is not drawn — an empty heading is a question.
 */

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function SourcePill({ source }: { source: McpServerView["source"] }) {
  return (
    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[0.714rem] text-text-tertiary">
      {source === "marketplace" ? "Marketplace" : "Custom"}
    </span>
  );
}

function Toggle({
  on,
  onChange,
  label,
  disabled,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cx(
        "relative h-5 w-9 shrink-0 rounded-full p-0 transition-colors duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50",
        on ? "bg-success" : "bg-surface-hover",
      )}
    >
      {/* Anchored at the track's left edge and slid along it — without
          `left-0` a button's absolutely positioned child starts from its
          centred static position, and the knob ends up off the track. */}
      <span
        className={cx(
          "absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform duration-150",
          on ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

export interface ServerActions {
  onAuthenticate: (server: McpServerView) => void;
  onToggle: (server: McpServerView, enabled: boolean) => void;
  onRefresh: (server: McpServerView) => void;
  onEdit: (server: McpServerView) => void;
  onRemove: (server: McpServerView) => void;
  /** Ids with a request in flight, so a row can say so. */
  busyIds: Set<string>;
}

function RowMenu({ server, actions }: { server: McpServerView; actions: ServerActions }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[0.857rem] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary";
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`More for ${server.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "flex size-7 items-center justify-center rounded-md text-text-tertiary transition-colors",
          "hover:bg-surface-hover hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          open && "bg-surface-hover text-text-primary",
        )}
      >
        <DotsIcon className="size-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-30 w-40 rounded-lg border border-border bg-surface-raised p-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          <button type="button" role="menuitem" className={item} onClick={pick(() => actions.onRefresh(server))}>
            Refresh
          </button>
          <button type="button" role="menuitem" className={item} onClick={pick(() => actions.onEdit(server))}>
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className={cx(item, "text-danger hover:text-danger")}
            onClick={pick(() => actions.onRemove(server))}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function ServerRow({
  server,
  actions,
  highlighted,
}: {
  server: McpServerView;
  actions: ServerActions;
  highlighted: boolean;
}) {
  const [showTools, setShowTools] = useState(false);
  const line = statusLine(server);
  const busy = actions.busyIds.has(server.id);
  const canExpand = server.status === "connected" && server.tools.length > 0;

  return (
    <li
      id={`mcp-server-${server.id}`}
      className={cx("transition-colors duration-700", highlighted && "bg-accent/10")}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <ServerIcon name={server.name} iconUrl={server.iconUrl} status={server.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[0.95rem] text-text-primary">{server.name}</span>
            <SourcePill source={server.source} />
          </div>
          <button
            type="button"
            disabled={!canExpand}
            onClick={() => setShowTools((v) => !v)}
            className={cx(
              "mt-0.5 flex items-center gap-1 text-left text-[0.857rem] outline-none",
              line.tone === "danger"
                ? "text-danger"
                : line.tone === "warning"
                  ? "text-warning"
                  : "text-text-tertiary",
              canExpand && "hover:text-text-secondary",
            )}
            title={server.status === "error" ? server.error : undefined}
          >
            <span className="truncate">{line.text}</span>
            {canExpand && (
              <ChevronIcon className={cx("size-3 shrink-0 transition-transform", showTools && "rotate-90")} />
            )}
          </button>
        </div>

        {busy && <Spinner className="size-3.5 text-text-tertiary" />}
        {server.status === "needs-auth" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => actions.onAuthenticate(server)}
            className="text-[0.929rem] text-accent hover:underline disabled:opacity-50"
          >
            Authenticate
          </button>
        )}
        <Toggle
          on={server.enabled}
          disabled={busy}
          label={server.enabled ? `Disable ${server.name}` : `Enable ${server.name}`}
          onChange={(next) => actions.onToggle(server, next)}
        />
        <RowMenu server={server} actions={actions} />
      </div>

      {showTools && canExpand && (
        <ul className="mx-4 mb-3 rounded-md border border-border bg-background">
          {server.tools.map((tool) => (
            <li key={tool.name} className="flex items-baseline gap-3 border-b border-border px-3 py-1.5 last:border-b-0">
              <code className="shrink-0 font-mono text-[0.786rem] text-text-secondary">{tool.name}</code>
              <span className="min-w-0 truncate text-[0.786rem] text-text-tertiary">{tool.description}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Group({
  title,
  servers,
  actions,
  highlightId,
}: {
  title: string;
  servers: McpServerView[];
  actions: ServerActions;
  highlightId: string | null;
}) {
  if (servers.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 flex items-baseline gap-1.5 text-[0.95rem] text-text-primary">
        {title}
        <span className="text-text-tertiary">{servers.length}</span>
      </h3>
      <ul className="divide-y divide-border rounded-md border border-border bg-surface-raised">
        {servers.map((server) => (
          <ServerRow key={server.id} server={server} actions={actions} highlighted={server.id === highlightId} />
        ))}
      </ul>
    </section>
  );
}

export function NewServerRow({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 rounded-md border border-border bg-surface-raised px-4 py-3 text-left",
        "transition-colors duration-150 hover:border-border-strong outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong text-text-tertiary">
        <PlusIcon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.95rem] text-text-primary">New MCP Server</span>
        <span className="block text-[0.857rem] text-text-tertiary">Add a custom MCP server</span>
      </span>
    </button>
  );
}

export function ServerList({
  servers,
  actions,
  onNew,
  highlightId,
}: {
  servers: McpServerView[];
  actions: ServerActions;
  onNew: () => void;
  highlightId: string | null;
}) {
  const attention = servers.filter((s) => s.enabled && (s.status === "needs-auth" || s.status === "error"));
  const connected = servers.filter((s) => s.enabled && (s.status === "connected" || s.status === "connecting"));
  const disabled = servers.filter((s) => !s.enabled);

  return (
    <div className="flex flex-col gap-6">
      <Group title="Needs attention" servers={attention} actions={actions} highlightId={highlightId} />
      <Group title="Connected" servers={connected} actions={actions} highlightId={highlightId} />
      <Group title="Disabled" servers={disabled} actions={actions} highlightId={highlightId} />
      <NewServerRow onClick={onNew} />
    </div>
  );
}
