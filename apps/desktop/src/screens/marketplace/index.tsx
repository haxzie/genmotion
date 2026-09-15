import { useEffect, useMemo, useState } from "react";
import { catalogEntryToInput, type McpCatalogEntry, type McpServerView } from "@genmotion/shared";
import { Button, Input, cx } from "@/components/ui";
import { useMcpCatalog } from "../../lib/use-mcp-catalog";
import { useMcpServers } from "../../lib/use-mcp-servers";
import { CatalogGrid, CatalogSkeleton } from "./catalog-grid";
import { ServerList } from "./server-list";
import { McpServerModal, type ServerModalMode, type ServerModalSubmit } from "./server-modal";

/**
 * MCP servers, in one place: the ones this machine has, then the ones it
 * could have.
 *
 * Connecting from a card lands a row in the list above and lights it up for
 * a moment, so the eye follows the server from "available" to "yours". The
 * catalog comes from the hosted API and may be unreachable; the list is
 * local and never is, so it stays up while the grid apologises.
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

export function Marketplace() {
  const { servers, isLoading: serversLoading, add, update, remove, refresh, authenticate } = useMcpServers();
  const catalog = useMcpCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [modal, setModal] = useState<ServerModalMode | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [busyCatalog, setBusyCatalog] = useState<Set<string>>(new Set());
  const [busyServers, setBusyServers] = useState<Set<string>>(new Set());

  // Flash the row a server just landed in, and bring it into view.
  useEffect(() => {
    if (!highlightId) return;
    document.getElementById(`mcp-server-${highlightId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const timer = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(timer);
  }, [highlightId]);

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

  async function connectFromCatalog(entry: McpCatalogEntry) {
    if (entry.auth.kind === "header") {
      setModalError(null);
      setModal({ kind: "token", entry });
      return;
    }
    mark(setBusyCatalog, entry.id, true);
    try {
      const created = await add.mutateAsync(catalogEntryToInput(entry));
      setHighlightId(created.id);
      if (entry.auth.kind === "oauth") await authenticate.mutateAsync(created.id);
    } catch {
      /* the row carries the error */
    } finally {
      mark(setBusyCatalog, entry.id, false);
    }
  }

  async function submitModal(input: ServerModalSubmit) {
    setModalError(null);
    try {
      if ("id" in input) {
        const { id, ...patch } = input;
        await update.mutateAsync({ id, ...patch });
        setHighlightId(id);
      } else {
        const created = await add.mutateAsync(input);
        setHighlightId(created.id);
      }
      setModal(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const list = servers ?? [];
  const visibleServers = useMemo(
    () => list.filter((s) => matches(query, s.name, s.url, s.command)),
    [list, query],
  );

  const entries = catalog.data?.entries ?? [];
  const categories = useMemo(() => [...new Set(entries.map((e) => e.category))], [entries]);
  const visibleEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          (!category || e.category === category) &&
          matches(query, e.name, e.description, e.category, e.tags),
      ),
    [entries, category, query],
  );

  const actions = {
    busyIds: busyServers,
    onAuthenticate: (server: McpServerView) => void withServerBusy(server.id, authenticate.mutateAsync(server.id)),
    onToggle: (server: McpServerView, enabled: boolean) =>
      void withServerBusy(server.id, update.mutateAsync({ id: server.id, enabled })),
    onRefresh: (server: McpServerView) => void withServerBusy(server.id, refresh.mutateAsync(server.id)),
    onEdit: (server: McpServerView) => {
      setModalError(null);
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
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="mb-1 flex items-center justify-between gap-4">
          <h1 className="font-display text-2xl tracking-tight">Marketplace</h1>
          <Button
            variant="primary"
            onClick={() => {
              setModalError(null);
              setModal({ kind: "add" });
            }}
          >
            New MCP Server
          </Button>
        </div>
        <p className="mb-6 text-text-secondary">
          Connect the tools you already use. The agent can reach any server here from the chat.
        </p>

        <div className="relative mb-8">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search MCP servers…"
            className="h-10 pl-9"
          />
        </div>

        <section className="mb-10">
          <h2 className="mb-3 text-[1.1rem] font-medium text-text-primary">Your servers</h2>
          {serversLoading && !servers ? (
            <div className="h-16 animate-pulse rounded-md border border-border bg-surface-raised" />
          ) : list.length === 0 ? (
            <div className="rounded-md border border-border bg-surface-raised px-4 py-6 text-center">
              <p className="text-[0.929rem] text-text-secondary">No servers connected yet.</p>
              <p className="mt-1 text-[0.857rem] text-text-tertiary">
                Pick one below, or add your own.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => {
                  setModalError(null);
                  setModal({ kind: "add" });
                }}
              >
                New MCP Server
              </Button>
            </div>
          ) : visibleServers.length === 0 ? (
            <p className="py-4 text-center text-[0.857rem] text-text-tertiary">
              None of your servers match “{query}”.
            </p>
          ) : (
            <ServerList
              servers={visibleServers}
              actions={actions}
              highlightId={highlightId}
              onNew={() => {
                setModalError(null);
                setModal({ kind: "add" });
              }}
            />
          )}
        </section>

        <section>
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-[1.1rem] font-medium text-text-primary">Available</h2>
            {catalog.data && (
              <span className="text-[0.857rem] text-text-tertiary">{entries.length}</span>
            )}
          </div>

          {categories.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory((current) => (current === c ? null : c))}
                  className={cx(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.786rem] transition-colors duration-150",
                    "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                    category === c
                      ? "border-accent/40 bg-accent-muted text-accent"
                      : "border-border bg-surface-raised text-text-tertiary hover:border-border-strong hover:text-text-primary",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {catalog.error ? (
            <p className="py-8 text-center text-text-tertiary">
              Couldn’t load the marketplace. Check your connection and try again.
            </p>
          ) : catalog.isLoading || !catalog.data ? (
            <CatalogSkeleton />
          ) : visibleEntries.length === 0 ? (
            <p className="py-8 text-center text-text-tertiary">
              Nothing matches{query ? ` “${query}”` : ""}{category ? ` in ${category}` : ""}.
            </p>
          ) : (
            <CatalogGrid
              entries={visibleEntries}
              servers={list}
              busyIds={busyCatalog}
              onConnect={connectFromCatalog}
              onAuthenticate={actions.onAuthenticate}
            />
          )}
        </section>
      </div>

      <McpServerModal
        mode={modal}
        onClose={() => setModal(null)}
        onSubmit={submitModal}
        pending={add.isPending || update.isPending}
        error={modalError}
      />
    </div>
  );
}
