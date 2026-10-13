import { useEffect, useMemo, useState } from "react";
import type { McpServerView } from "@genmotion/shared";
import { Button, cx } from "@/components/ui";
import { useMcpCatalog } from "../../lib/use-mcp-catalog";
import { CatalogList, CatalogSkeleton } from "./catalog-list";
import { ServerList } from "./server-list";
import { McpServerModal } from "./server-modal";
import { useCatalogConnect } from "./use-catalog-connect";

/**
 * MCP servers, in one place: the ones this machine could have, and the ones
 * it has.
 *
 * Two tabs rather than two stacked sections. Stacked, the user's own servers
 * pushed the catalog below the fold on a short window, and the catalog pushed
 * them out of sight once it grew; neither list could be the whole screen. All
 * is where you go to add something, Installed is where you go to manage what
 * you added, and the tab says which question you are asking.
 *
 * Connecting from All lands a row on Installed and lights it up for a moment,
 * so the plugin is findable the first time it is looked for. The catalog comes
 * from the hosted API and may be unreachable; Installed is local and never is,
 * so it stays up while All apologises.
 */

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function matches(query: string, ...fields: (string | string[] | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) =>
    (Array.isArray(field) ? field : [field ?? ""]).some((f) => f.toLowerCase().includes(q)),
  );
}

type Tab = "all" | "installed";

/**
 * The tab pills.
 *
 * Filled when selected, bare when not — the fill is the whole signal, so
 * there is no underline or track to read as well. Installed carries its count
 * (and an amber dot when one of them wants attention), because the reason to
 * look at that tab is usually that something on it is asking for something.
 */
function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[0.929rem] transition-colors duration-150",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        active
          ? "bg-surface-hover text-text-primary"
          : "text-text-tertiary hover:bg-surface-raised hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function Plugins() {
  const {
    servers: { servers, isLoading: serversLoading, update, remove, refresh, authenticate },
    openEntry,
    connect: connectFromCatalog,
    busyIds: busyCatalog,
    connectedId: highlightId,
    setConnectedId: setHighlightId,
    modal,
    setModal,
    submitModal,
    error: modalError,
    pending: modalPending,
  } = useCatalogConnect();
  const catalog = useMcpCatalog();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [busyServers, setBusyServers] = useState<Set<string>>(new Set());

  // Flash the row a server just landed in. It is on the other tab, so go
  // there first — a highlight nobody is looking at is no confirmation at all.
  useEffect(() => {
    if (!highlightId) return;
    setTab("installed");
    const timer = setTimeout(() => setHighlightId(null), 2400);
    return () => clearTimeout(timer);
  }, [highlightId, setHighlightId]);

  useEffect(() => {
    if (tab !== "installed" || !highlightId) return;
    document.getElementById(`mcp-server-${highlightId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [tab, highlightId]);

  const mark = (set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, on: boolean) =>
    set((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  async function withServerBusy(id: string, task: Promise<unknown>) {
    mark(setBusyServers, id, true);
    try {
      await task;
    } catch {
      // The row shows the outcome; a toast would say the same thing twice.
    } finally {
      mark(setBusyServers, id, false);
    }
  }

  const list = servers ?? [];
  const visibleServers = useMemo(
    () => list.filter((s) => matches(query, s.name, s.url, s.command)),
    [list, query],
  );
  const needsAttention = list.some((s) => s.enabled && (s.status === "needs-auth" || s.status === "error"));

  const entries = catalog.data?.entries ?? [];
  const visibleEntries = useMemo(
    () => entries.filter((e) => matches(query, e.name, e.description, e.category, e.tags)),
    [entries, query],
  );

  const actions = {
    busyIds: busyServers,
    onAuthenticate: (server: McpServerView) => void withServerBusy(server.id, authenticate.mutateAsync(server.id)),
    onToggle: (server: McpServerView, enabled: boolean) =>
      void withServerBusy(server.id, update.mutateAsync({ id: server.id, enabled })),
    onRefresh: (server: McpServerView) => void withServerBusy(server.id, refresh.mutateAsync(server.id)),
    onEdit: (server: McpServerView) => {
      setModal({
        kind: "edit",
        server,
        entry: server.catalogId ? catalog.data?.entries.find((e) => e.id === server.catalogId) : undefined,
      });
    },
    onRemove: (server: McpServerView) => void withServerBusy(server.id, remove.mutateAsync(server.id)),
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[2rem] tracking-tight">Plugins</h1>
            <p className="mt-1 text-text-secondary">
              Connect the tools you already use. The agent can reach any plugin here from the chat.
            </p>
          </div>
          <Button
            variant="secondary"
            className="mt-1.5 shrink-0"
            onClick={() => {
              setModal({ kind: "add" });
            }}
          >
            New MCP Server
          </Button>
        </div>

        <div className="relative mt-6">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plugins…"
            className={cx(
              "h-12 w-full rounded-full border border-border bg-surface-raised pl-11 pr-4 text-text-primary",
              "placeholder:text-text-tertiary transition-colors duration-150 outline-none",
              "focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
            )}
          />
        </div>

        <div role="tablist" aria-label="Plugins" className="mt-5 flex items-center gap-1">
          <TabPill active={tab === "all"} onClick={() => setTab("all")}>
            All
            {catalog.data && <span className="text-text-tertiary">{entries.length}</span>}
          </TabPill>
          <TabPill active={tab === "installed"} onClick={() => setTab("installed")}>
            Installed
            <span className="text-text-tertiary">{list.length}</span>
            {needsAttention && <span className="size-1.5 rounded-full bg-warning" aria-label="needs attention" />}
          </TabPill>
        </div>

        <div className="mt-7">
          {tab === "all" ? (
            catalog.error ? (
              <p className="py-10 text-center text-text-tertiary">
                Couldn’t load the plugin catalog. Check your connection and try again.
              </p>
            ) : catalog.isLoading || !catalog.data ? (
              <CatalogSkeleton />
            ) : visibleEntries.length === 0 ? (
              <p className="py-10 text-center text-text-tertiary">
                No plugin matches “{query}”.
              </p>
            ) : (
              <CatalogList
                entries={visibleEntries}
                servers={list}
                busyIds={busyCatalog}
                onOpen={openEntry}
              />
            )
          ) : serversLoading && !servers ? (
            <CatalogSkeleton />
          ) : list.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface-raised px-4 py-10 text-center">
              <p className="text-[0.929rem] text-text-secondary">Nothing installed yet.</p>
              <p className="mt-1 text-[0.857rem] text-text-tertiary">
                Pick one from All, or add your own.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => {
                  setModal({ kind: "add" });
                }}
              >
                New MCP Server
              </Button>
            </div>
          ) : visibleServers.length === 0 ? (
            <p className="py-10 text-center text-text-tertiary">
              None of your plugins match “{query}”.
            </p>
          ) : (
            <ServerList
              servers={visibleServers}
              actions={actions}
              highlightId={highlightId}
              onNew={() => {
                setModal({ kind: "add" });
              }}
            />
          )}
        </div>
      </div>

      <McpServerModal
        mode={modal}
        onClose={() => setModal(null)}
        onSubmit={submitModal}
        onConnect={connectFromCatalog}
        onAuthenticate={actions.onAuthenticate}
        onManage={() => setTab("installed")}
        pending={modalPending}
        error={modalError}
      />
    </div>
  );
}
