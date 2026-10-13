import type { McpCatalogEntry, McpServerView } from "@genmotion/shared";
import { Spinner, cx } from "@/components/ui";
import { ServerIcon } from "./server-icon";
import { PluginRow, ROWS } from "./plugin-row";

/**
 * The catalog, as rows under their category.
 *
 * Cards were the wrong unit: twenty-two of them in a grid is a wall, and a
 * card spends most of its area on the border around two lines of text. A row
 * is the name, what it does, and the one button that matters — so a column of
 * them reads as a list you scan rather than a shelf you browse, and two
 * columns fit a category on a screen.
 *
 * A row knows whether its server is already configured — matched by
 * `catalogId` — and says so instead of offering Connect twice. Management
 * stays on the Installed tab; from here a plugin is only ever added, or
 * nudged through the one action a broken one needs.
 */

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function CatalogRow({
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
  return (
    <PluginRow
      icon={<ServerIcon name={entry.name} iconUrl={entry.iconUrl} />}
      name={entry.name}
      detail={entry.description}
      action={
        busy ? (
          <Spinner className="size-4 text-text-tertiary" />
        ) : installed?.status === "needs-auth" ? (
          <button
            type="button"
            onClick={() => onAuthenticate(installed)}
            className="shrink-0 text-[0.857rem] text-warning hover:underline"
          >
            Authenticate
          </button>
        ) : installed ? (
          // Added already: a tick, not a second Connect. It stays legible
          // without a hover, because "is this one on?" is the question the
          // whole list is answering.
          <span className="flex size-7 shrink-0 items-center justify-center text-success" title="Added">
            <CheckIcon className="size-4" />
          </span>
        ) : (
          <button
            type="button"
            aria-label={`Add ${entry.name}`}
            onClick={() => onConnect(entry)}
            className={cx(
              "flex size-7 shrink-0 items-center justify-center rounded-md text-text-tertiary",
              "transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary",
              "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
            )}
          >
            <PlusIcon className="size-4" />
          </button>
        )
      }
    />
  );
}

export function CatalogList({
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
  // Categories in catalog order — the API arranges the list by what a video
  // needs first, and that order is the only curation this screen has.
  const categories = [...new Set(entries.map((e) => e.category))];

  return (
    <div className="flex flex-col gap-8">
      {categories.map((category) => (
        <section key={category}>
          <h3 className="mb-1 text-[0.95rem] font-medium text-text-primary">{category}</h3>
          <div className={ROWS}>
            {entries
              .filter((e) => e.category === category)
              .map((entry) => (
                <CatalogRow
                  key={entry.id}
                  entry={entry}
                  installed={byCatalogId.get(entry.id) ?? null}
                  busy={busyIds.has(entry.id)}
                  onConnect={onConnect}
                  onAuthenticate={onAuthenticate}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className={ROWS}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2.5">
          <div className="size-10 shrink-0 animate-pulse rounded-lg bg-surface-hover" />
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-hover" />
            <div className="mt-1.5 h-3 w-3/4 animate-pulse rounded bg-surface-hover" />
          </div>
        </div>
      ))}
    </div>
  );
}
