import type { McpCatalogEntry, McpServerView } from "@genmotion/shared";
import { Button, Spinner, cx } from "@/components/ui";
import { ServerIcon, statusLine } from "./server-icon";

/**
 * The catalog, as cards.
 *
 * A card knows whether its server is already configured — matched by
 * `catalogId` — and says so instead of offering Connect twice. Management
 * stays in the list above: the card only ever adds, or nudges toward the
 * one action a broken row needs.
 */

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4";

function CatalogCard({
  entry,
  installed,
  busy,
  onConnect,
  onAuthenticate,
}: {
  entry: McpCatalogEntry;
  installed: McpServerView | null;
  busy: boolean;
  onConnect: (entry: McpCatalogEntry) => void;
  onAuthenticate: (server: McpServerView) => void;
}) {
  const line = installed ? statusLine(installed) : null;
  return (
    <article className="flex flex-col rounded-md border border-border bg-surface-raised p-4">
      <div className="flex items-start gap-3">
        <ServerIcon name={entry.name} iconUrl={entry.iconUrl} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[0.95rem] text-text-primary">{entry.name}</h3>
          <p className="text-[0.786rem] text-text-tertiary">{entry.category}</p>
        </div>
      </div>
      {/* Exactly two lines, ellipsised — `-webkit-box` clamping wants its own
          block, not a stretching flex item, or the box grows past the clamp
          in a row of taller cards. The full text is a hover away. */}
      <div className="mt-3 flex-1">
        <p
          title={entry.description}
          className="line-clamp-2 min-h-[2.5em] overflow-hidden break-words text-[0.857rem] leading-snug text-text-secondary"
        >
          {entry.description}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        {installed && line ? (
          <span
            className={cx(
              "flex min-w-0 items-center gap-1.5 text-[0.857rem]",
              line.tone === "danger"
                ? "text-danger"
                : line.tone === "warning"
                  ? "text-warning"
                  : "text-text-tertiary",
            )}
            title={installed.status === "error" ? installed.error : undefined}
          >
            {installed.status === "connecting" ? (
              <Spinner className="size-3 text-text-tertiary" />
            ) : (
              <span
                className={cx(
                  "size-1.5 shrink-0 rounded-full",
                  installed.status === "connected"
                    ? "bg-success"
                    : installed.status === "needs-auth"
                      ? "bg-warning"
                      : installed.status === "error"
                        ? "bg-danger"
                        : "bg-text-tertiary",
                )}
              />
            )}
            <span className="truncate">{installed.status === "connected" ? `Connected · ${line.text}` : line.text}</span>
          </span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {entry.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border px-2 py-0.5 text-[0.714rem] text-text-tertiary"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
        {installed?.status === "needs-auth" ? (
          <Button size="sm" disabled={busy} onClick={() => onAuthenticate(installed)}>
            Authenticate
          </Button>
        ) : installed ? null : (
          <Button size="sm" variant="primary" disabled={busy} onClick={() => onConnect(entry)}>
            {busy && <Spinner className="size-3 text-background" />}
            Connect
          </Button>
        )}
      </div>
    </article>
  );
}

export function CatalogGrid({
  entries,
  servers,
  busyIds,
  onConnect,
  onAuthenticate,
}: {
  entries: McpCatalogEntry[];
  servers: McpServerView[];
  /** Catalog ids with a connect in flight. */
  busyIds: Set<string>;
  onConnect: (entry: McpCatalogEntry) => void;
  onAuthenticate: (server: McpServerView) => void;
}) {
  const byCatalogId = new Map(servers.filter((s) => s.catalogId).map((s) => [s.catalogId!, s]));
  return (
    <div className={GRID}>
      {entries.map((entry) => (
        <CatalogCard
          key={entry.id}
          entry={entry}
          installed={byCatalogId.get(entry.id) ?? null}
          busy={busyIds.has(entry.id)}
          onConnect={onConnect}
          onAuthenticate={onAuthenticate}
        />
      ))}
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-md border border-border bg-surface-raised p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 animate-pulse rounded-lg bg-surface-hover" />
            <div className="flex-1">
              <div className="h-3.5 w-1/2 animate-pulse rounded bg-surface-hover" />
              <div className="mt-1.5 h-3 w-1/3 animate-pulse rounded bg-surface-hover" />
            </div>
          </div>
          <div className="mt-4 h-3 w-full animate-pulse rounded bg-surface-hover" />
          <div className="mt-1.5 h-3 w-4/5 animate-pulse rounded bg-surface-hover" />
        </div>
      ))}
    </div>
  );
}
