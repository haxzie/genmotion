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
 * The whole row opens the plugin's sheet — a 28px `+` was the only target on
 * a row 500px wide, and the description it sat beside was truncated, so the
 * one thing you could press was the one thing you had the least to go on. The
 * `+` stays as the affordance that says the row does something; it opens the
 * same sheet.
 *
 * A row knows whether its server is already configured — matched by
 * `catalogId` — and says so instead of offering Connect twice.
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
  onOpen,
}: {
  entry: McpCatalogEntry;
  installed: McpServerView | null;
  busy: boolean;
  onOpen: (entry: McpCatalogEntry) => void;
}) {
  return (
    <PluginRow
      onClick={() => onOpen(entry)}
      label={installed ? `About ${entry.name}` : `Connect ${entry.name}`}
      icon={<ServerIcon name={entry.name} iconUrl={entry.iconUrl} />}
      name={entry.name}
      detail={entry.description}
      action={
        busy ? (
          <Spinner className="size-4 text-text-tertiary" />
        ) : installed?.status === "needs-auth" ? (
          <span className="shrink-0 text-[0.857rem] text-warning">Sign in</span>
        ) : installed ? (
          // Added already: a tick, not a second Connect. It stays legible
          // without a hover, because "is this one on?" is the question the
          // whole list is answering.
          <span className="flex size-7 shrink-0 items-center justify-center text-success" title="Added">
            <CheckIcon className="size-4" />
          </span>
        ) : (
          // Not a button: the row is the button, and a target inside a target
          // is two tab stops and two hover states for one action.
          <span
            aria-hidden
            className={cx(
              "flex size-7 shrink-0 items-center justify-center rounded-md text-text-tertiary",
              "transition-colors duration-150 group-hover:bg-surface-hover group-hover:text-text-primary",
            )}
          >
            <PlusIcon className="size-4" />
          </span>
        )
      }
    />
  );
}

export function CatalogList({
  entries,
  servers,
  busyIds,
  onOpen,
}: {
  entries: McpCatalogEntry[];
  servers: McpServerView[];
  /** Catalog ids with a connect in flight. */
  busyIds: Set<string>;
  onOpen: (entry: McpCatalogEntry) => void;
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
                  onOpen={onOpen}
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
